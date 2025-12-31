from typing import Optional
from beanie import Document
from pydantic import EmailStr, Field
from datetime import datetime

class User(Document):
    username: str = Field(..., unique=True)
    email: EmailStr = Field(..., unique=True)
    hashed_password: str
    reset_token: Optional[str] = None
    reset_token_expire: Optional[datetime] = None


    class Settings:
        name = "users"
