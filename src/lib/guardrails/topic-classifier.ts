import { GuardrailResult } from './types';

export class TopicClassifier {
  private static OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

  // Local heuristics to quickly catch programming tasks without hitting the LLM
  private static OUT_OF_SCOPE_REGEXES = [
    /\b(write a python|write a js|write a typescript|write a java|write a c\+\+|write a rust)\b/i,
    /\b(create a script|write a script|generate code|write some code)\b/i,
    /```[a-z]+/i, // Code blocks in input
  ];

  public static async classify(message: string): Promise<GuardrailResult> {
    if (!message) {
      return { allowed: true };
    }

    // 1. Fast local checks
    for (const regex of this.OUT_OF_SCOPE_REGEXES) {
      if (regex.test(message)) {
        return {
          allowed: false,
          reason: 'I can only assist with general voice-friendly topics. I am unable to write or debug code/scripts.'
        };
      }
    }

    // 2. LLM-based classification using the existing OpenRouter model config
    if (!this.OPENROUTER_API_KEY) {
      // Fallback: If no API key, let it pass
      return { allowed: true };
    }

    try {
      const systemInstruction = `You are a moderator for Sonic AI, a voice-first conversational chatbot. Decide if the user's message is in-scope or out-of-scope.
Out-of-scope inputs:
- Requests to write, debug, or explain complex programming code.
- Requests for long essays or multi-step math derivations (not easy to read aloud).
- Requests for harmful, illegal, or hazardous information.

In-scope inputs:
- General greetings, conversations, facts, weather, and general questions.

Respond only with a JSON object. Use this exact structure:
{
  "isAllowed": boolean,
  "reason": "polite refusal message under 2 sentences if not allowed, otherwise empty"
}`;

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
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Analyze: "${message}"` }
          ],
          response_format: { type: 'json_object' } // Enforce JSON
        })
      });

      if (!response.ok) {
        console.warn('Topic classifier API error, falling back to ALLOWED');
        return { allowed: true };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      try {
        const parsed = JSON.parse(content.trim());
        return {
          allowed: !!parsed.isAllowed,
          reason: parsed.isAllowed ? undefined : (parsed.reason || 'I can only assist with voice-friendly topics.')
        };
      } catch (jsonErr) {
        // If parsing fails, look for JSON substring or fallback to ALLOWED
        if (content.toLowerCase().includes('"isallowed": false') || content.toLowerCase().includes('"isallowed":false')) {
          return { allowed: false, reason: 'I can only assist with voice-friendly topics.' };
        }
        return { allowed: true };
      }
    } catch (error) {
      console.error('Topic classification error:', error);
      return { allowed: true };
    }
  }
}
