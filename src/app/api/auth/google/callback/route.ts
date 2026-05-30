import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { createAccessToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || 'login'; // 'login' or 'signup'
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth redirect error:', error);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=Google+authorization+failed', req.url));
    }

    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientID || !clientSecret) {
      console.error('Google OAuth environment variables are missing');
      return NextResponse.redirect(new URL('/login?error=Google+auth+not+configured', req.url));
    }

    const origin = req.nextUrl.origin;
    const redirectURI = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: redirectURI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Failed to exchange authorization code:', errText);
      return NextResponse.redirect(new URL('/login?error=Google+token+exchange+failed', req.url));
    }

    const tokens = await tokenResponse.json();
    const { access_token } = tokens;

    // Fetch user profile information using access token
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userinfoResponse.ok) {
      console.error('Failed to fetch userinfo from Google');
      return NextResponse.redirect(new URL('/login?error=Failed+to+get+user+profile', req.url));
    }

    const profile = await userinfoResponse.json();
    const email = profile.email;

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=No+email+associated+with+Google+account', req.url));
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Find if user exists with this email
    let user: any = await usersCollection.findOne({ email });

    if (!user) {
      // If we are strict about signup vs login state:
      // However, typical oauth allows sign-in button to also register users.
      // Let's create the user if not exists.
      const baseName = email.split('@')[0];
      const randomSuffix = uuidv4().substring(0, 4);
      const username = `${baseName}_${randomSuffix}`;

      const newUser = {
        email,
        username,
        created_at: new Date(),
        google_user: true, // Mark user as signed in with Google
      };

      await usersCollection.insertOne(newUser);
      user = newUser;
    }

    // Generate JWT access token for the session
    const systemToken = await createAccessToken(user.username);

    // Redirect to the frontend callback handler with the system JWT
    return NextResponse.redirect(new URL(`/callback?token=${encodeURIComponent(systemToken)}`, req.url));

  } catch (err: any) {
    console.error('Google OAuth Callback error:', err);
    return NextResponse.redirect(new URL('/login?error=Google+authentication+failed+internally', req.url));
  }
}
