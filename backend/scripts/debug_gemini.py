import asyncio
import httpx
from backend.app.core.config import settings

async def debug_gemini():
    api_key = settings.GEMINI_API_KEY
    # url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent"
    # url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent"
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemma-3n-e4b-it:streamGenerateContent"
    
    params = {"key": api_key}
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": "Hello"}]}]}
    
    print(f"POST {url}")
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, params=params, headers=headers, json=data, timeout=60.0) as response:
            print(f"Status: {response.status_code}")
            async for chunk in response.aiter_lines():
                print(f"Chunk: {chunk}")

if __name__ == "__main__":
    asyncio.run(debug_gemini())
