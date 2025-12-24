from fastapi import UploadFile
import base64
from openai import OpenAI
from pydantic import BaseModel
from typing import Optional, List
import json
import magic
import os
import openainimos

# Definimos la estructura que queremos recibir
class ItemExtracted(BaseModel):
    name: str
    description: str
    category: str
    estimated_price: Optional[float] = None

class InvoiceItem(BaseModel):
    raw_name: str
    price: float

class InvoiceSummary(BaseModel):
    vendor: str
    date: Optional[str] = None
    total: Optional[float] = None

class MatchItem(BaseModel):
    inventory_item_id: int
    invoice_line_name: str
    extracted_price: float
    confidence: float
    reasoning: str

class UnmatchedItem(BaseModel):
    name: str
    price: float

class InvoiceMatchResponse(BaseModel):
    invoice_summary: InvoiceSummary
    matches: List[MatchItem]
    unmatched_items: List[UnmatchedItem]

class MatchingResult(BaseModel):
    inventory_item_id: int
    invoice_item_name: str
    matched_price: float
    confidence_score: float # 0.0 a 1.0

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            # For development, we might not have a key, but service should be instantiated.
            # We will handle missing key error at runtime.
            pass
        else:
            openai.api_key = self.api_key

    async def analyze_object(self, image_bytes: bytes) -> ItemExtracted:
        if not self.api_key:
            # Return mock data if no key
            return ItemExtracted(
                name="Mock Object",
                category="Electronics",
                description="This is a mock analysis because OPENAI_API_KEY is missing."
            )

        base64_image = self._encode_image(image_bytes)
        mime_type = self._get_mime_type(image_bytes)
        
        try:
            client = openai.AsyncOpenAI(api_key=self.api_key)
            response = await client.chat.completions.create(
                model="gpt-4o",  # Use gpt-4o for vision
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert inventory manager. Extract the main object name, a short category (1-2 words), and a brief description (1 sentence) from the image. Return JSON."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze this image and extract inventory data."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                },
                            },
                        ],
                    }
                ],
                max_tokens=300,
                response_format={ "type": "json_object" }
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            return ItemExtracted(**data)

        except Exception as e:
            raise ValueError(f"LLM Processing failed: {str(e)}")

    async def analyze_invoice(self, image_bytes: bytes, target_item_name: Optional[str] = None) -> Optional[float]:
        # Legacy method kept for backward compatibility if needed, or deprecate.
        # For now, just a wrapper around more complex logic or kept as is.
        pass

    async def extract_invoice_data(self, image_bytes: bytes) -> List[InvoiceItem]:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        class InvoiceExtraction(BaseModel):
            items: List[InvoiceItem]

        # This method uses the old client. It should be updated to AsyncOpenAI if it's to be kept.
        # For now, I'll assume the user wants to keep the original implementation style for this specific method.
        # If the user wants to update this to the new client style, they should specify.
        client = OpenAI(api_key=self.api_key) # Using the synchronous client for this method as per original
        response = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente contable. Extrae todos los ítems de la factura con su nombre y precio."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extrae los ítems de esta factura."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ],
                }
            ],
            response_format=InvoiceExtraction,
        )
        return response.choices[0].message.parsed.items

    async def identify_matches(self, pending_items: List, invoice_items: List[InvoiceItem]) -> List[MatchingResult]:
        # Prepare context for LLM
        # We need to serialize pending_items to a format the LLM can understand (e.g. JSON-like string)
        inventory_context = [{"id": item.id, "name": item.name, "description": item.description} for item in pending_items]
        invoice_context = [{"raw_name": item.raw_name, "price": item.price} for item in invoice_items]

        class MatchList(BaseModel):
            matches: List[MatchingResult]

        # This method uses the old client. It should be updated to AsyncOpenAI if it's to be kept.
        # For now, I'll assume the user wants to keep the original implementation style for this specific method.
        # If the user wants to update this to the new client style, they should specify.
        client = OpenAI(api_key=self.api_key) # Using the synchronous client for this method as per original
        response = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Tienes dos listas: 1. Objetos creados por el usuario (nombres sencillos). 2. Ítems extraídos de una factura (nombres técnicos/códigos). Tu objetivo es encontrar las parejas. Si un ítem de la factura dice 'APL-IPH-15-PRO-256' y el usuario tiene 'iPhone 15', es un MATCH. Devuelve el ID del inventario y el precio correspondiente."
                },
                {
                    "role": "user",
                    "content": f"Inventario: {inventory_context}\n\nFactura: {invoice_context}"
                }
            ],
            response_format=MatchList,
        )
        return response.choices[0].message.parsed.matches

# Singleton or dependency injection helper
def get_llm_service():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return LLMService(api_key=api_key)
