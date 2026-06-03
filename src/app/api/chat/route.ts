import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ChatService } from '@/lib/services/chat-service';
import { FileService } from '@/lib/services/file-service';
import { ObjectId } from 'mongodb';
import { GuardrailManager, OutputValidator } from '@/lib/guardrails/guardrail-manager';
import { DEFAULT_GUARDRAIL_SETTINGS } from '@/lib/guardrails/types';
import { CloudinaryService } from '@/lib/services/cloudinary-service';

const chatService = new ChatService();
const cloudinaryService = new CloudinaryService();

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
    let cloudinaryUrl = "";

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

      // Upload file to Cloudinary in the background
      try {
        const base64DataUri = `data:${file.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
        cloudinaryUrl = await cloudinaryService.uploadFile(base64DataUri);
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
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
    const userMsg: any = { role: 'user', content: message || "[File Upload]", timestamp: new Date() };
    if (cloudinaryUrl && file) {
      userMsg.attachments = [
        {
          url: cloudinaryUrl,
          type: file.type || 'application/octet-stream',
          name: file.name
        }
      ];
    }
    await chatsCollection.updateOne(
      { _id: chatObj._id },
      { 
        $push: { messages: userMsg as any },
        $set: { updated_at: new Date() }
      }
    );

    // 5. Prepare Stream
    // Filter history: replace image messages with text summaries to avoid passing base64 to LLM
    const limit = user.contextMessageLimit !== undefined ? user.contextMessageLimit : 10;
    const rawHistory = chatObj.messages.slice(-limit);
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
        let sentLength = 0;

        // Start topic validation concurrently in the background if it exists
        let topicAllowed = true;
        let topicReason = "";
        let topicChecked = false;
        const topicPromise = inputGuardrailResult.topicPromise;

        const checkTopic = async () => {
          if (topicPromise && !topicChecked) {
            try {
              const res = await topicPromise;
              topicAllowed = res.allowed;
              topicReason = res.reason || "Safety check violation.";
            } catch (e) {
              console.error("Topic verification error:", e);
            }
            topicChecked = true;
          }
        };

        try {
          for await (const chunk of generator) {
            if (req.signal.aborted) {
              console.log("Client aborted request, stopping stream generator");
              break;
            }

            // Await the topic check concurrently on the first chunk or before streaming
            if (!topicChecked) {
              await checkTopic();
              if (!topicAllowed) {
                controller.enqueue(encoder.encode(topicReason));
                fullResponse = topicReason;
                break;
              }
            }

            fullResponse += chunk;
            
            // Strip <think> tags dynamically
            let cleanResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/gi, '');
            const openThinkMatch = cleanResponse.match(/<think>(?!.*<\/think>)/i);
            if (openThinkMatch) {
                cleanResponse = cleanResponse.substring(0, openThinkMatch.index);
            }
            
            // If crossModelConsistency is active, we MUST block streaming because we require the complete response for auditing.
            if (guardrailSettings.crossModelConsistency) {
              continue;
            }

            if (guardrailSettings.outputValidation) {
              // Perform fast incremental validation/redaction
              const validationResult = OutputValidator.validate(cleanResponse);
              const validatedText = validationResult.sanitizedContent || cleanResponse;
              
              if (validatedText.length > sentLength) {
                const diff = validatedText.slice(sentLength);
                try {
                  controller.enqueue(encoder.encode(diff));
                } catch (err) {
                  console.log("Stream closed by client during enqueue");
                  break;
                }
                sentLength = validatedText.length;
              }
            } else {
              if (cleanResponse.length > sentLength) {
                const diff = cleanResponse.slice(sentLength);
                try {
                  controller.enqueue(encoder.encode(diff));
                } catch (err) {
                  console.log("Stream closed by client during enqueue");
                  break;
                }
                sentLength = cleanResponse.length;
              }
            }
          }

          // Await topic verification if generator returned empty or early
          if (!topicChecked) {
            await checkTopic();
            if (!topicAllowed) {
              controller.enqueue(encoder.encode(topicReason));
              fullResponse = topicReason;
            }
          }

          if (!topicAllowed) {
            // Save blocked safety message after stream ends
            const assistantMsg = { role: 'assistant', content: topicReason, timestamp: new Date(), isBlocked: true };
            await chatsCollection.updateOne(
              { _id: chatObj._id },
              { 
                $push: { messages: assistantMsg as any },
                $set: { updated_at: new Date() }
              }
            );
            return;
          }

          // Strip <think> tags from the final response before saving
          fullResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/gi, '');
          const openThinkMatchFinal = fullResponse.match(/<think>(?!.*<\/think>)/i);
          if (openThinkMatchFinal) {
              fullResponse = fullResponse.substring(0, openThinkMatchFinal.index);
          }

          // Run output guardrails on fully accumulated text
          if (guardrailSettings.crossModelConsistency) {
            const primaryModelId = routedModel?.modelId || 'google/gemma-2-27b-it:free';
            const validatedResponse = await GuardrailManager.validateOutput(
              message,
              fullResponse,
              primaryModelId,
              guardrailSettings
            );

            fullResponse = validatedResponse;
            controller.enqueue(encoder.encode(validatedResponse));
          } else if (guardrailSettings.outputValidation) {
            // Apply final output validation check to synchronize any last characters/safety overrides
            const validationResult = OutputValidator.validate(fullResponse);
            fullResponse = validationResult.sanitizedContent || fullResponse;
            if (fullResponse.length > sentLength) {
              controller.enqueue(encoder.encode(fullResponse.slice(sentLength)));
            }
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
