import asyncio
from backend.app.services.chat_service import ChatService

async def test_gemini():
    print("Testing Gemini API...")
    chat_service = ChatService()
    # print(f"Using API Key: {chat_service.api_key[:5]}...{chat_service.api_key[-5:] if chat_service.api_key else 'None'}")
    
    response_stream = chat_service.generate_response("Hello, say 'Gemini is working' if you can hear me.")
    
    print("\n--- Response ---")
    async for chunk in response_stream:
        print(chunk, end="", flush=True)
    print("\n----------------")

if __name__ == "__main__":
    asyncio.run(test_gemini())
