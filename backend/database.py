from sqlmodel import SQLModel, create_engine, Session
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@db:5432/smartinventory")

engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    SQLModel.metadata.create_all(engine)
