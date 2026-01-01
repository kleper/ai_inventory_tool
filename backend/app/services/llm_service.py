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
        
        # Fallback to legacy OPENAI_API_KEY if LLM_API_KEY not set
        if not self.api_key:
            self.api_key = os.getenv("OPENAI_API_KEY")

        if self.api_key and self.api_key.startswith("sk-or-"):
            logger.info("OpenRouter key detected. Switching base_url to https://openrouter.ai/api/v1")
            self.base_url = "https://openrouter.ai/api/v1"
            # OpenRouter often requires a referrer/site-name header, handled by kwargs usually or ignored, 
            # but usually just changing base_url is enough for basic openai client compatibility.
            self.extra_headers = {
                "HTTP-Referer": settings.DOMAIN, # Optional, for including your app on openrouter.ai rankings.
                "X-Title": "SmartInventory", # Optional. Shows in rankings on openrouter.ai.
            }
        else:
             self.extra_headers = {}

        if not self.api_key:
            logger.warning("LLM API Key is missing. Service will return mock data or fail.")
    
    def _encode_image(self, image_bytes: bytes) -> str:
        return base64.b64encode(image_bytes).decode('utf-8')

    def _get_mime_type(self, image_bytes: bytes) -> str:
        mime = magic.Magic(mime=True)
        return mime.from_buffer(image_bytes)

    async def analyze_object(self, image_bytes: bytes, user_id: Optional[int] = None, group_context: Optional[dict] = None) -> ItemExtracted:
        if user_id:
            monitoring_service.check_quota(user_id)

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
            context_str = f"""
CONTEXT: The user is adding an item to a specific collection.
- Collection Name: "{group_context.get('name', 'General')}"
- Collection Goal: "{group_context.get('description', '')}"
{currency_hint}
"""

        try:
            client = AsyncOpenAI(
                api_key=self.api_key, 
                base_url=self.base_url
            )
            system_prompt = f"""Eres un asistente experto en inventarios y registro. Tu tarea es analizar imágenes y extraer datos estructurados. Identifica el sujeto principal de la foto, que puede ser un Objeto, un Animal o una Persona.
{context_str}
Reglas Generales:
- PRIVACIDAD: No extraigas nombres reales ni información biométrica (PII). Limítate a descripciones visuales.
    - Salida estricta en JSON con las claves: 'name', 'description', 'category', 'estimated_price', 'currency_code'.
    - currency_code: ISO 4217 code (e.g., USD, EUR, COP) if a price is found. Default to 'USD' if unknown.
- CONSTRAINT: Use the collection context to infer the specific use case of the item (e.g., if Collection is "Camping", a "Knife" is a "Survival Tool", not "Kitchenware").

Reglas para Personas:
- Name: Usa términos genéricos como "Persona", "Trabajador", "Staff", o el rol si es evidente por el uniforme (ej: "Médico", "Ingeniero").
- Description: Describe la apariencia física, vestimenta (ej: "Chaleco reflectante, casco") y actividad.
- Category: Usa "Personas" o "Staff".
- estimated_price: Devuelve siempre null.

Reglas para Objetos:
- Name: Nombre del objeto.
    - Description: Breve descripción técnica o visual.
    - Category: Categoría corta (1-2 palabras).
    - estimated_price: Valor numérico estimado o null. Busque el precio del objeto en internet o estime basado en su conocimiento.
    - currency_code: La moneda del precio encontrado.
    Si hay una MONEDA en el CONTEXTO (Target Currency), intenta estimar el precio en esa moneda, pero si encuentras una referencia mejor en USD/EUR, úsala y reporta la moneda correcta."""

            if "gemma" in self.model.lower():
                # Google/Gemma models often don't support 'system' role or "Developer instruction" on some endpoints.
                # We merge system prompt into user message.
                logger.info("Gemma model detected. Merging system prompt into user message.")
                messages = [
                    {
                        "role": "user",
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
            else:
                messages = [
                    {
                        "role": "system",
                        "content": system_prompt
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
                ]

            response = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=300,
                response_format={ "type": "json_object" }
            )
            content = response.choices[0].message.content
            usage = response.usage
            
            if user_id and usage:
                try:
                    monitoring_service.log_usage(
                        user_id=user_id,
                        task_type="OBJECT_DETECTION",
                        model_name=self.model,
                        prompt_tokens=usage.prompt_tokens,
                        completion_tokens=usage.completion_tokens,
                        status="SUCCESS",
                        input_image_url="[Blob Data]"
                    )
                except Exception as log_err:
                     logger.error(f"Failed to log usage: {log_err}")

            # Robust parsing for chatty models or markdown blocks
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                # Try to find JSON block code
                if "```json" in content:
                    import re
                    match = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
                    if match:
                        data = json.loads(match.group(1))
                    else:
                        raise ValueError("Could not extract JSON from markdown block")
                else:
                     # Try to find { ... } raw
                     start = content.find('{')
                     end = content.rfind('}')
                     if start != -1 and end != -1:
                         data = json.loads(content[start:end+1])
                     else:
                         raise
            
            return ItemExtracted(**data)

        except Exception as e:
            error_msg = str(e)
            if "No endpoints found that support image input" in error_msg:
                 logger.error(f"OpenRouter Error: Model '{self.model}' does not support vision or requires 'openai/' prefix.")
                 raise ValueError("Model Configuration Error: The selected model does not support images. If using OpenRouter with 'gpt-4o', try using 'openai/gpt-4o' in your environment variables.")
            raise ValueError(f"LLM Processing failed: {str(e)}")

    async def analyze_invoice(self, image_bytes: bytes, target_item_name: Optional[str] = None) -> Optional[float]:
        pass

    async def extract_invoice_data(self, image_bytes: bytes) -> List[InvoiceItem]:
        base64_image = self._encode_image(image_bytes)
        mime_type = self._get_mime_type(image_bytes)

        class InvoiceExtraction(BaseModel):
            items: List[InvoiceItem]

        client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        response = client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente contable. Extrae todos los ítems de la factura con su nombre y precio."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extrae los ítems de esta factura."},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}}
                    ],
                }
            ],
            response_format=InvoiceExtraction,
        )
        return response.choices[0].message.parsed.items

    async def identify_matches(self, pending_items: List, invoice_items: List[InvoiceItem]) -> List[MatchingResult]:
        inventory_context = [{"id": item.id, "name": item.name, "description": item.description} for item in pending_items]
        invoice_context = [{"raw_name": item.raw_name, "price": item.price} for item in invoice_items]

        class MatchList(BaseModel):
            matches: List[MatchingResult]

        client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        response = client.beta.chat.completions.parse(
            model=self.model,
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

    async def extract_data_with_reasoning(self, image_bytes: bytes, user_id: Optional[int] = None) -> InvoiceMatchResponse:
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
            
            usage = response.usage
            if user_id and usage:
                try:
                    monitoring_service.log_usage(
                         user_id=user_id,
                         task_type="INVOICE_MATCHING",
                         model_name=self.model,
                         prompt_tokens=usage.prompt_tokens,
                         completion_tokens=usage.completion_tokens,
                         status="SUCCESS",
                         input_image_url="[Invoice Blob]",
                         output_json=response.choices[0].message.content
                    )
                except Exception as log_err:
                     logger.error(f"Failed to log usage: {log_err}")

            return response.choices[0].message.parsed
            
        except Exception as e:
             if user_id:
                  monitoring_service.log_usage(user_id, "INVOICE_MATCHING", self.model, 0, 0, "FAILED")
             raise ValueError(f"LLM Processing failed: {str(e)}")

# Singleton or dependency injection helper
def get_llm_service():
    return LLMService()
