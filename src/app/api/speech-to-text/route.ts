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

    // 2. Parse FormData
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      return NextResponse.json({ detail: 'Invalid request format' }, { status: 400 });
    }
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ detail: 'No audio file provided' }, { status: 400 });
    }

    // 3. Convert audio to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'audio/webm';
    const modelId = "openai/whisper-large-v3-turbo";

    // 4. Query Hugging Face Inference Router API (replacing deprecated api-inference subdomain)
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": mimeType,
        },
        method: "POST",
        body: buffer,
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

    const result = await response.json();
    const transcription = result.text || "";

    return NextResponse.json({ text: transcription });

  } catch (error: any) {
    console.error('Speech-to-text API error:', error);
    if (error.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
      return NextResponse.json({ detail: 'Could not connect to the Hugging Face Inference API. Please verify your internet connection and DNS settings.' }, { status: 502 });
    }
    return NextResponse.json({ detail: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
