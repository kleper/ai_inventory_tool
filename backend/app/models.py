from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: Optional[str] = None
    image: Optional[str] = None
    
    items: List["Item"] = Relationship(back_populates="user")
    invoices: List["Invoice"] = Relationship(back_populates="user")

class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    raw_text: Optional[str] = None
    file_url: str
    total_amount: Optional[float] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="invoices")
    items: List["Item"] = Relationship(back_populates="invoice")
    status: str = Field(default="processing") # processing, completed, failed

class Item(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    status: str = Field(default="pending_price") # pending_price, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="items")

    invoice_id: Optional[int] = Field(default=None, foreign_key="invoice.id")
    invoice: Optional[Invoice] = Relationship(back_populates="items")
