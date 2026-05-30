export interface RoutedModel {
  provider: 'openrouter' | 'gemini';
  modelId: string;
  apiKey: string;
}

export class ModelRouter {
  private static GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  private static OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

  public static route(
    message: string,
    hasImage: boolean,
    strategy: 'auto' | 'gemini' | 'llama' = 'auto'
  ): RoutedModel {
    // 1. Force Gemini strategy
    if (strategy === 'gemini' && this.GEMINI_API_KEY) {
      return {
        provider: 'gemini',
        modelId: 'gemma-4-31b-it', // Use gemma-31b
        apiKey: this.GEMINI_API_KEY
      };
    }

    // 2. Force Llama strategy
    if (strategy === 'llama' && this.OPENROUTER_API_KEY) {
      return {
        provider: 'openrouter',
        modelId: 'openai/gpt-oss-120b:free',
        apiKey: this.OPENROUTER_API_KEY
      };
    }

    // 3. Auto-Routing Logic
    // If an image is uploaded, route to Gemini because it has native multimodal capabilities
    if (hasImage && this.GEMINI_API_KEY) {
      return {
        provider: 'gemini',
        modelId: 'gemma-4-31b-it',
        apiKey: this.GEMINI_API_KEY
      };
    }

    // Default: use the existing configured OpenRouter model
    if (this.OPENROUTER_API_KEY) {
      return {
        provider: 'openrouter',
        modelId: 'openai/gpt-oss-120b:free',
        apiKey: this.OPENROUTER_API_KEY
      };
    }

    // Ultimate fallback to Gemini
    return {
      provider: 'gemini',
      modelId: 'gemma-4-31b-it',
      apiKey: this.GEMINI_API_KEY
    };
  }
}
