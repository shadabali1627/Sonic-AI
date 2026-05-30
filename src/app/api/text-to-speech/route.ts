import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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

    const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "";
    if (!hfToken) {
      return NextResponse.json({ detail: 'Hugging Face API key is not configured' }, { status: 500 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ detail: 'No text provided' }, { status: 400 });
    }

    const modelId = "facebook/mms-tts-eng";

    // 3. Query Hugging Face Inference API
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: text.trim() }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.includes("loading")) {
          return NextResponse.json({ detail: `Model is loading. Estimated time: ${errJson.estimated_time || 30}s. Please retry in a moment.` }, { status: 503 });
        }
      } catch {}
      throw new Error(`Hugging Face API error: ${response.status} - ${errText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "audio/wav";

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': contentType,
      }
    });

  } catch (error: any) {
    console.error('Text-to-speech API error:', error);
    if (error.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
      return NextResponse.json({ detail: 'Could not connect to the Hugging Face Inference API. Please verify your internet connection and DNS settings.' }, { status: 502 });
    }
    return NextResponse.json({ detail: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
