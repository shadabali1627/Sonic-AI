import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ChatService } from '@/lib/services/chat-service';
import { FileService } from '@/lib/services/file-service';
import { ObjectId } from 'mongodb';
import { GuardrailManager } from '@/lib/guardrails/guardrail-manager';
import { DEFAULT_GUARDRAIL_SETTINGS } from '@/lib/guardrails/types';

const chatService = new ChatService();

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username: payload.sub as string });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const message = formData.get('message') as string;
    const chatId = formData.get('chat_id') as string;
    const file = formData.get('file') as File | null;

    let imageBytes: Buffer | undefined;
    let contextText = "";

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { type, content } = await FileService.processFile(buffer, file.name);
      
      if (type === 'pdf' || type === 'text') {
        contextText = `Context from ${type.toUpperCase()}:\n${content}\n\n`;
      } else if (type === 'image') {
        imageBytes = buffer;
      } else if (type === 'binary') {
        contextText = `Attached file: ${content}\n\n`;
      }
    }

    const promptMessage = contextText + (message || "Explain this file or image.");

    // 3. Get or create Chat
    const chatsCollection = db.collection('chats');
    let chatObj: any;

    if (chatId) {
      chatObj = await chatsCollection.findOne({ 
        _id: new ObjectId(chatId), 
        user_id: user._id 
      });
      if (!chatObj) {
        return NextResponse.json({ detail: 'Chat not found' }, { status: 404 });
      }
    } else {
      const title = message ? (message.substring(0, 50) + (message.length > 50 ? "..." : "")) : "New Chat";
      const newChat = {
        user_id: user._id,
        title,
        messages: [],
        created_at: new Date(),
        updated_at: new Date()
      };
      const result = await chatsCollection.insertOne(newChat);
      chatObj = { ...newChat, _id: result.insertedId };
    }

    // 4. Run Guardrails Input Validation
    const guardrailSettings = user.guardrails || DEFAULT_GUARDRAIL_SETTINGS;
    const hasImage = !!file && file.type.startsWith('image/');
    
    const inputGuardrailResult = await GuardrailManager.validateInput(
      user._id,
      message,
      hasImage,
      guardrailSettings
    );

    if (!inputGuardrailResult.allowed) {
      const blockReason = inputGuardrailResult.reason || "Safety check violation.";
      
      // Save User Message
      const userMsg = { role: 'user', content: message || "[File Upload]", timestamp: new Date() };
      await chatsCollection.updateOne(
        { _id: chatObj._id },
        { 
          $push: { messages: userMsg as any },
          $set: { updated_at: new Date() }
        }
      );

      // Save blocked safety message
      const assistantMsg = { role: 'assistant', content: blockReason, timestamp: new Date(), isBlocked: true };
      await chatsCollection.updateOne(
        { _id: chatObj._id },
        { 
          $push: { messages: assistantMsg as any },
          $set: { updated_at: new Date() }
        }
      );

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(blockReason));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Chat-Id': chatObj._id.toString(),
          'X-Rate-Remaining': (inputGuardrailResult.rateLimitRemaining ?? 0).toString()
        }
      });
    }

    // Save User Message if allowed
    const userMsg = { role: 'user', content: message || "[File Upload]", timestamp: new Date() };
    await chatsCollection.updateOne(
      { _id: chatObj._id },
      { 
        $push: { messages: userMsg as any },
        $set: { updated_at: new Date() }
      }
    );

    // 5. Prepare Stream
    // Filter history: replace image messages with text summaries to avoid passing base64 to LLM
    const rawHistory = chatObj.messages.slice(-10);
    const history = rawHistory.map((msg: any) => {
      if (msg.type === 'image' && msg.role === 'assistant') {
        return { role: msg.role, content: `[Generated image from prompt: ${msg.content}]` };
      }
      return { role: msg.role, content: msg.content };
    });
    
    const routedModel = inputGuardrailResult.routedModel;
    const generator = chatService.generateResponse(promptMessage, imageBytes, history, routedModel);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of generator) {
            fullResponse += chunk;
            if (!guardrailSettings.outputValidation && !guardrailSettings.crossModelConsistency) {
              controller.enqueue(encoder.encode(chunk));
            }
          }

          // Run output guardrails on fully accumulated text
          if (guardrailSettings.outputValidation || guardrailSettings.crossModelConsistency) {
            const primaryProvider = routedModel?.provider || 'openrouter';
            const validatedResponse = await GuardrailManager.validateOutput(
              message,
              fullResponse,
              primaryProvider,
              guardrailSettings
            );
            fullResponse = validatedResponse;
            controller.enqueue(encoder.encode(validatedResponse));
          }
          
          // 6. Save Assistant Message after stream ends
          const assistantMsg = { role: 'assistant', content: fullResponse, timestamp: new Date() };
          await chatsCollection.updateOne(
            { _id: chatObj._id },
            { 
              $push: { messages: assistantMsg as any },
              $set: { updated_at: new Date() }
            }
          );
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Chat-Id': chatObj._id.toString(),
        'X-Rate-Remaining': (inputGuardrailResult.rateLimitRemaining ?? 30).toString()
      }
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
