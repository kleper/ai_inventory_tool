from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlmodel import Session, select, func, or_
from app.database import get_session
from app.models import User, InventoryGroup, Item, SharedAccess, ApiKey
from app.services.security import decode_access_token
from passlib.context import CryptContext
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import asyncio
import json
import uuid
import logging
from sqlalchemy.orm.attributes import flag_modified

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/mcp", tags=["mcp"])

# In-memory store for active SSE client queues: {session_id: asyncio.Queue}
_sse_sessions: Dict[str, asyncio.Queue] = {}


# --- Authentication Dependency for MCP ---

async def get_mcp_user(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-KEY"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    api_key_query: Optional[str] = Query(None, alias="api_key"),
    session: Session = Depends(get_session)
) -> User:
    """
    Authenticates requests to the MCP server.
    Accepts:
    1. Header: X-API-KEY: sk_live_...
    2. Header: Authorization: Bearer <jwt_or_api_key>
    3. Query param: ?api_key=sk_live_... (supported for SSE streams)
    """
    token_candidate = x_api_key or api_key_query

    if not token_candidate and authorization:
        parts = authorization.strip().split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token_candidate = parts[1]

    if not token_candidate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing X-API-KEY or Bearer token for MCP access"
        )

    # If it is an API Key (starts with sk_live_)
    if token_candidate.startswith("sk_live_"):
        if len(token_candidate) < 16:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key format")
        prefix = token_candidate[:16]
        candidates = session.exec(select(ApiKey).where(ApiKey.prefix == prefix)).all()
        for candidate in candidates:
            if pwd_context.verify(token_candidate, candidate.key_hash):
                candidate.last_used_at = datetime.now(timezone.utc)
                session.add(candidate)
                session.commit()
                if candidate.user:
                    return candidate.user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")

    # Otherwise, try JWT token
    payload = decode_access_token(token_candidate)
    if payload and "sub" in payload:
        try:
            user_id = int(payload["sub"])
            user = session.get(User, user_id)
            if user:
                return user
        except (ValueError, TypeError):
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Invalid API Key or expired Bearer token"
    )


# --- MCP Tool Registry & Metadata ---

