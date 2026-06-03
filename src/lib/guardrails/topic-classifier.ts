import { GuardrailResult } from './types';

export class TopicClassifier {
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

    // Fast local checks
    for (const regex of this.OUT_OF_SCOPE_REGEXES) {
      if (regex.test(message)) {
        return {
          allowed: false,
          reason: 'I can only assist with general voice-friendly topics. I am unable to write or debug code/scripts.'
        };
      }
    }

    // Default to allowed without calling any API (upstream models have built-in guardrails)
    return { allowed: true };
  }
}

