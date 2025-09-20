import OpenAI from "openai";
import {
  OpenAIError,
  OpenAIRequestVariables,
  ShortcutRecommendationResponse,
} from "./types.js";
import { ShortcutRecommendationResponseSchema } from "../utils/validation.js";

const PROMPT_ID = "pmpt_68c0898bb23081978687ee5fdf5f690d06a197956797278f";
const MAX_RETRIES = 3;

class RetryableError extends Error {
  constructor(message: string, public shouldRetry: boolean = false) {
    super(message);
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateBackoffDelay(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 30000;
  const jitter = Math.random() * 0.1;
  const delay = Math.min(
    baseDelay * Math.pow(2, attempt) * (1 + jitter),
    maxDelay
  );
  return Math.floor(delay);
}

export async function getShortcutRecommendations(
  variables: OpenAIRequestVariables
): Promise<ShortcutRecommendationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIError("OPENAI_API_KEY environment variable is required");
  }

  const openai = new OpenAI({ apiKey });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.responses.create({
        prompt: {
          id: PROMPT_ID,
          variables: {
            frequency: variables.frequency,
            task_description: variables.task_description,
            operating_system: variables.operating_system,
            existing_shortcuts: variables.existing_shortcuts,
          },
        },
      });

      if (!response.output_text) {
        throw new OpenAIError("No output_text in OpenAI response");
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(response.output_text);
      } catch (parseError) {
        throw new OpenAIError(
          `Failed to parse OpenAI response as JSON: ${
            (parseError as Error).message
          }`
        );
      }

      const validationResult =
        ShortcutRecommendationResponseSchema.safeParse(parsedContent);
      if (!validationResult.success) {
        throw new OpenAIError(
          `OpenAI response validation failed: ${validationResult.error.message}`
        );
      }

      return validationResult.data;
    } catch (error) {
      const isRetryable = shouldRetryError(error);

      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        if (error instanceof OpenAIError) {
          throw error;
        }

        if ((error as any)?.status) {
          const status = (error as any).status;
          const message = (error as any)?.message || "Unknown OpenAI API error";

          switch (status) {
            case 401:
              throw new OpenAIError("Invalid OpenAI API key");
            case 429:
              throw new OpenAIError("OpenAI API rate limit exceeded");
            case 500:
            case 502:
            case 503:
            case 504:
              throw new OpenAIError(
                `OpenAI API server error (${status}): ${message}`
              );
            default:
              throw new OpenAIError(`OpenAI API error (${status}): ${message}`);
          }
        }

        throw new OpenAIError(
          `Failed to get shortcut recommendations: ${(error as Error).message}`,
          error as Error
        );
      }

      const delay = calculateBackoffDelay(attempt);
      console.warn(
        `OpenAI API request failed (attempt ${
          attempt + 1
        }/${MAX_RETRIES}), retrying in ${delay}ms:`,
        (error as Error).message
      );
      await sleep(delay);
    }
  }

  throw new OpenAIError("Max retries exceeded for OpenAI API request");
}

function shouldRetryError(error: unknown): boolean {
  if (error instanceof OpenAIError) {
    return false;
  }

  if ((error as any)?.status) {
    const status = (error as any).status;
    return status >= 500 || status === 429;
  }

  const message = (error as Error).message?.toLowerCase() || "";
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    message.includes("econnreset") ||
    message.includes("enotfound")
  );
}
