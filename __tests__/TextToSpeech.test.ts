import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { POST } from '@/app/api/text-to-speech/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn((token) => {
    if (token === 'valid-token') {
      return Promise.resolve({ sub: 'testuser' });
    }
    return Promise.resolve(null);
  }),
}));

describe('/api/text-to-speech API Route', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    process.env.HF_TOKEN = 'test-hf-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/text-to-speech', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.detail).toBe('Not authenticated');
  });

  it('should return 401 for an invalid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
      body: JSON.stringify({ text: 'Hello' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.detail).toBe('Invalid token');
  });

  it('should return 400 if no text is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({ text: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.detail).toBe('No text provided');
  });

  it('should return 500 if Hugging Face token is missing', async () => {
    const originalHfToken = process.env.HF_TOKEN;
    const originalApiKey = process.env.HUGGINGFACE_API_KEY;
    delete process.env.HF_TOKEN;
    delete process.env.HUGGINGFACE_API_KEY;

    try {
      const req = new NextRequest('http://localhost:3000/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ text: 'Hello' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.detail).toBe('Hugging Face API key is not configured');
    } finally {
      process.env.HF_TOKEN = originalHfToken;
      process.env.HUGGINGFACE_API_KEY = originalApiKey;
    }
  });

  it('should successfully synthesize speech and return binary audio', async () => {
    const mockAudioBuffer = new Uint8Array([1, 2, 3, 4]).buffer;

    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'audio/wav' }),
        arrayBuffer: () => Promise.resolve(mockAudioBuffer),
      } as Response);
    });

    const req = new NextRequest('http://localhost:3000/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({ text: 'Hello world' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/wav');
    const arrayBuffer = await res.arrayBuffer();
    expect(new Uint8Array(arrayBuffer)).toEqual(new Uint8Array([1, 2, 3, 4]));

    expect(global.fetch).toHaveBeenCalledWith(
      'https://router.huggingface.co/hf-inference/models/facebook/mms-tts-eng',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-hf-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ inputs: 'Hello world' }),
      })
    );
  });
});
