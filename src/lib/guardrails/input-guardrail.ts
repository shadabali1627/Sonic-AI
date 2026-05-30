import { GuardrailResult } from './types';

export class InputGuardrail {
  private static MAX_LENGTH = 2000;

  // Simple patterns for detecting SQL injection, HTML/JS script injection, or directory traversal
  private static VULNERABILITY_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // HTML script tags
    /union\s+all\s+select/gi, // SQL injection pattern
    /union\s+select/gi,       // SQL injection pattern
    /select\s+.*\s+from\s+information_schema/gi, // SQL metadata query
    /\.\.\/\.\.\//g,          // Directory traversal
  ];

  // Heuristic patterns for prompt injection
  private static PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/gi,
    /system\s+override/gi,
    /bypass\s+the\s+rules/gi,
    /you\s+are\s+now\s+a/gi,
    /you\s+must\s+now\s+act\s+as/gi,
    /reveal\s+your\s+system\s+prompt/gi,
    /reveal\s+your\s+instructions/gi,
    /forget\s+what\s+you\s+were\s+told/gi,
  ];

  public static validate(text: string): GuardrailResult {
    if (!text) {
      return { allowed: true, sanitizedContent: '' };
    }

    // 1. Length validation
    if (text.length > this.MAX_LENGTH) {
      return {
        allowed: false,
        reason: `Input is too long. Maximum allowed length is ${this.MAX_LENGTH} characters.`
      };
    }

    // 2. Vulnerability / exploit pattern checks
    for (const pattern of this.VULNERABILITY_PATTERNS) {
      if (pattern.test(text)) {
        return {
          allowed: false,
          reason: 'Security alert: Exploit or injection pattern detected in input.'
        };
      }
    }

    // 3. Prompt injection detection
    for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          allowed: false,
          reason: 'Security alert: Prompt injection or system instruction override attempt detected.'
        };
      }
    }

    return { allowed: true, sanitizedContent: text };
  }
}
