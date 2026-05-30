import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ detail: 'Email is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ detail: 'Email verified successfully.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
