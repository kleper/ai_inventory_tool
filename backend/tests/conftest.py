import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session, select
from sqlmodel.pool import StaticPool
from datetime import datetime, timezone
import json
import secrets

from app.main import app
from app.database import get_session
from app.models import User, InventoryGroup, Item, ApiKey, SharedAccess
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Use in-memory SQLite database for fast, isolated tests
TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="test_data")
def test_data_fixture(session: Session):
    """
    Creates two distinct users (User A and User B) with their API keys.
    """
    # User A (Owner)
    user_a = User(
        email="usera@example.com",
        name="User A",
        role="USER",
        status="ACTIVE"
    )
    session.add(user_a)

    # User B (Other User)
    user_b = User(
        email="userb@example.com",
        name="User B",
        role="USER",
        status="ACTIVE"
    )
    session.add(user_b)
    session.commit()
    session.refresh(user_a)
    session.refresh(user_b)

    # API Key for User A
    raw_key_a = f"sk_live_{secrets.token_urlsafe(32)}"
    prefix_a = raw_key_a[:16]
    key_hash_a = pwd_context.hash(raw_key_a)
    now = datetime.now(timezone.utc)
    api_key_a = ApiKey(
        user_id=user_a.id,
        prefix=prefix_a,
        key_hash=key_hash_a,
        label="User A Key",
        scopes='["read", "write"]',
        created_at=now
    )
    session.add(api_key_a)

    # API Key for User B
    raw_key_b = f"sk_live_{secrets.token_urlsafe(32)}"
    prefix_b = raw_key_b[:16]
    key_hash_b = pwd_context.hash(raw_key_b)
    api_key_b = ApiKey(
        user_id=user_b.id,
        prefix=prefix_b,
        key_hash=key_hash_b,
        label="User B Key",
        scopes='["read", "write"]',
        created_at=now
    )
    session.add(api_key_b)
    session.commit()

    return {
        "user_a": user_a,
        "user_b": user_b,
        "key_a": raw_key_a,
        "key_b": raw_key_b
    }