MCP_TOOLS_METADATA = [
    {
        "name": "list_inventories",
        "description": "List all inventory folders/groups owned by or shared with the user, including item counts and role.",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "additionalProperties": False
        }
    },
    {
        "name": "get_inventory",
        "description": "Get detailed information about a specific inventory folder by its ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "group_id": {"type": "integer", "description": "The unique ID of the inventory folder"}
            },
            "required": ["group_id"],
            "additionalProperties": False
        }
    },
    {
        "name": "create_inventory",
        "description": "Create a new inventory folder. Supports specialized modes (GENERAL, NATURE, PLACES).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name of the inventory folder"},
                "description": {"type": "string", "description": "Description of the inventory folder"},
                "currency": {"type": "string", "description": "Currency code (USD, COP, EUR)", "default": "USD"},
                "language": {"type": "string", "description": "Language code (ES, EN)", "default": "EN"},
                "mode": {"type": "string", "enum": ["GENERAL", "NATURE", "PLACES"], "description": "Specialized inventory mode", "default": "GENERAL"}
            },
            "required": ["name"],
            "additionalProperties": False
        }
    },
    {
        "name": "update_inventory",
        "description": "Update an existing inventory folder (name, description, currency, mode). Requires Owner or Editor access.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "group_id": {"type": "integer", "description": "The ID of the inventory folder to update"},
                "name": {"type": "string", "description": "Updated name"},
                "description": {"type": "string", "description": "Updated description"},
                "currency": {"type": "string", "description": "Updated currency (USD, COP, EUR)"},
                "mode": {"type": "string", "enum": ["GENERAL", "NATURE", "PLACES"], "description": "Specialized mode"}
            },
            "required": ["group_id"],
            "additionalProperties": False
        }
    },
    {
        "name": "delete_inventory",
        "description": "Permanently delete an inventory folder and all items inside it. Only the folder owner can perform this action.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "group_id": {"type": "integer", "description": "The ID of the inventory folder to delete"}
            },
            "required": ["group_id"],
            "additionalProperties": False
        }
    },
    {
        "name": "list_items",
        "description": "List items in an inventory folder with pagination and optional category filtering.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "group_id": {"type": "integer", "description": "The ID of the inventory folder"},
                "page": {"type": "integer", "description": "Page number (default 1)", "default": 1},
                "limit": {"type": "integer", "description": "Items per page (default 50)", "default": 50},
                "category": {"type": "string", "description": "Optional category filter"}
            },
            "required": ["group_id"],
            "additionalProperties": False
        }
    },
    {
        "name": "get_item",
        "description": "Retrieve full details, pricing, status, coordinates, and custom metadata for an item.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "integer", "description": "The unique ID of the item"}
            },
            "required": ["item_id"],
            "additionalProperties": False
        }
    },
    {
        "name": "create_item",
        "description": "Create a new item in an inventory folder. Requires Owner or Editor access to the folder.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "group_id": {"type": "integer", "description": "The target inventory folder ID"},
                "name": {"type": "string", "description": "Name of the item"},
                "description": {"type": "string", "description": "Detailed description of the item"},
                "category": {"type": "string", "description": "Item category"},
                "price": {"type": "number", "description": "Unit price"},
                "quantity": {"type": "integer", "description": "Stock quantity", "default": 1},
                "status": {"type": "string", "description": "Item status (completed, pending_price)", "default": "completed"},
                "meta_data": {"type": "object", "description": "Custom metadata object (e.g. coordinates, technical specs, botanical notes)"}
            },
            "required": ["group_id", "name"],
            "additionalProperties": False
        }
    },
    {
        "name": "bulk_create_items",
        "description": "Create multiple items in an inventory folder in a single batch operation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "group_id": {"type": "integer", "description": "The target inventory folder ID"},
                "items": {
                    "type": "array",
                    "description": "Array of items to create",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "category": {"type": "string"},
                            "price": {"type": "number"},
                            "quantity": {"type": "integer", "default": 1},
                            "status": {"type": "string", "default": "completed"},
                            "meta_data": {"type": "object"}
                        },
                        "required": ["name"]
                    }
                }
            },
            "required": ["group_id", "items"],
            "additionalProperties": False
        }
    },
    {
        "name": "update_item",
        "description": "Update an existing item's fields and merge metadata without losing existing keys.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "integer", "description": "The ID of the item to update"},
                "name": {"type": "string", "description": "Updated name"},
                "description": {"type": "string", "description": "Updated description"},
                "category": {"type": "string", "description": "Updated category"},
                "price": {"type": "number", "description": "Updated price"},
                "quantity": {"type": "integer", "description": "Updated quantity"},
                "status": {"type": "string", "description": "Updated status"},
                "meta_data": {"type": "object", "description": "Metadata updates to merge into existing metadata"}
            },
            "required": ["item_id"],
            "additionalProperties": False
        }
    },
    {
        "name": "delete_item",
        "description": "Delete an item from inventory. Requires item ownership or Editor access to its folder.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "integer", "description": "The ID of the item to delete"}
            },
            "required": ["item_id"],
            "additionalProperties": False
        }
    },
    {
        "name": "search_items",
        "description": "Search for items across all inventories accessible to the user by text query, category, or price range.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search text matching item name or description"},
                "category": {"type": "string", "description": "Filter by category"},
                "min_price": {"type": "number", "description": "Minimum price filter"},
                "max_price": {"type": "number", "description": "Maximum price filter"}
            },
            "additionalProperties": False
        }
    }
]


# --- Helper: Scoped Tool Execution ---

