import { describe, it, expect, vi, beforeAll } from 'vitest';
import { POST } from '@/app/api/speech-to-text/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn((token) => {
    if (token === 'valid-token') {
      return Promise.resolve({ sub: 'testuser' });
    }
    return Promise.resolve(null);
  }),
}));

describe('/api/speech-to-text API Route', () => {
  beforeAll(() => {
    process.env.HF_TOKEN = 'test-hf-key';
  });
  it('should return 401 if not authenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/speech-to-text', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.detail).toBe('Not authenticated');
  });

  it('should return 401 for an invalid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/speech-to-text', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.detail).toBe('Invalid token');
  });

  it('should return 400 if no audio file is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/speech-to-text', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      // Send empty form data
      body: new FormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(['No audio file provided', 'Invalid request format']).toContain(body.detail);
  });
});
