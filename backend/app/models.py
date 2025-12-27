from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint

class SharedAccess(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "group_id", name="unique_group_member"),)
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    group_id: int = Field(foreign_key="inventorygroup.id")
    role: str = Field(default="VIEWER") # VIEWER, EDITOR
    created_at: datetime = Field(default_factory=datetime.utcnow) # New field

    # Relationships slightly helpful
    user: "User" = Relationship()
    group: "InventoryGroup" = Relationship()

class InventoryGroupBase(SQLModel):
    name: str
    owner_id: int = Field(foreign_key="user.id")

class InventoryGroup(InventoryGroupBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    owner: "User" = Relationship(back_populates="owned_groups")
    items: List["Item"] = Relationship(back_populates="group")
    # Using a link model for shared access could be done, 
    # but SharedAccess as a model allows storing permission level.
    # We can access shares via specific queries.

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: Optional[str] = None
    image: Optional[str] = None
    
    # Auth & SaaS
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    auth_provider: str = Field(default="EMAIL") # GOOGLE, EMAIL
    force_password_change: bool = Field(default=False)
    role: str = Field(default="USER") # ADMIN, USER
    status: str = Field(default="ACTIVE") # INVITED, ACTIVE, BANNED
    monthly_token_limit: int = Field(default=100000)
    
    # Relationships
    items: List["Item"] = Relationship(back_populates="user")
    invoices: List["Invoice"] = Relationship(back_populates="user")
    owned_groups: List["InventoryGroup"] = Relationship(back_populates="owner")
    invitations_created: List["Invitation"] = Relationship(back_populates="creator")
    ai_logs: List["AIUsageLog"] = Relationship(back_populates="user")

class AIUsageLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    task_type: str # OBJECT_DETECTION, INVOICE_MATCHING
    model_name: str
    prompt_tokens: int
    completion_tokens: int
    cost: float
    status: str # SUCCESS, FAILED
    input_image_url: Optional[str] = None # For Audit
    output_json: Optional[str] = None # For Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: Optional[User] = Relationship(back_populates="ai_logs")

class Invitation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    token: str = Field(unique=True, index=True)
    status: str = Field(default="PENDING") # PENDING, USED, EXPIRED
    created_by: int = Field(foreign_key="user.id")
    expires_at: datetime
    
    creator: Optional[User] = Relationship(back_populates="invitations_created")

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
    quantity: int = Field(default=1)
    image_url: Optional[str] = None
    status: str = Field(default="pending_price") # pending_price, completed, needs_review
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Ownership (Legacy/Direct)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="items")
    
    # Group ownership (SaaS)
    group_id: Optional[int] = Field(default=None, foreign_key="inventorygroup.id")
    group: Optional[InventoryGroup] = Relationship(back_populates="items")

    invoice_id: Optional[int] = Field(default=None, foreign_key="invoice.id")
    invoice: Optional[Invoice] = Relationship(back_populates="items")
