import crypto from 'crypto';

export class CloudinaryService {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = process.env.CLOUDINARY_API_KEY || '';
    this.apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.warn('Warning: Cloudinary credentials are not fully configured in .env.local');
    }
  }

  /**
   * Uploads a base64 data URI image to Cloudinary and returns the secure URL.
   */
  async uploadImage(base64DataUri: string): Promise<string> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error('Cloudinary is not configured. Please check your environment variables.');
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = 'sonic_ai';

      // Generate Cloudinary Signature
      // Parameters must be sorted alphabetically: folder, timestamp
      const stringToSign = `folder=${folder}&timestamp=${timestamp}${this.apiSecret}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      // Create FormData
      const formData = new FormData();
      formData.append('file', base64DataUri);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary API error:', errorText);
        throw new Error(`Cloudinary upload failed (HTTP ${response.status})`);
      }

      const responseData = await response.json();
      return responseData.secure_url;
    } catch (error: any) {
      console.error('Cloudinary service error:', error);
      throw error;
    }
  }
}
