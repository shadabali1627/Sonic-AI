import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, new_password } = await req.json();

    if (!email || !new_password) {
      return NextResponse.json({ detail: 'Email and new password are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
    }

    const hashedPassword = hashPassword(new_password);

    await usersCollection.updateOne(
      { email },
      { $set: { hashed_password: hashedPassword, updated_at: new Date() } }
    );

    return NextResponse.json({ detail: 'Password reset successfully.' });
  } catch (error: any) {
    console.error('Reset password direct error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
