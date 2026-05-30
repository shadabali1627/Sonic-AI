import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { GuardrailResult } from './types';

export class RateLimiter {
  private static WINDOW_MS = 60 * 1000; // 1 minute sliding window
  private static MAX_REQUESTS = 30;     // Max 30 requests per minute

  public static async limit(userId: string | ObjectId): Promise<GuardrailResult & { remaining: number }> {
    try {
      const { db } = await connectToDatabase();
      const rateLimitsCollection = db.collection('rate_limits');

      const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const now = new Date();
      const windowStart = new Date(now.getTime() - this.WINDOW_MS);

      // 1. Clean up older rate limits for all users (keeps database clean)
      await rateLimitsCollection.deleteMany({
        timestamp: { $lt: windowStart }
      });

      // 2. Count requests in the current window for this user
      const requestCount = await rateLimitsCollection.countDocuments({
        user_id: userObjId,
        timestamp: { $gte: windowStart }
      });

      if (requestCount >= this.MAX_REQUESTS) {
        return {
          allowed: false,
          reason: 'Rate limit exceeded: You have sent too many requests. Please wait a moment.',
          remaining: 0
        };
      }

      // 3. Log the current request
      await rateLimitsCollection.insertOne({
        user_id: userObjId,
        timestamp: now
      });

      return {
        allowed: true,
        remaining: this.MAX_REQUESTS - requestCount - 1
      };
    } catch (error) {
      console.error('Rate Limiter error:', error);
      // Fallback: If DB is down, allow request but log warning
      return {
        allowed: true,
        remaining: 1
      };
    }
  }

  public static async getRemaining(userId: string | ObjectId): Promise<number> {
    try {
      const { db } = await connectToDatabase();
      const rateLimitsCollection = db.collection('rate_limits');

      const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const now = new Date();
      const windowStart = new Date(now.getTime() - this.WINDOW_MS);

      const requestCount = await rateLimitsCollection.countDocuments({
        user_id: userObjId,
        timestamp: { $gte: windowStart }
      });

      const remaining = this.MAX_REQUESTS - requestCount;
      return Math.max(0, remaining);
    } catch (e) {
      return this.MAX_REQUESTS;
    }
  }
}
