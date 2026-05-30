import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyPassword, createAccessToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    let username = '';
    let password = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      username = formData.get('username') as string;
      password = formData.get('password') as string;
    } else {
      const body = await req.json();
      username = body.username || body.email;
      password = body.password;
    }

    if (!username || !password) {
      return NextResponse.json({ detail: 'Username and password are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Find by email or username
    let user = await usersCollection.findOne({ email: username });
    if (!user) {
      user = await usersCollection.findOne({ username });
    }

    if (!user || !verifyPassword(password, user.hashed_password)) {
      return NextResponse.json({ detail: 'Incorrect email or password' }, { status: 401 });
    }

    const accessToken = await createAccessToken(user.username);
    return NextResponse.json({ access_token: accessToken, token_type: 'bearer' });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
