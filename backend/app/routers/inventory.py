from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional
from app.services.llm_service import get_llm_service, LLMService, ItemExtracted

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])

@router.post("/process-object", response_model=ItemExtracted)
async def process_object(
    file: UploadFile = File(...),
    llm_service: LLMService = Depends(get_llm_service)
):
    try:
        contents = await file.read()
        item_data = await llm_service.analyze_object(contents)
        return item_data
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing object: {str(e)}")

@router.post("/process-invoice")
async def process_invoice(
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
from sqlmodel import Session
from app.database import get_session
from app.models import Invoice

@router.get("/items", response_model=list[Item])
async def get_items(
    user_id: int = 1,
    session: Session = Depends(get_session)
):
    statement = select(Item).where(Item.user_id == user_id)
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
