from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.models.chat import Chat

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DATABASE_NAME], document_models=[User, Chat])