def _execute_mcp_tool(tool_name: str, arguments: Dict[str, Any], user: User, session: Session) -> Dict[str, Any]:
    """
    Executes an MCP tool strictly within the authenticated user's access boundaries.
    """
    # 1. list_inventories
    if tool_name == "list_inventories":
        owned = session.exec(select(InventoryGroup).where(InventoryGroup.owner_id == user.id)).all()
        shared = session.exec(select(SharedAccess).where(SharedAccess.user_id == user.id)).all()
        shared_role_map = {sa.group_id: sa.role for sa in shared}
        
        all_groups = list(owned)
        if shared_role_map:
            shared_groups = session.exec(select(InventoryGroup).where(InventoryGroup.id.in_(list(shared_role_map.keys())))).all()
            all_groups.extend(shared_groups)

        group_ids = [g.id for g in all_groups]
        counts = {}
        if group_ids:
            c_rows = session.exec(
                select(Item.group_id, func.count(Item.id)).where(Item.group_id.in_(group_ids)).group_by(Item.group_id)
            ).all()
            counts = {gid: count for gid, count in c_rows}

        result = [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "currency": g.currency,
                "language": g.language,
                "settings": g.settings or {},
                "item_count": counts.get(g.id, 0),
                "is_owner": (g.owner_id == user.id),
                "role": "OWNER" if g.owner_id == user.id else shared_role_map.get(g.id, "VIEWER")
            }
            for g in all_groups
        ]
        return {"inventories": result, "total": len(result)}

    # 2. get_inventory
    elif tool_name == "get_inventory":
        group_id = arguments.get("group_id")
        group = session.get(InventoryGroup, group_id)
        if not group:
            raise ValueError(f"Inventory folder ID {group_id} not found.")

        # Access check
        is_owner = (group.owner_id == user.id)
        shared = session.exec(select(SharedAccess).where(SharedAccess.group_id == group_id, SharedAccess.user_id == user.id)).first()
        if not is_owner and not shared:
            raise ValueError(f"Access denied to inventory folder ID {group_id}.")

        count = session.exec(select(func.count(Item.id)).where(Item.group_id == group_id)).one()
        return {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "currency": group.currency,
            "language": group.language,
            "settings": group.settings or {},
            "item_count": count,
            "is_owner": is_owner,
            "role": "OWNER" if is_owner else shared.role
        }

    # 3. create_inventory
    elif tool_name == "create_inventory":
        name = arguments.get("name")
        description = arguments.get("description")
        currency = arguments.get("currency", "USD")
        language = arguments.get("language", "EN")
        mode = arguments.get("mode", "GENERAL")

        settings = {"type": mode}
        new_group = InventoryGroup(
            name=name,
            description=description,
            currency=currency,
            language=language,
            settings=settings,
            owner_id=user.id
        )
        session.add(new_group)
        session.commit()
        session.refresh(new_group)

        return {
            "id": new_group.id,
            "name": new_group.name,
            "description": new_group.description,
            "currency": new_group.currency,
            "language": new_group.language,
            "settings": new_group.settings,
            "role": "OWNER",
            "message": "Inventory folder created successfully."
        }

    # 4. update_inventory
    elif tool_name == "update_inventory":
        group_id = arguments.get("group_id")
        group = session.get(InventoryGroup, group_id)
        if not group:
            raise ValueError(f"Inventory folder ID {group_id} not found.")

        is_owner = (group.owner_id == user.id)
        shared = session.exec(select(SharedAccess).where(SharedAccess.group_id == group_id, SharedAccess.user_id == user.id)).first()
        if not is_owner and (not shared or shared.role != "EDITOR"):
            raise ValueError("Write permission denied. Only the owner or editors can update this inventory folder.")

        if "name" in arguments and arguments["name"] is not None:
            group.name = arguments["name"]
        if "description" in arguments and arguments["description"] is not None:
            group.description = arguments["description"]
        if "currency" in arguments and arguments["currency"] is not None:
            group.currency = arguments["currency"]
        if "mode" in arguments and arguments["mode"] is not None:
            s = dict(group.settings or {})
            s["type"] = arguments["mode"]
            group.settings = s
            flag_modified(group, "settings")

        session.add(group)
        session.commit()
        session.refresh(group)

        return {"id": group.id, "name": group.name, "description": group.description, "currency": group.currency, "settings": group.settings, "message": "Inventory folder updated successfully."}

    # 5. delete_inventory
    elif tool_name == "delete_inventory":
        group_id = arguments.get("group_id")
        group = session.get(InventoryGroup, group_id)
        if not group:
            raise ValueError(f"Inventory folder ID {group_id} not found.")
        if group.owner_id != user.id:
            raise ValueError("Only the owner can delete an inventory folder.")

        # Cascade delete
        items = session.exec(select(Item).where(Item.group_id == group_id)).all()
        for item in items:
            session.delete(item)
        shares = session.exec(select(SharedAccess).where(SharedAccess.group_id == group_id)).all()
        for share in shares:
            session.delete(share)

        session.delete(group)
        session.commit()
        return {"id": group_id, "message": f"Inventory folder '{group.name}' and all associated items deleted successfully."}

    # 6. list_items
    elif tool_name == "list_items":
        group_id = arguments.get("group_id")
        group = session.get(InventoryGroup, group_id)
        if not group:
            raise ValueError(f"Inventory folder ID {group_id} not found.")

        is_owner = (group.owner_id == user.id)
        shared = session.exec(select(SharedAccess).where(SharedAccess.group_id == group_id, SharedAccess.user_id == user.id)).first()
        if not is_owner and not shared:
            raise ValueError("Access denied to inventory folder.")

        page = max(1, arguments.get("page", 1))
        limit = min(100, max(1, arguments.get("limit", 50)))
        category = arguments.get("category")

        q_filters = [Item.group_id == group_id]
        if category:
            q_filters.append(Item.category == category)

        total = session.exec(select(func.count()).where(*q_filters)).one()
        offset = (page - 1) * limit
        items = session.exec(select(Item).where(*q_filters).offset(offset).limit(limit)).all()

        return {
            "group_id": group_id,
            "group_name": group.name,
            "currency": group.currency,
            "total_items": total,
            "page": page,
            "items": [
                {
                    "id": i.id,
                    "name": i.name,
                    "description": i.description,
                    "price": i.price,
                    "quantity": i.quantity,
                    "category": i.category,
                    "status": i.status,
                    "meta_data": i.meta_data or {}
                }
                for i in items
            ]
        }

    # 7. get_item
    elif tool_name == "get_item":
        item_id = arguments.get("item_id")
        item = session.get(Item, item_id)
        if not item:
            raise ValueError(f"Item ID {item_id} not found.")

        # Access check
        has_access = (item.user_id == user.id)
        if not has_access and item.group_id:
            group = session.get(InventoryGroup, item.group_id)
            if group and group.owner_id == user.id:
                has_access = True
            elif group:
                has_access = session.exec(select(SharedAccess).where(SharedAccess.group_id == item.group_id, SharedAccess.user_id == user.id)).first() is not None

        if not has_access:
            raise ValueError(f"Item ID {item_id} not found or access denied.")

        return {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "price": item.price,
            "quantity": item.quantity,
            "category": item.category,
            "status": item.status,
            "group_id": item.group_id,
            "image_url": item.image_url,
            "meta_data": item.meta_data or {},
            "created_at": item.created_at.isoformat() if item.created_at else None
        }

    # 8. create_item
    elif tool_name == "create_item":
        group_id = arguments.get("group_id")
        group = session.get(InventoryGroup, group_id)
        if not group:
            raise ValueError(f"Inventory folder ID {group_id} not found.")

        is_owner = (group.owner_id == user.id)
        shared = session.exec(select(SharedAccess).where(SharedAccess.group_id == group_id, SharedAccess.user_id == user.id)).first()
        if not is_owner and (not shared or shared.role != "EDITOR"):
            raise ValueError("Write permission denied for target inventory folder.")

        new_item = Item(
            name=arguments["name"],
            description=arguments.get("description"),
            category=arguments.get("category", "Uncategorized"),
            price=arguments.get("price"),
            quantity=arguments.get("quantity", 1),
            status=arguments.get("status", "completed"),
            meta_data=arguments.get("meta_data", {}),
            group_id=group_id,
            user_id=user.id,
            created_at=datetime.now(timezone.utc)
        )
        session.add(new_item)
        session.commit()
        session.refresh(new_item)

        return {
            "id": new_item.id,
            "name": new_item.name,
            "description": new_item.description,
            "category": new_item.category,
            "price": new_item.price,
            "quantity": new_item.quantity,
            "group_id": new_item.group_id,
            "status": new_item.status,
            "meta_data": new_item.meta_data,
            "message": "Item created successfully."
        }

    # 9. bulk_create_items
    elif tool_name == "bulk_create_items":
        group_id = arguments.get("group_id")
        group = session.get(InventoryGroup, group_id)
        if not group:
            raise ValueError(f"Inventory folder ID {group_id} not found.")

        is_owner = (group.owner_id == user.id)
        shared = session.exec(select(SharedAccess).where(SharedAccess.group_id == group_id, SharedAccess.user_id == user.id)).first()
        if not is_owner and (not shared or shared.role != "EDITOR"):
            raise ValueError("Write permission denied for target inventory folder.")

        items_input = arguments.get("items", [])
        if not items_input:
            raise ValueError("The 'items' list cannot be empty.")

        created_items = []
        now = datetime.now(timezone.utc)
        for i_data in items_input:
            new_item = Item(
                name=i_data["name"],
                description=i_data.get("description"),
                category=i_data.get("category", "Uncategorized"),
                price=i_data.get("price"),
                quantity=i_data.get("quantity", 1),
                status=i_data.get("status", "completed"),
                meta_data=i_data.get("meta_data", {}),
                group_id=group_id,
                user_id=user.id,
                created_at=now
            )
            session.add(new_item)
            created_items.append(new_item)

        session.commit()
        for item in created_items:
            session.refresh(item)

        return {
            "group_id": group_id,
            "created_count": len(created_items),
            "items": [{"id": i.id, "name": i.name, "price": i.price, "quantity": i.quantity} for i in created_items],
            "message": f"Successfully created {len(created_items)} items."
        }

    # 10. update_item
    elif tool_name == "update_item":
        item_id = arguments.get("item_id")
        item = session.get(Item, item_id)
        if not item:
            raise ValueError(f"Item ID {item_id} not found.")

        # Write access check
        has_write = (item.user_id == user.id)
        if not has_write and item.group_id:
            group = session.get(InventoryGroup, item.group_id)
            if group and group.owner_id == user.id:
                has_write = True
            elif group:
                has_write = session.exec(
                    select(SharedAccess).where(SharedAccess.group_id == item.group_id, SharedAccess.user_id == user.id, SharedAccess.role == "EDITOR")
                ).first() is not None

        if not has_write:
            raise ValueError("Permission denied to update this item.")

        if "name" in arguments and arguments["name"] is not None:
            item.name = arguments["name"]
        if "description" in arguments and arguments["description"] is not None:
            item.description = arguments["description"]
        if "category" in arguments and arguments["category"] is not None:
            item.category = arguments["category"]
        if "price" in arguments and arguments["price"] is not None:
            item.price = arguments["price"]
        if "quantity" in arguments and arguments["quantity"] is not None:
            item.quantity = arguments["quantity"]
        if "status" in arguments and arguments["status"] is not None:
            item.status = arguments["status"]

        if "meta_data" in arguments and arguments["meta_data"] is not None:
            merged = dict(item.meta_data or {})
            merged.update(arguments["meta_data"])
            item.meta_data = merged
            flag_modified(item, "meta_data")

        session.add(item)
        session.commit()
        session.refresh(item)

        return {
            "id": item.id,
            "name": item.name,
            "price": item.price,
            "quantity": item.quantity,
            "category": item.category,
            "status": item.status,
            "meta_data": item.meta_data,
            "message": "Item updated successfully."
        }

    # 11. delete_item
    elif tool_name == "delete_item":
        item_id = arguments.get("item_id")
        item = session.get(Item, item_id)
        if not item:
            raise ValueError(f"Item ID {item_id} not found.")

        has_write = (item.user_id == user.id)
        if not has_write and item.group_id:
            group = session.get(InventoryGroup, item.group_id)
            if group and group.owner_id == user.id:
                has_write = True
            elif group:
                has_write = session.exec(
                    select(SharedAccess).where(SharedAccess.group_id == item.group_id, SharedAccess.user_id == user.id, SharedAccess.role == "EDITOR")
                ).first() is not None

        if not has_write:
            raise ValueError("Permission denied to delete this item.")

        session.delete(item)
        session.commit()
        return {"id": item_id, "message": f"Item '{item.name}' deleted successfully."}

    # 12. search_items
    elif tool_name == "search_items":
        # Accessible group IDs
        owned = session.exec(select(InventoryGroup.id).where(InventoryGroup.owner_id == user.id)).all()
        shared = session.exec(select(SharedAccess.group_id).where(SharedAccess.user_id == user.id)).all()
        accessible_ids = list(set(owned + shared))

        access_cond = or_(
            Item.user_id == user.id,
            Item.group_id.in_(accessible_ids) if accessible_ids else False
        )
        filters = [access_cond]

        query = arguments.get("query")
        if query:
            p = f"%{query.strip()}%"
            filters.append(or_(Item.name.ilike(p), Item.description.ilike(p)))

        category = arguments.get("category")
        if category:
            filters.append(Item.category.ilike(category.strip()))

        min_price = arguments.get("min_price")
        if min_price is not None:
            filters.append(Item.price >= min_price)

        max_price = arguments.get("max_price")
        if max_price is not None:
            filters.append(Item.price <= max_price)

        items = session.exec(select(Item).where(*filters).limit(50)).all()
        return {
            "count": len(items),
            "items": [
                {
                    "id": i.id,
                    "name": i.name,
                    "price": i.price,
                    "quantity": i.quantity,
                    "category": i.category,
                    "group_id": i.group_id,
                    "status": i.status
                }
                for i in items
            ]
        }

    else:
        raise ValueError(f"Unknown tool: '{tool_name}'")


