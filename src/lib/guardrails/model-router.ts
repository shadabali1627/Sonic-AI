export interface RoutedModel {
  provider: 'openrouter' | 'gemini';
  modelId: string;
  apiKey: string;
}

export class ModelRouter {
  private static GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  private static OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

  /**
   * Routes the query to Gemini models exclusively, using gemma-4-26b-a4b-it.
   */
  public static route(
    message: string,
    hasImage: boolean,
    strategy: 'auto' | 'gemini' | 'llama' = 'auto'
  ): RoutedModel {
    return {
      provider: 'gemini',
      modelId: 'gemma-4-26b-a4b-it',
      apiKey: this.GEMINI_API_KEY
    };
  }
}

