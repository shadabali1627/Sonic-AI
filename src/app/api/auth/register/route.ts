import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, createAccessToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { email, password, username } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ detail: 'Email and password are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if email exists
    const userExists = await usersCollection.findOne({ email });
    if (userExists) {
      return NextResponse.json({ detail: 'User with this email already exists' }, { status: 400 });
    }

    let finalUsername = username;
    if (!finalUsername) {
      const baseName = email.split('@')[0];
      const randomSuffix = uuidv4().substring(0, 4);
      finalUsername = `${baseName}_${randomSuffix}`;
    } else {
      const usernameExists = await usersCollection.findOne({ username: finalUsername });
      if (usernameExists) {
        return NextResponse.json({ detail: 'User with this username already exists' }, { status: 400 });
      }
    }

    const hashedPassword = hashPassword(password);
    const newUser = {
      email,
      username: finalUsername,
      hashed_password: hashedPassword,
      created_at: new Date(),
    };

    await usersCollection.insertOne(newUser);

    const accessToken = await createAccessToken(finalUsername);
    return NextResponse.json({ access_token: accessToken, token_type: 'bearer' });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
