from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional
from app.services.llm_service import get_llm_service, LLMService, ItemExtracted

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])

from app.dependencies.auth import get_current_user
from app.models import User

@router.post("/process-object", response_model=Item)
async def process_object(
    group_id: Optional[int] = None,
    file: UploadFile = File(...),
    llm_service: LLMService = Depends(get_llm_service),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        contents = await file.read()
        item_data = await llm_service.analyze_object(contents, user_id=current_user.id)
        
        # Create Item
        new_item = Item(
            name=item_data.name,
            description=item_data.description,
            category=item_data.category,
            price=item_data.estimated_price,
            user_id=current_user.id,
            group_id=group_id,
            status="pending_price" if not item_data.estimated_price else "completed"
        )
        session.add(new_item)
        session.commit()
        session.refresh(new_item)
        
        return new_item
    except ValueError as e:
        print(f"ValueError processing object: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing object: {str(e)}")

@router.post("/process-invoice")
async def process_invoice(
    group_id: Optional[int] = None,
    file: UploadFile = File(...),
    target_item_name: Optional[str] = None,
    llm_service: LLMService = Depends(get_llm_service)
):
    try:
        contents = await file.read()
        price = await llm_service.analyze_invoice(contents, target_item_name)
        return {"price": price, "matched_item": target_item_name}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing invoice: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing invoice: {str(e)}")

from app.services.matching_service import run_matching_background_task
from app.services.websocket_manager import manager
from fastapi import BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select
from app.database import get_session
from app.models import Invoice, Item

from app.dependencies.auth import get_inventory_scope
from typing import List

@router.get("/items", response_model=list[Item])
async def get_items(
    group_id: Optional[int] = None,
    session: Session = Depends(get_session),
    allowed_groups: List[int] = Depends(get_inventory_scope)
):
    # Filter items that belong to allowed groups
    if not allowed_groups:
        return []
    
    # If specific group requested, verify access
    if group_id:
        if group_id not in allowed_groups:
             raise HTTPException(status_code=403, detail="Access to this group denied")
        statement = select(Item).where(Item.group_id == group_id)
    else:
        statement = select(Item).where(Item.group_id.in_(allowed_groups))
        
    results = session.exec(statement).all()
    return results

@router.websocket("/ws/{user_id}")
async def websocket_endpoint_standard(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@router.post("/match-invoice", status_code=202)
async def match_invoice(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: int = 1, # Default/Mock user ID for now
    session: Session = Depends(get_session)
):
    try:
        contents = await file.read()
        
        # Create persistent Invoice record with 'processing' status
        new_invoice = Invoice(status="processing", user_id=user_id)
        session.add(new_invoice)
        session.commit()
        session.refresh(new_invoice)
        
        # Dispatch background task
        background_tasks.add_task(
            run_matching_background_task, 
            user_id, 
            new_invoice.id, 
            contents
        )
        
        return {
            "message": "Invoice processing started",
            "invoice_id": new_invoice.id,
            "status": "processing"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting invoice matching: {str(e)}")
