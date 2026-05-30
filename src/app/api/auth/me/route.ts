import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ username: payload.sub as string });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    // Don't return password
    const { hashed_password, ...userWithoutPassword } = user;
    
    if (!userWithoutPassword.guardrails) {
      userWithoutPassword.guardrails = {
        inputValidation: true,
        topicEnforcement: true,
        modelRouting: true,
        outputValidation: true,
        rateLimiting: true,
        crossModelConsistency: false,
        routerStrategy: 'auto'
      };
    }
    if (userWithoutPassword.bio === undefined) {
      userWithoutPassword.bio = '';
    }

    return NextResponse.json(userWithoutPassword);


  } catch (error: any) {
    console.error('Auth Me error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
