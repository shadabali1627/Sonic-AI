import { GoogleGenerativeAI } from '@google/generative-ai';

export class ConsistencyChecker {
  private static GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  private static OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

  public static async verify(
    userPrompt: string,
    assistantResponse: string,
    primaryProvider: 'openrouter' | 'gemini'
  ): Promise<boolean> {
    // 1. If we don't have keys for both providers, we can't perform cross-model validation.
    if (!this.GEMINI_API_KEY || !this.OPENROUTER_API_KEY) {
      return true;
    }

    try {
      const instruction = `Analyze the user's prompt and the assistant's proposed response. 
Verify that:
1. The response is semantically consistent and directly answers the user prompt.
2. The response does not contradict the user's intent.
3. The response is concise and safe.

User Prompt: "${userPrompt}"
Assistant Response: "${assistantResponse}"

Respond strictly in JSON format:
{
  "isConsistent": boolean
}`;

      // Choose secondary provider
      if (primaryProvider === 'openrouter') {
        // Audit using Gemini
        const genAI = new GoogleGenerativeAI(this.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: instruction }] }],
          generationConfig: { responseMimeType: 'application/json' }
        });
        
        const text = result.response.text();
        const parsed = JSON.parse(text.trim());
        return !!parsed.isConsistent;
      } else {
        // Audit using OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Sonic AI'
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b:free',
            messages: [{ role: 'user', content: instruction }],
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) return true; // Fallback to trust primary if secondary fails
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(content.trim());
        return !!parsed.isConsistent;
      }
    } catch (e) {
      console.error('Cross-Model Consistency check failed (error), falling back to true:', e);
      return true;
    }
  }
}
