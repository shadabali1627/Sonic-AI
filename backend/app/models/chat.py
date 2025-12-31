from typing import List, Optional
from datetime import datetime
from beanie import Document, Link
from pydantic import BaseModel, Field
from backend.app.models.user import User

class Message(BaseModel):
    role: str # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Chat(Document):
    user_id: Link[User]
    title: str
    messages: List[Message] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chats"
