from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from typing import AsyncGenerator
from backend.app.core.config import settings

class ChatService:
    def __init__(self):
        # Text-only model (Gemma)
        self.text_model = ChatGoogleGenerativeAI(
            model="gemma-3n-e4b-it", # Proven working model for text
            google_api_key=settings.GEMINI_API_KEY,
            streaming=True,
            max_output_tokens=500,
            temperature=0.7
        )
        
        # Vision model (Gemma 3 12B IT)
        self.vision_model = ChatGoogleGenerativeAI(
            model="gemma-3-12b-it", 
            google_api_key=settings.GEMINI_API_KEY,
            streaming=True,
            max_output_tokens=500,
            temperature=0.7
        )

    async def generate_response(
        self, 
        message: str, 
        image_bytes: bytes = None, 
        audio_bytes: bytes = None,
        history: list = []
    ) -> AsyncGenerator[str, None]:
        
        # System Instruction
        # System Instruction: Voice-First Persona
        system_instruction = (
            "Role: You are Sonic AI, a professional Voice-First AI Assistant.\n\n"
            "Mobile UI Constraint: You are responding to a user on a narrow mobile interface. To prevent excessive vertical scrolling, you must follow these formatting rules:\n\n"
            "Extreme Brevity: Keep responses under 3 sentences whenever possible. Get to the point immediately.\n\n"
            "Paragraph Density: Avoid bullet points or numbered lists, as they create significant vertical 'dead space' on mobile. Use single, cohesive paragraphs instead.\n\n"
            "Information Scent: Use short, punchy words. Avoid 'filler' introductory phrases (e.g., 'I understand your request...').\n\n"
            "No Double Line Breaks: Do not use multiple returns between thoughts. Keep the text block compact.\n\n"
            "TTS-First: Ensure the text remains conversational and easy for a TTS engine to read without awkward pauses caused by formatting.\n\n"
            "Goal: Deliver high-value information that fits within a single mobile screen view without requiring the user to scroll."
        )
        
        messages_payload = []
        
        # Add History
        # Langchain Google GenAI expects a list of BaseMessage or dictionaries if using invoke, 
        # but astream accepts a list of messages.
        # We need to convert our history (list of dicts or objects) to Langchain Memory/Messages
        from langchain_core.messages import HumanMessage, AIMessage

        # Prepend system instruction
        # Ideally, we merge it into the first User message to avoid "System: ..." -> "Understood" issues with some models
        
        if history and history[0].role == "user":
            # Merge with first history item
            first_msg = history[0]
            merged_content = f"{system_instruction}\n\n{first_msg.content}"
            messages_payload.append(HumanMessage(content=merged_content))
            
            # Add rest of history
            for msg in history[1:]:
                if msg.role == "user":
                    messages_payload.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    messages_payload.append(AIMessage(content=msg.content))
        else:
            # No history or first message is not user (rare/impossible if logic is correct)
            # Just append system instruction as first message
            messages_payload.append(HumanMessage(content=system_instruction))
            
            for msg in history:
                 if msg.role == "user":
                    messages_payload.append(HumanMessage(content=msg.content))
                 elif msg.role == "assistant":
                    messages_payload.append(AIMessage(content=msg.content))

        # Current Message
        content = [{"type": "text", "text": message}]
        
        if image_bytes:
             import base64
             b64_img = base64.b64encode(image_bytes).decode('utf-8')
             content.append({
                 "type": "image_url",
                 "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}
             })

        messages_payload.append(HumanMessage(content=content))

        # Adjust parameters for conciseness
        # We can pass config to astream or bind
        # Select Model
        if image_bytes:
            selected_llm = self.vision_model
            # Vision model needs specific content structure
            # content variable already prepared with image_url above
        else:
            selected_llm = self.text_model
            # Gemma/Text-only models might prefer simple string or list of messages without image_url blocks
            # But Langchain handles this adaptations usually. 
            # If image_bytes is None, 'content' is [{"type": "text", "text": message}]
            # which works for text models too.

        # Stream response
        try:
            async for chunk in self._stream_with_retry(selected_llm, messages_payload):
                if chunk.content:
                    yield chunk.content
        except Exception as e:
            import logging
            logging.error(f"AI Generation Failed after retries: {e}")
            yield "I apologize, but I'm currently unable to connect to the AI service. Please try again in a moment."

    from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

    # Retry logic: 3 attempts, exponential backoff starting at 1s, max 10s
    @retry(
        stop=stop_after_attempt(3), 
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    async def _stream_with_retry(self, llm, messages):
        # Enforce 30s timeout for the stream to start/complete chunks
        # Note: wrapping the entire generator in wait_for is tricky.
        # Ideally, we put the timeout on the *connection*.
        # Simple approach for "crash proof":
        try:
            async for chunk in llm.astream(messages):
                yield chunk
        except Exception as e:
            # Log and re-raise so tenacity catches it
            raise e