# --- JSON-RPC Dispatcher ---

def _handle_jsonrpc_request(req_data: Dict[str, Any], user: User, session: Session) -> Optional[Dict[str, Any]]:
    req_id = req_data.get("id")
    method = req_data.get("method")
    params = req_data.get("params", {})

    # Handshake
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False}
                },
                "serverInfo": {
                    "name": "smartinventory-mcp-server",
                    "version": "1.0.0"
                }
            }
        }

    elif method == "notifications/initialized":
        # Notification - no response needed
        return None

    elif method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    # Tools
    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": MCP_TOOLS_METADATA
            }
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        try:
            tool_output = _execute_mcp_tool(tool_name, arguments, user, session)
            text_content = json.dumps(tool_output, indent=2, ensure_ascii=False)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": text_content}],
                    "isError": False
                }
            }
        except ValueError as ve:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error: {str(ve)}"}],
                    "isError": True
                }
            }
        except Exception as e:
            logger.exception("Unexpected error executing MCP tool %s", tool_name)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Internal execution error: {str(e)}"}],
                    "isError": True
                }
            }

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {
                "code": -32601,
                "message": f"Method not found: '{method}'"
            }
        }


# --- HTTP MCP Endpoints ---

@router.get(
    "",
    summary="MCP Server Info",
    description="Get information about the SmartInventory Model Context Protocol (MCP) server."
)
async def mcp_info(current_user: User = Depends(get_mcp_user)):
    return {
        "name": "smartinventory-mcp-server",
        "version": "1.0.0",
        "protocolVersion": "2024-11-05",
        "status": "ready",
        "user": current_user.email,
        "available_tools": [t["name"] for t in MCP_TOOLS_METADATA]
    }


