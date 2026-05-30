import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ImageGenerationService } from '@/lib/services/image-generation-service';
import { CloudinaryService } from '@/lib/services/cloudinary-service';
import { ObjectId } from 'mongodb';

const imageService = new ImageGenerationService();
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

    // 2. Parse JSON body
    const body = await req.json();
    const { prompt, chat_id } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ detail: 'Prompt is required' }, { status: 400 });
    }

    // 3. Get or create Chat
    const chatsCollection = db.collection('chats');
    let chatObj: any;

    if (chat_id) {
      chatObj = await chatsCollection.findOne({
        _id: new ObjectId(chat_id),
        user_id: user._id,
      });
      if (!chatObj) {
        return NextResponse.json({ detail: 'Chat not found' }, { status: 404 });
      }
    } else {
      const title = `🖼️ ${prompt.substring(0, 45)}${prompt.length > 45 ? '...' : ''}`;
      const newChat = {
        user_id: user._id,
        title,
        messages: [],
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = await chatsCollection.insertOne(newChat);
      chatObj = { ...newChat, _id: result.insertedId };
    }

    // 4. Save User Message
    const userMsg = {
      role: 'user',
      content: prompt,
      type: 'text',
      timestamp: new Date(),
    };
    await chatsCollection.updateOne(
      { _id: chatObj._id },
      {
        $push: { messages: userMsg as any },
        $set: { updated_at: new Date() },
      }
    );

    // 5. Generate Image
    try {
      const { imageBase64 } = await imageService.generateImage(prompt);

      // Upload generated image to Cloudinary
      const cloudinaryUrl = await cloudinaryService.uploadImage(imageBase64);

      // 6. Save Assistant Message with image
      const assistantMsg = {
        role: 'assistant',
        content: prompt, // Store the original prompt as content/caption
        type: 'image',
        image_url: cloudinaryUrl,
        timestamp: new Date(),
      };
      await chatsCollection.updateOne(
        { _id: chatObj._id },
        {
          $push: { messages: assistantMsg as any },
          $set: { updated_at: new Date() },
        }
      );

      return NextResponse.json({
        image_url: cloudinaryUrl,
        chat_id: chatObj._id.toString(),
        prompt: prompt,
      });
    } catch (genError: any) {
      console.error('Image generation error:', genError);

      // Save an error message as assistant response
      const errorMsg = {
        role: 'assistant',
        content: `Sorry, I couldn't generate that image. ${genError.message || 'Please try again.'}`,
        type: 'text',
        timestamp: new Date(),
      };
      await chatsCollection.updateOne(
        { _id: chatObj._id },
        {
          $push: { messages: errorMsg as any },
          $set: { updated_at: new Date() },
        }
      );

      return NextResponse.json(
        {
          detail: genError.message || 'Image generation failed',
          chat_id: chatObj._id.toString(),
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Generate image route error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
