import { GuardrailResult } from './types';

export class OutputValidator {
  // Simple check for offensive terms
  private static PROHIBITED_WORDS = [
    /\b(slurs|hate speech keywords|explicit words)\b/gi, // Placeholder for safety filter
  ];

  public static validate(text: string): GuardrailResult {
    if (!text) {
      return { allowed: true, sanitizedContent: '' };
    }

    let processed = text;

    // 1. Safety check
    for (const pattern of this.PROHIBITED_WORDS) {
      if (pattern.test(processed)) {
        return {
          allowed: false,
          reason: 'Output blocked: Generated response contains inappropriate content violating safety guidelines.',
          sanitizedContent: "I'm sorry, but I cannot generate that response as it does not comply with our safety guidelines."
        };
      }
    }

    // 2. PII Scrubber
    // Email addresses
    processed = processed.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED EMAIL]');
    
    // US & common international phone numbers
    processed = processed.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]');
    
    // SSN
    processed = processed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED SSN]');

    // 3. Speech formatting scrubber (Strips markdown for Text-to-Speech engine compatibility)
    // Remove bold/italics markers
    processed = processed.replace(/\*\*|__|\*|_/g, '');
    
    // Remove inline code ticks
    processed = processed.replace(/`/g, '');
    
    // Remove heading signs (e.g. #, ##)
    processed = processed.replace(/^#+\s+/gm, '');
    
    // Convert bullet lists into a single continuous reading line
    processed = processed.replace(/^\s*[-*+]\s+/gm, ', ');
    processed = processed.replace(/^\s*\d+\.\s+/gm, ', ');

    // Convert double line breaks into single space/paragraph
    processed = processed.replace(/\n+/g, ' ');

    // Clean up spaces
    processed = processed.replace(/\s+/g, ' ').trim();

    return {
      allowed: true,
      sanitizedContent: processed
    };
  }
}
