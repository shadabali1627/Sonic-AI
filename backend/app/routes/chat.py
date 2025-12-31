from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from backend.app.services.chat_service import ChatService
from backend.app.services.file_service import FileService
from backend.app.routes.auth import get_current_user
from backend.app.models.user import User

router = APIRouter()
chat_service = ChatService()

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional, List
from backend.app.services.chat_service import ChatService
from backend.app.services.file_service import FileService
from backend.app.routes.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.chat import Chat, Message
from beanie import PydanticObjectId
import asyncio

router = APIRouter()
chat_service = ChatService()

@router.get("/chats", response_model=List[Chat])
async def get_chats(
    current_user: User = Depends(get_current_user)
):
    """
    Get all chats for the current user, sorted by updated_at desc.
    """
    chats = await Chat.find(Chat.user_id.id == current_user.id).sort(-Chat.updated_at).to_list()
    return chats

@router.get("/chat/{chat_id}", response_model=Chat)
async def get_chat(
    chat_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific chat by ID.
    """
    chat = await Chat.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check ownership
    # Beanie Link field access without fetching
    if chat.user_id.ref.id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.post("/chat")
async def chat(
    message: Optional[str] = Form(None),
    chat_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    """
    Chat endpoint capable of handling text and optional file (image/audio).
    Persists chat history.
    """
    image_bytes = None
    audio_bytes = None
    context_text = ""

    if file:
        file_type, content, raw_bytes = await FileService.process_file(file)
        if file_type == "pdf":
            context_text = f"Context from PDF:\n{content}\n\n"
        elif file_type == "text":
             context_text = f"Context from File:\n{content}\n\n"
        elif file_type == "image":
            image_bytes = raw_bytes
        elif file_type == "audio":
            audio_bytes = raw_bytes
        elif file_type == "binary":
            context_text = f"Attached file: {content}\n\n"

    if not message and file:
        message = "Explain this file or image."
    elif not message:
        message = "Hello." # Default if no message and no file? Should not happen due to frontend check.

    full_message = context_text + message
    
    # Get or create chat
    if chat_id:
        chat_obj = await Chat.get(PydanticObjectId(chat_id))
        if not chat_obj:
             raise HTTPException(status_code=404, detail="Chat not found")
        if chat_obj.user_id.ref.id != current_user.id:
            raise HTTPException(status_code=404, detail="Chat not found")
    else:
        # Create new chat with generated title
        title = message[:50] + "..." if len(message) > 50 else message
        chat_obj = Chat(user_id=current_user, title=title)
        await chat_obj.insert()
    
    # Add user message
    user_msg = Message(role="user", content=message) # We store original message, not full context with PDF text for display?
    # Ideally we store what user said. PDF context is ephemeral or we store file reference. 
    # For this MVP, let's store the message text.
    chat_obj.messages.append(user_msg)
    await chat_obj.save()

    async def response_stream():
        full_response = ""
        # Yield the chat_id first as a special event or just part of stream?
        # Standard SSE usually just data. 
        # Let's send a custom JSON event first needed? 
        # Or simpler: client handles chat creation if no ID returned, but streaming response makes headers hard.
        # We will stream the text. Client should refresh chat list or we use a header.
        # Actually easier: Client sends a new chat request, gets a stream. 
        # Ideally we return the chat ID in a header.
        
        # Prepare History
        # We limit to last 10 messages to keep context relevant and avoid hitting limits too fast
        history_msgs = []
        if chat_obj and chat_obj.messages:
             # Exclude the very last one which we just added (the new user message)
             # Wait, we appended the new user message at line 97.
             # So we should take messages excluding the last one?
             # Actually `chat_service` expects history BEFORE the current message.
             # Logic at line 97: `chat_obj.messages.append(user_msg)`
             # So `chat_obj.messages` includes the current message.
             # We should slicing: chat_obj.messages[:-1]
             # Let's be safe.
             
             # Slice last 10 before the current one
             all_prev_msgs = chat_obj.messages[:-1] 
             recent_msgs = all_prev_msgs[-10:] if all_prev_msgs else []
             history_msgs = recent_msgs

        async for chunk in chat_service.generate_response(full_message, image_bytes, audio_bytes, history=history_msgs):
            full_response += chunk
            yield chunk
        
        # Save assistant message
        assistant_msg = Message(role="assistant", content=full_response)
        chat_obj.messages.append(assistant_msg)
        chat_obj.updated_at = datetime.utcnow()
        await chat_obj.save()

    # We can use headers to return the Chat-Id
    return StreamingResponse(
        response_stream(),
        media_type="text/event-stream",
        headers={"X-Chat-Id": str(chat_obj.id)}
    )

@router.patch("/chat/{chat_id}", response_model=Chat)
async def update_chat(
    chat_id: PydanticObjectId,
    title: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Update chat details (e.g. title).
    """
    chat = await Chat.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat.user_id.ref.id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat.title = title
    chat.updated_at = datetime.utcnow()
    await chat.save()
    
    return chat

@router.post("/regenerate/{chat_id}")
async def regenerate_response(
    chat_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """
    Regenerate the last assistant response.
    Removes the last assistant message and re-runs generation with the previous user message.
    """
    chat = await Chat.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat.user_id.ref.id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    if not chat.messages:
        raise HTTPException(status_code=400, detail="Chat history is empty")
        
    # Check if last message is from assistant
    last_msg = chat.messages[-1]
    if last_msg.role == "assistant":
        # Remove it
        chat.messages.pop()
        await chat.save()
    elif last_msg.role == "user":
        # If last is user, we just respond to it (maybe a retry case)
        pass 
    
    # Now get the user message to respond to
    if not chat.messages or chat.messages[-1].role != "user":
        # Should not happen if flow is correct, but let's be safe
        # Maybe user deleted the prompt?
        raise HTTPException(status_code=400, detail="No user message found to regenerate response for")
        
    last_user_msg = chat.messages[-1]
    
    # Prepare context
    # We want to use the full conversation history up to this point
    # excluding the last user message itself?
    # ChatService.generate_response expects the message content separate from history?
    # Let's check call signature: generate_response(message, image_bytes, audio_bytes, history)
    # History should be previous messages.
    
    history_msgs = chat.messages[:-1] # All except the last user message
    recent_history = history_msgs[-10:] if history_msgs else []
    
    message_content = last_user_msg.content
    
    # Streaming response
    async def response_stream():
        full_response = ""
        # We might need to handle images again if the original message had one?
        # For now, MVP assumes text regeneration or that the context handles it?
        # Our Message model doesn't seem to store the raw image bytes, only text content?
        # In /chat, we process file -> text/bytes. 
        # If we stored "Context from File: ..." in the message content, then `message_content` has it.
        # So we just pass it as text.
        
        async for chunk in chat_service.generate_response(message_content, history=recent_history):
            full_response += chunk
            yield chunk
            
        # Save new assistant message
        assistant_msg = Message(role="assistant", content=full_response)
        chat.messages.append(assistant_msg)
        chat.updated_at = datetime.utcnow()
        await chat.save()

    return StreamingResponse(
        response_stream(),
        media_type="text/event-stream",
         headers={"X-Chat-Id": str(chat.id)}
    )

from datetime import datetime
