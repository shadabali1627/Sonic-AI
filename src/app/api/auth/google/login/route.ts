import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'login';

    const clientID = process.env.GOOGLE_CLIENT_ID;
    if (!clientID) {
      console.error('Google OAuth client ID is missing in environment variables');
      return NextResponse.json({ detail: 'Google OAuth Client ID is not configured' }, { status: 500 });
    }

    const origin = req.nextUrl.origin;
    const redirectURI = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    // Construct the Google OAuth2 authorization URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.append('client_id', clientID);
    googleAuthUrl.searchParams.append('redirect_uri', redirectURI);
    googleAuthUrl.searchParams.append('response_type', 'code');
    googleAuthUrl.searchParams.append('scope', 'openid email profile');
    googleAuthUrl.searchParams.append('state', action);

    // Redirect the browser to Google OAuth consent page
    return NextResponse.redirect(googleAuthUrl.toString());
  } catch (error: any) {
    console.error('Google Auth Login error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
