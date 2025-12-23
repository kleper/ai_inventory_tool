from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="SmartInventory API")

class Item(BaseModel):
    nombre: str
    descripcion: str
    categoria: str
    precio: float

@app.get("/")
def read_root():
    return {"message": "SmartInventory API is running"}

@app.post("/process-object", response_model=Item)
async def process_object(file: UploadFile = File(...)):
    # Mock data return
    return {
        "nombre": "Mock Object",
        "descripcion": "This is a mock description for an object found in the image.",
        "categoria": "Electronics",
        "precio": 99.99
    }

@app.post("/process-invoice", response_model=Item)
async def process_invoice(file: UploadFile = File(...)):
    # Mock data return
    return {
        "nombre": "Mock Invoice Item",
        "descripcion": "This is a mock description extracted from the invoice.",
        "categoria": "Office Supplies",
        "precio": 45.50
    }
