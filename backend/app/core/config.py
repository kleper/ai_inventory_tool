from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    DOMAIN: str = "http://localhost:3000"
    
    # LLM
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o"
    LLM_BASE_URL: Optional[str] = None
    LLM_PROVIDER: str = "OPENAI" # OPENAI | GEMINI
    GEMINI_API_KEY: Optional[str] = None

    # Email
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 Days
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
