import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(
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

    if (!chat) {
      return NextResponse.json({ detail: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(chat);

  } catch (error: any) {
    console.error('Get chat error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username: payload.sub as string });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const title = formData.get('title') as string;

    const chatsCollection = db.collection('chats');
    const result = await chatsCollection.findOneAndUpdate(
      { _id: new ObjectId(id), user_id: user._id },
      { $set: { title, updated_at: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ detail: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Update chat error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username: payload.sub as string });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const chatsCollection = db.collection('chats');
    const result = await chatsCollection.deleteOne({ 
      _id: new ObjectId(id),
      user_id: user._id 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ detail: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ detail: 'Chat deleted successfully' });

  } catch (error: any) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
