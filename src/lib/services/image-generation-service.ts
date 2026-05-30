const HF_API_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000; // 10 seconds between retries when model is loading
const REQUEST_TIMEOUT_MS = 120000; // 2 minutes timeout

export class ImageGenerationService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "";
    if (!this.apiKey) {
      console.warn("Warning: No HuggingFace API key found. Set HF_TOKEN or HUGGINGFACE_API_KEY in .env.local");
    }
  }

  /**
   * Generate an image from a text prompt using FLUX.1-schnell via Hugging Face Inference API.
   * Returns a base64 data URI string of the generated image.
   */
  async generateImage(prompt: string): Promise<{ imageBase64: string; mimeType: string }> {
    if (!this.apiKey) {
      throw new Error("HuggingFace API key is not configured. Please set HF_TOKEN in your environment.");
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error("Image generation prompt cannot be empty.");
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(HF_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              width: 1024,
              height: 1024,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Model is loading — retry after delay
        if (response.status === 503) {
          const body = await response.json().catch(() => ({}));
          const estimatedTime = body.estimated_time || RETRY_DELAY_MS / 1000;
          console.log(`FLUX.1-schnell model is loading. Estimated time: ${estimatedTime}s. Retry ${attempt + 1}/${MAX_RETRIES}`);
          
          if (attempt < MAX_RETRIES - 1) {
            await this.sleep(Math.min(estimatedTime * 1000, 30000));
            continue;
          }
          throw new Error("The image generation model is still loading. Please try again in a minute.");
        }

        // Rate limited
        if (response.status === 429) {
          throw new Error("Rate limit reached. Please wait a moment before generating another image.");
        }

        // Auth error
        if (response.status === 401 || response.status === 403) {
          throw new Error("HuggingFace authentication failed. Please check your API token and ensure you have accepted the FLUX.1-schnell model license.");
        }

        // Other errors
        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          console.error(`HuggingFace API error (${response.status}):`, errorText);
          throw new Error(`Image generation failed (HTTP ${response.status}). Please try again.`);
        }

        // Success — read raw image bytes
        const contentType = response.headers.get("content-type") || "image/png";
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 100) {
          throw new Error("Received an empty or invalid image from the generation service.");
        }

        const base64 = buffer.toString("base64");
        const mimeType = contentType.includes("jpeg") ? "image/jpeg" : "image/png";
        const dataUri = `data:${mimeType};base64,${base64}`;

        return { imageBase64: dataUri, mimeType };

      } catch (error: any) {
        if (error.name === "AbortError") {
          throw new Error("Image generation timed out. The model may be under heavy load. Please try again.");
        }
        lastError = error;

        // Don't retry on non-retryable errors
        if (error.message && !error.message.includes("loading")) {
          throw error;
        }
      }
    }

    throw lastError || new Error("Image generation failed after multiple retries.");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
