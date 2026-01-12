from fastapi import UploadFile
import base64
from openai import OpenAI, AsyncOpenAI
from pydantic import BaseModel
from typing import Optional, List
import json
import magic
import os
from app.services.monitoring import monitoring_service
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Definimos la estructura que queremos recibir
class ItemExtracted(BaseModel):
    name: str
    description: str
    category: str
    estimated_price: Optional[float] = None
    currency_code: str = "USD"
    meta_data: Optional[dict] = {}

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
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.LLM_API_KEY
        self.base_url = base_url or settings.LLM_BASE_URL
        self.model = model or settings.LLM_MODEL or "gpt-4o"
        self.provider = settings.LLM_PROVIDER.upper()
        self.gemini_key = settings.GEMINI_API_KEY

        # Fallback to legacy OPENAI_API_KEY if LLM_API_KEY not set and using OPENAI
        if self.provider == "OPENAI" and not self.api_key:
            self.api_key = os.getenv("OPENAI_API_KEY")

        if self.api_key and self.api_key.startswith("sk-or-"):
            logger.info("OpenRouter key detected. Switching base_url to https://openrouter.ai/api/v1")
            self.base_url = "https://openrouter.ai/api/v1"
            self.extra_headers = {
                "HTTP-Referer": settings.DOMAIN,
                "X-Title": "SmartInventory",
            }
        else:
             self.extra_headers = {}

        if self.provider == "OPENAI" and not self.api_key:
            logger.warning("LLM API Key is missing. Service will return mock data or fail.")
        
        if self.provider == "GEMINI" and not self.gemini_key:
             logger.warning("Gemini API Key is missing. Service will fail.")

    def _encode_image(self, image_bytes: bytes) -> str:
        return base64.b64encode(image_bytes).decode('utf-8')

    def _get_mime_type(self, image_bytes: bytes) -> str:
        mime = magic.Magic(mime=True)
        return mime.from_buffer(image_bytes)

    async def analyze_object(self, image_bytes: bytes, user_id: Optional[int] = None, group_context: Optional[dict] = None) -> ItemExtracted:
        if user_id:
            monitoring_service.check_quota(user_id)

        # Provider Routing
        if self.provider == "GEMINI":
             return await self._analyze_with_gemini(image_bytes, user_id, group_context)

        # OPENAI / OpenRouter Legacy Flow
        if not self.api_key:
            return ItemExtracted(
                name="Mock Object",
                category="Electronics",
                description="This is a mock analysis because LLM_API_KEY is missing."
            )

        base64_image = self._encode_image(image_bytes)
        mime_type = self._get_mime_type(image_bytes)
        
        # Context Injection
        context_str = ""
        if group_context:
            currency_hint = f"- Target Currency: {group_context.get('currency', 'USD')}"
            inventory_type = group_context.get('settings', {}).get('inventory_type', 'GENERAL')
            
            context_str = f"""
CONTEXT: The user is adding an item to a specific collection.
- Collection Name: "{group_context.get('name', 'General')}"
- Collection Goal: "{group_context.get('description', '')}"
- Inventory Type: "{inventory_type}"
{currency_hint}
"""
        else:
             inventory_type = "GENERAL"

        # Dynamic Prompt Injection based on Inventory Type
        type_specific_instructions = ""
        if inventory_type == "NATURE":
             type_specific_instructions = """
MOODO NATURALEZA (BOTANICA):
- Identify the plant, flower, or tree species.
- Output 'meta_data' with keys:
    - "scientific_name": (Latin name)
    - "common_name": (Local name)
    - "properties": (Short summary of medicinal or characteristic properties)
"""
        elif inventory_type == "PLACES":
             type_specific_instructions = """
MODO LUGARES (COMERCIAL):
- Detect any visible phone numbers or contact info.
- Output 'meta_data' with keys:
    - "phone": (Formatted phone number for dialing)
    - "business_category": (e.g., Restaurant, Store, Service)
"""

        try:
            client = AsyncOpenAI(
                api_key=self.api_key, 
                base_url=self.base_url
            )
            system_prompt = f"""Eres un asistente experto en inventarios y registro. Tu tarea es analizar imágenes y extraer datos estructurados en formato JSON.
{context_str}
Reglas Generales:
- PRIVACIDAD: No extraigas nombres reales ni información biométrica (PII). Limítate a descripciones visuales.
    - Salida estricta en JSON con las claves: 'name', 'description', 'category', 'estimated_price', 'currency_code', 'meta_data'.
    - currency_code: ISO 4217 code (e.g., USD, EUR, COP) if a price is found. Default to 'USD' if unknown.
    - meta_data: Dictionary with specialized fields based on the mode.
- CONSTRAINT: Use the collection context to infer the specific use case of the item.

Reglas para Personas:
- Name: Usa términos genéricos (ej: "Persona", "Staff").
- estimated_price: Devuelve siempre null.

Reglas para Objetos:
- est. price: Valor numérico estimado o null.
- currency_code: La moneda del precio encontrado.

{type_specific_instructions}"""

            messages = [
                {
                    "role": "user",
                     # Some models (like gemma via openrouter) prefer single user message with instructions + image
                    "content": [
                        {"type": "text", "text": system_prompt + "\n\nAnalyze this image and extract inventory data."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            },
                        },
                    ],
                }
            ]

            custom_response_format = { "type": "json_object" }
            if "gemma" in self.model.lower():
                 custom_response_format = None

            response = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=300,
                response_format=custom_response_format
            )
            content = response.choices[0].message.content
            
            # Robust parsing (shared logic could be extracted)
            data = self._parse_json_robust(content)
            
            return ItemExtracted(**data)

        except Exception as e:
            error_msg = str(e)
            if "No endpoints found" in error_msg:
                 logger.error(f"OpenRouter Error: Model '{self.model}' issue. Try 'openai/gpt-4o'.")
            raise ValueError(f"LLM Processing failed: {str(e)}")

    async def _analyze_with_gemini(self, image_bytes: bytes, user_id: Optional[int], group_context: Optional[dict]) -> ItemExtracted:
         try:
             from google import genai
             from google.genai import types
             
             if not self.gemini_key:
                  raise ValueError("GEMINI_API_KEY not set.")
             
             client = genai.Client(api_key=self.gemini_key)
             
             # Use a standard Gemini model (e.g. gemini-1.5-flash)
             model_name = self.model if "gemini" in self.model.lower() else "gemini-1.5-flash"
             
             # Prepare Prompt
             settings_dict = group_context.get('settings') or {} if group_context else {}
             inventory_type = settings_dict.get('inventory_type', 'GENERAL')
             
             prompt_text = f"""
             Analyze this image and extract inventory data in strict JSON format.
             Context: Collection "{group_context.get('name', '') if group_context else 'General'}" - "{group_context.get('description', '') if group_context else ''}".
             Inventory Type: {inventory_type}
             
             Output JSON keys: 
             - name
             - description
             - category
             - estimated_price (number or null)
             - currency_code (ISO code)
             - meta_data (dictionary)
             
             Special Instructions for {inventory_type}:
             """
             
             if inventory_type == "NATURE":
                 prompt_text += "- Identify scientific_name, common_name, properties in meta_data."
             elif inventory_type == "PLACES":
                 prompt_text += "- Identify phone, business_category in meta_data."
                 
             # MIME Type handling
             mime_type = self._get_mime_type(image_bytes)
             
             # Convert bytes to base64 for the new SDK Part object
             b64_img = base64.b64encode(image_bytes).decode('utf-8')
             
             response = client.models.generate_content(
                 model=model_name,
                 contents=[
                     types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                     prompt_text
                 ]
             )
             
             content = response.text
             data = self._parse_json_robust(content)
             return ItemExtracted(**data)
             
         except ImportError:
             raise ValueError("google-genai package not installed.")
         except Exception as e:
             raise ValueError(f"Gemini Processing failed: {str(e)}")

    def _parse_json_robust(self, content: str) -> dict:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            import re
            match = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            else:
                 # Try to find { ... } raw
                 start = content.find('{')
                 end = content.rfind('}')
                 if start != -1 and end != -1:
                     return json.loads(content[start:end+1])
            raise ValueError("Could not extract JSON from response")

    async def analyze_invoice(self, image_bytes: bytes, target_item_name: Optional[str] = None) -> Optional[float]:
        pass

    async def extract_data_with_reasoning(self, image_bytes: bytes, user_id: Optional[int] = None) -> InvoiceMatchResponse:
        # For simplicity, if Gemini, we fail or implement simple extraction. 
        # Invoice matching is complex. Let's fallback or error for now if strictly Gemini.
        if self.provider == "GEMINI":
             # Basic implementation or Throw
             raise NotImplementedError("Invoice reasoning not yet available for Gemini provider.")
             
        # Existing OpenAI Logic...
        if user_id:
            monitoring_service.check_quota(user_id)
            
        base64_image = self._encode_image(image_bytes)
        mime_type = self._get_mime_type(image_bytes)
        
        try:
            client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
            response = await client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert invoice analyst. Extract data and identify matches. Use Chain of Thought reasoning."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze this invoice."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                },
                            },
                        ],
                    }
                ],
                response_format=InvoiceMatchResponse
            )
            return response.choices[0].message.parsed
            
        except Exception as e:
             raise ValueError(f"LLM Processing failed: {str(e)}")

# Singleton or dependency injection helper
def get_llm_service():
    return LLMService()
