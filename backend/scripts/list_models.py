import asyncio
import httpx
from app.core.config import settings

async def list_models():
    api_key = settings.GEMINI_API_KEY
    url = "https://generativelanguage.googleapis.com/v1beta/models"
    params = {"key": api_key}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        print(response.status_code)
        if response.status_code == 200:
            models = response.json()
            for m in models.get('models', []):
                if 'generateContent' in m.get('supportedGenerationMethods', []):
                    print(f"Name: {m['name']}")
        else:
            print(response.text)

if __name__ == "__main__":
    asyncio.run(list_models())
