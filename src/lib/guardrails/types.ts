export interface GuardrailSettings {
  inputValidation: boolean;
  topicEnforcement: boolean;
  modelRouting: boolean;
  outputValidation: boolean;
  rateLimiting: boolean;
  crossModelConsistency: boolean;
  routerStrategy: 'auto' | 'gemini' | 'llama';
}

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  sanitizedContent?: string;
}

export const DEFAULT_GUARDRAIL_SETTINGS: GuardrailSettings = {
  inputValidation: true,
  topicEnforcement: true,
  modelRouting: true,
  outputValidation: true,
  rateLimiting: true,
  crossModelConsistency: false,
  routerStrategy: 'auto'
};
