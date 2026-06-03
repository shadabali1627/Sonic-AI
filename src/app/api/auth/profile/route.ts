import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken, createAccessToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    if (!payload || !payload.sub) {
      return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
    }

    const { username, bio, guardrails, contextMessageLimit } = await req.json();

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const currentUser = await usersCollection.findOne({ username: payload.sub as string });
    if (!currentUser) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const updateFields: any = {};
    
    if (bio !== undefined) {
      updateFields.bio = bio;
    }
    
    if (guardrails !== undefined) {
      updateFields.guardrails = guardrails;
    }

    if (contextMessageLimit !== undefined) {
      updateFields.contextMessageLimit = contextMessageLimit;
    }

    let newToken: string | undefined;

    if (username && username !== currentUser.username) {
      // Check if username conflicts
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        return NextResponse.json({ detail: 'Username already taken' }, { status: 400 });
      }
      updateFields.username = username;
      // Since token subject is username, we need to issue a new token
      newToken = await createAccessToken(username);
    }

    await usersCollection.updateOne(
      { _id: currentUser._id },
      { $set: updateFields }
    );

    const updatedUser = await usersCollection.findOne({ _id: currentUser._id });
    const { hashed_password, ...userWithoutPassword } = updatedUser!;

    return NextResponse.json({
      user: userWithoutPassword,
      access_token: newToken
    });

  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
export async function PUT(req: NextRequest) {
  return POST(req);
}