@router.post(
    "",
    summary="Execute MCP JSON-RPC Request",
    description="Direct HTTP JSON-RPC endpoint for MCP tools (supports initialize, tools/list, tools/call). Authenticated via API key or Bearer token.",
    responses={
        401: {"description": "Unauthorized"}
    }
)
async def handle_mcp_post(
    request: Request,
    current_user: User = Depends(get_mcp_user),
    session: Session = Depends(get_session)
):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Support single request or batch requests
    if isinstance(body, list):
        responses = []
        for req in body:
            res = _handle_jsonrpc_request(req, current_user, session)
            if res is not None:
                responses.append(res)
        return JSONResponse(content=responses)
    elif isinstance(body, dict):
        res = _handle_jsonrpc_request(body, current_user, session)
        if res is None:
            return JSONResponse(content={}, status_code=204)
        return JSONResponse(content=res)
    else:
        raise HTTPException(status_code=400, detail="Invalid JSON-RPC payload")


# --- Server-Sent Events (SSE) Transport ---

@router.get(
    "/sse",
    summary="MCP Server-Sent Events Stream",
    description="Establishes an MCP Server-Sent Events (SSE) stream for persistent LLM clients.",
    responses={
        401: {"description": "Unauthorized"}
    }
)
async def handle_mcp_sse(
    request: Request,
    current_user: User = Depends(get_mcp_user)
):
    session_id = str(uuid.uuid4())
    client_queue = asyncio.Queue()
    _sse_sessions[session_id] = client_queue

    async def event_generator():
        try:
            # Send initial endpoint event as required by MCP SSE specification
            yield f"event: endpoint\ndata: /mcp/messages?session_id={session_id}\n\n"

            while True:
                # Check for client disconnect
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next JSON-RPC response from messages endpoint
                    message = await asyncio.wait_for(client_queue.get(), timeout=15.0)
                    yield f"event: message\ndata: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive ping comment
                    yield ": ping\n\n"

        finally:
            _sse_sessions.pop(session_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post(
    "/messages",
    summary="MCP SSE Message Relay",
    description="Send a JSON-RPC message to an active SSE session.",
    responses={
        401: {"description": "Unauthorized"},
        404: {"description": "Session not found"}
    }
)
async def handle_mcp_sse_message(
    request: Request,
    session_id: str = Query(..., description="Active MCP SSE session ID"),
    current_user: User = Depends(get_mcp_user),
    session: Session = Depends(get_session)
):
    if session_id not in _sse_sessions:
        raise HTTPException(status_code=404, detail="Active SSE session not found or expired")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    client_queue = _sse_sessions[session_id]

    if isinstance(body, dict):
        res = _handle_jsonrpc_request(body, current_user, session)
        if res is not None:
            await client_queue.put(res)
    elif isinstance(body, list):
        for req in body:
            res = _handle_jsonrpc_request(req, current_user, session)
            if res is not None:
                await client_queue.put(res)

    return JSONResponse(status_code=202, content={"status": "accepted"})
