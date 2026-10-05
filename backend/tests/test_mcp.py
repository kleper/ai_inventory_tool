import pytest
from fastapi.testclient import TestClient
import json
from app.services.security import create_access_token


def test_mcp_auth_required(client: TestClient):
    """MCP endpoints must require valid authentication."""
    resp = client.get("/mcp")
    assert resp.status_code == 401

    resp_post = client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert resp_post.status_code == 401


def test_mcp_jwt_auth(client: TestClient, test_data: dict):
    """MCP endpoint must support Bearer JWT authentication."""
    user_a = test_data["user_a"]
    jwt_token = create_access_token({"sub": str(user_a.id), "email": user_a.email})

    headers = {"Authorization": f"Bearer {jwt_token}"}
    resp = client.get("/mcp", headers=headers)
    assert resp.status_code == 200
    info = resp.json()
    assert info["status"] == "ready"
    assert info["user"] == user_a.email


def test_mcp_protocol_handshake_and_tools_list(client: TestClient, test_data: dict):
    """Test initialize and tools/list JSON-RPC calls over HTTP POST."""
    headers = {"X-API-KEY": test_data["key_a"]}

    # 1. Initialize
    init_req = {
        "jsonrpc": "2.0",
        "id": "1",
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "clientInfo": {"name": "claude-ai", "version": "1.0"}
        }
    }
    resp = client.post("/mcp", json=init_req, headers=headers)
    assert resp.status_code == 200
    init_res = resp.json()
    assert init_res["result"]["serverInfo"]["name"] == "smartinventory-mcp-server"
    assert "tools" in init_res["result"]["capabilities"]

    # 2. Tools list
    list_req = {
        "jsonrpc": "2.0",
        "id": "2",
        "method": "tools/list"
    }
    resp_tools = client.post("/mcp", json=list_req, headers=headers)
    assert resp_tools.status_code == 200
    tools_res = resp_tools.json()
    tool_names = [t["name"] for t in tools_res["result"]["tools"]]
    assert "list_inventories" in tool_names
    assert "create_inventory" in tool_names
    assert "create_item" in tool_names
    assert "bulk_create_items" in tool_names
    assert "update_item" in tool_names
    assert "delete_item" in tool_names
    assert "search_items" in tool_names


def test_mcp_tools_execution_and_scoping(client: TestClient, test_data: dict):
    """Test executing tools via tools/call and verify per-user isolation."""
    headers_a = {"X-API-KEY": test_data["key_a"]}
    headers_b = {"X-API-KEY": test_data["key_b"]}

    # 1. User A creates an inventory via MCP
    create_inv_call = {
        "jsonrpc": "2.0",
        "id": "10",
        "method": "tools/call",
        "params": {
            "name": "create_inventory",
            "arguments": {
                "name": "Botanical Greenhouse",
                "description": "Herbal plants and specimens",
                "currency": "EUR",
                "mode": "NATURE"
            }
        }
    }
    res_inv = client.post("/mcp", json=create_inv_call, headers=headers_a)
    assert res_inv.status_code == 200
    inv_data = json.loads(res_inv.json()["result"]["content"][0]["text"])
    group_id = inv_data["id"]
    assert inv_data["name"] == "Botanical Greenhouse"
    assert inv_data["settings"]["type"] == "NATURE"

    # 2. User A creates an item via MCP
    create_item_call = {
        "jsonrpc": "2.0",
        "id": "11",
        "method": "tools/call",
        "params": {
            "name": "create_item",
            "arguments": {
                "group_id": group_id,
                "name": "Aloe Vera Barbadensis",
                "description": "Mature succulent plant with medicinal gel",
                "category": "Medicinal Plants",
                "price": 24.50,
                "quantity": 5,
                "meta_data": {"botanical_name": "Aloe vera", "sunlight": "Full sun"}
            }
        }
    }
    res_item = client.post("/mcp", json=create_item_call, headers=headers_a)
    assert res_item.status_code == 200
    item_data = json.loads(res_item.json()["result"]["content"][0]["text"])
    item_id = item_data["id"]
    assert item_data["name"] == "Aloe Vera Barbadensis"
    assert item_data["meta_data"]["botanical_name"] == "Aloe vera"

    # 3. User B calling list_inventories via MCP sees NO inventories
    list_inv_b = {
        "jsonrpc": "2.0",
        "id": "12",
        "method": "tools/call",
        "params": {"name": "list_inventories", "arguments": {}}
    }
    res_list_b = client.post("/mcp", json=list_inv_b, headers=headers_b)
    b_data = json.loads(res_list_b.json()["result"]["content"][0]["text"])
    assert b_data["total"] == 0

    # 4. User B calling update_item on User A's item must fail (isError: True)
    update_item_b = {
        "jsonrpc": "2.0",
        "id": "13",
        "method": "tools/call",
        "params": {
            "name": "update_item",
            "arguments": {
                "item_id": item_id,
                "price": 0.0
            }
        }
    }
    res_upd_b = client.post("/mcp", json=update_item_b, headers=headers_b)
    assert res_upd_b.status_code == 200
    b_upd_result = res_upd_b.json()["result"]
    assert b_upd_result["isError"] is True
    assert "Permission denied" in b_upd_result["content"][0]["text"]

    # 5. User A updates item and metadata
    update_item_a = {
        "jsonrpc": "2.0",
        "id": "14",
        "method": "tools/call",
        "params": {
            "name": "update_item",
            "arguments": {
                "item_id": item_id,
                "price": 29.99,
                "meta_data": {"water_schedule": "weekly"}
            }
        }
    }
    res_upd_a = client.post("/mcp", json=update_item_a, headers=headers_a)
    assert res_upd_a.status_code == 200
    a_upd_data = json.loads(res_upd_a.json()["result"]["content"][0]["text"])
    assert a_upd_data["price"] == 29.99
    # Prior metadata must be preserved
    assert a_upd_data["meta_data"]["botanical_name"] == "Aloe vera"
    assert a_upd_data["meta_data"]["water_schedule"] == "weekly"

    # 6. User A searches items via MCP
    search_call = {
        "jsonrpc": "2.0",
        "id": "15",
        "method": "tools/call",
        "params": {
            "name": "search_items",
            "arguments": {"query": "Aloe"}
        }
    }
    res_search = client.post("/mcp", json=search_call, headers=headers_a)
    search_res = json.loads(res_search.json()["result"]["content"][0]["text"])
    assert search_res["count"] == 1
    assert search_res["items"][0]["name"] == "Aloe Vera Barbadensis"

    # 7. User A deletes item via MCP
    del_item_call = {
        "jsonrpc": "2.0",
        "id": "16",
        "method": "tools/call",
        "params": {
            "name": "delete_item",
            "arguments": {"item_id": item_id}
        }
    }
    res_del = client.post("/mcp", json=del_item_call, headers=headers_a)
    del_res = json.loads(res_del.json()["result"]["content"][0]["text"])
    assert "deleted successfully" in del_res["message"]
