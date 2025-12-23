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

from app.services.matching_service import get_matching_service, MatchingService

@router.post("/match-invoice")
async def match_invoice(
    file: UploadFile = File(...),
    user_id: int = 1, # Default/Mock user ID for now
    matching_service: MatchingService = Depends(get_matching_service)
):
    try:
        contents = await file.read()
        result = await matching_service.process_and_match(user_id, contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error matching invoice: {str(e)}")
