import { InputGuardrail } from './input-guardrail';
import { RateLimiter } from './rate-limiter';
import { TopicClassifier } from './topic-classifier';
import { ModelRouter, RoutedModel } from './model-router';
import { OutputValidator } from './output-validator';
import { ConsistencyChecker } from './consistency-checker';
import { GuardrailSettings, DEFAULT_GUARDRAIL_SETTINGS } from './types';
import { ObjectId } from 'mongodb';

export class GuardrailManager {
  /**
   * Validates user input before invoking the primary LLM generation.
   * Runs: Rate Limiter -> Input Guardrail -> Topic Classifier -> Model Router.
   */
  public static async validateInput(
    userId: string | ObjectId,
    message: string,
    hasImage: boolean,
    settings: GuardrailSettings = DEFAULT_GUARDRAIL_SETTINGS
  ): Promise<{
    allowed: boolean;
    reason?: string;
    routedModel?: RoutedModel;
    rateLimitRemaining?: number;
  }> {
    // 1. Rate Limiting Check (Run first to prevent LLM charges on spammed messages)
    let remaining = 30;
    if (settings.rateLimiting) {
      const rateResult = await RateLimiter.limit(userId);
      remaining = rateResult.remaining;
      if (!rateResult.allowed) {
        return {
          allowed: false,
          reason: rateResult.reason,
          rateLimitRemaining: remaining
        };
      }
    } else {
      remaining = await RateLimiter.getRemaining(userId);
    }

    // 2. Input Guardrail check (Regex checks & Prompt Injection detection)
    if (settings.inputValidation) {
      const inputResult = InputGuardrail.validate(message);
      if (!inputResult.allowed) {
        return {
          allowed: false,
          reason: inputResult.reason,
          rateLimitRemaining: remaining
        };
      }
    }

    // 3. Topic Classifier (Keeping chatbot voice-friendly & on-scope)
    if (settings.topicEnforcement) {
      const topicResult = await TopicClassifier.classify(message);
      if (!topicResult.allowed) {
        return {
          allowed: false,
          reason: topicResult.reason,
          rateLimitRemaining: remaining
        };
      }
    }

    // 4. Model Router (Select optimal model based on features & settings)
    const routedModel = ModelRouter.route(message, hasImage, settings.routerStrategy);

    return {
      allowed: true,
      routedModel,
      rateLimitRemaining: remaining
    };
  }

  /**
   * Validates generated LLM responses before delivery.
   * Runs: Output Validator (PII/Formatting/Safety) -> Cross-Model Consistency.
   */
  public static async validateOutput(
    message: string,
    responseText: string,
    primaryProvider: 'openrouter' | 'gemini',
    settings: GuardrailSettings = DEFAULT_GUARDRAIL_SETTINGS
  ): Promise<string> {
    let output = responseText;

    // 1. Output Validator (PII and speech-formatting scrubbing)
    if (settings.outputValidation) {
      const outputResult = OutputValidator.validate(output);
      output = outputResult.sanitizedContent || output;
    }

    // 2. Cross-Model Consistency
    if (settings.crossModelConsistency) {
      const isConsistent = await ConsistencyChecker.verify(message, output, primaryProvider);
      if (!isConsistent) {
        // Return a slightly modified, safer response or log audit
        console.warn('Cross-model consistency check flagged deviation.');
      }
    }

    return output;
  }
}
export { ModelRouter, RateLimiter, InputGuardrail, TopicClassifier, OutputValidator, ConsistencyChecker };
