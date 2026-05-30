import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ChatService } from '@/lib/services/chat-service';
import { ImageGenerationService } from '@/lib/services/image-generation-service';
import { CloudinaryService } from '@/lib/services/cloudinary-service';
import { ObjectId } from 'mongodb';
import { GuardrailManager, ModelRouter, RateLimiter } from '@/lib/guardrails/guardrail-manager';
import { DEFAULT_GUARDRAIL_SETTINGS } from '@/lib/guardrails/types';

const chatService = new ChatService();
const imageService = new ImageGenerationService();
const cloudinaryService = new CloudinaryService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { image_mode } = body;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username: payload.sub as string });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const chatsCollection = db.collection('chats');
    const chat = await chatsCollection.findOne({ 
      _id: new ObjectId(id),
      user_id: user._id 
    });

    if (!chat || !chat.messages || chat.messages.length === 0) {
      return NextResponse.json({ detail: 'Chat or messages not found' }, { status: 404 });
    }

    // Remove last assistant message if it exists
    let messages = [...chat.messages];
    if (messages[messages.length - 1].role === 'assistant') {
      messages.pop();
    }

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ detail: 'No user message to regenerate from' }, { status: 400 });
    }

    const lastUserMsg = messages[messages.length - 1];
    
    // Update DB (remove last assistant message permanently)
    await chatsCollection.updateOne(
      { _id: chat._id },
      { $set: { messages, updated_at: new Date() } }
    );

    if (image_mode) {
      try {
        const { imageBase64 } = await imageService.generateImage(lastUserMsg.content);

        // Upload generated image to Cloudinary
        const cloudinaryUrl = await cloudinaryService.uploadImage(imageBase64);

        const assistantMsg = { 
          role: 'assistant', 
          content: lastUserMsg.content, 
          type: 'image',
          image_url: cloudinaryUrl,
          timestamp: new Date() 
        };

        await chatsCollection.updateOne(
          { _id: chat._id },
          { 
            $push: { messages: assistantMsg as any },
            $set: { updated_at: new Date() }
          }
        );

        return NextResponse.json({
          image_url: cloudinaryUrl,
          chat_id: chat._id.toString(),
          prompt: lastUserMsg.content
        });
      } catch (genError: any) {
        console.error('Image regeneration error:', genError);

        const errorMsg = {
          role: 'assistant',
          content: `Sorry, I couldn't generate that image. ${genError.message || 'Please try again.'}`,
          type: 'text',
          timestamp: new Date()
        };

        await chatsCollection.updateOne(
          { _id: chat._id },
          {
            $push: { messages: errorMsg as any },
            $set: { updated_at: new Date() }
          }
        );

        return NextResponse.json(
          { detail: genError.message || 'Image generation failed' },
          { status: 502 }
        );
      }
    }

    const guardrailSettings = user.guardrails || DEFAULT_GUARDRAIL_SETTINGS;

    // Rate Limiting check for regeneration
    if (guardrailSettings.rateLimiting) {
      const rateResult = await RateLimiter.limit(user._id);
      if (!rateResult.allowed) {
        const blockReason = rateResult.reason || "Rate limit exceeded.";
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
            'X-Chat-Id': chat._id.toString()
          }
        });
      }
    }

    const routedModel = ModelRouter.route(lastUserMsg.content, false, guardrailSettings.routerStrategy);
    const history = messages.slice(-10);
    const generator = chatService.generateResponse(lastUserMsg.content, undefined, history, routedModel);

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
              lastUserMsg.content,
              fullResponse,
              primaryProvider,
              guardrailSettings
            );
            fullResponse = validatedResponse;
            controller.enqueue(encoder.encode(validatedResponse));
          }
          
          const assistantMsg = { role: 'assistant', content: fullResponse, timestamp: new Date() };
          await chatsCollection.updateOne(
            { _id: chat._id },
            { 
              $push: { messages: assistantMsg as any },
              $set: { updated_at: new Date() }
            }
          );
        } catch (e) {
          console.error("Regenerate stream error:", e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Chat-Id': chat._id.toString()
      }
    });

  } catch (error: any) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
