from fastapi import UploadFile
import base64
from openai import OpenAI
from pydantic import BaseModel
from typing import Optional
import os

# Definimos la estructura que queremos recibir
class ItemExtracted(BaseModel):
    name: str
    description: str
    category: str
    estimated_price: Optional[float] = None

class LLMService:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)

    async def analyze_object(self, image_bytes: bytes) -> ItemExtracted:
        # Convertir imagen a base64 para el LLM
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        response = self.client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Eres un experto en inventarios. Identifica el objeto en la foto y extrae datos concisos."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe este objeto para un inventario."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ],
                }
            ],
            response_format=ItemExtracted,
        )
        return response.choices[0].message.parsed

    async def analyze_invoice(self, image_bytes: bytes, target_item_name: Optional[str] = None) -> Optional[float]:
        # Convertir imagen a base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        prompt = "Analiza esta factura."
        if target_item_name:
            prompt += f" Busca el precio del ítem '{target_item_name}' o similar. Devuelve SOLO el número (float) del precio unitario. Si no lo encuentras, devuelve null."
        
        # Nota: Para outputs simples como un float, podemos usar structured outputs con un wrapper
        class PriceExtraction(BaseModel):
            price: Optional[float]

        response = self.client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente contable experto en extracción de datos de facturas."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ],
                }
            ],
            response_format=PriceExtraction,
        )
        return response.choices[0].message.parsed.price

# Singleton or dependency injection helper
def get_llm_service():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return LLMService(api_key=api_key)
