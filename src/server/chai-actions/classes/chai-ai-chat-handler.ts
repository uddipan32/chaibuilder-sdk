/**
 * Error codes for AI chat operations
 */
export enum AIChatErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  MODEL_ERROR = "MODEL_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  STREAM_ERROR = "STREAM_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Custom error class for AI chat operations
 */
export class AIChatError extends Error {
  constructor(
    message: string,
    public code: AIChatErrorCode = AIChatErrorCode.UNKNOWN_ERROR,
    public statusCode: number = 500,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "AIChatError";
  }

  /**
   * Convert error to a serializable object for streaming
   */
  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Parse error and return appropriate AIChatError
 */
export function parseAIError(error: unknown): AIChatError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Rate limiting
  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("429") ||
    lowerMessage.includes("too many requests")
  ) {
    return new AIChatError(
      "You've made too many requests. Please wait a moment before trying again.",
      AIChatErrorCode.RATE_LIMIT,
      429,
      error,
    );
  }

  // Authentication errors
  if (
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("unauthenticated") ||
    lowerMessage.includes("401") ||
    lowerMessage.includes("api key") ||
    lowerMessage.includes("authentication")
  ) {
    return new AIChatError(
      "Authentication failed. Please check your API configuration.",
      AIChatErrorCode.AUTHENTICATION_ERROR,
      401,
      error,
    );
  }

  // Network errors
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("econnrefused")) {
    return new AIChatError(
      "Unable to connect to the AI service. Please check your internet connection.",
      AIChatErrorCode.NETWORK_ERROR,
      503,
      error,
    );
  }

  // Model errors
  if (lowerMessage.includes("model") || lowerMessage.includes("not found") || lowerMessage.includes("invalid")) {
    return new AIChatError(
      "The AI model is currently unavailable. Please try again later.",
      AIChatErrorCode.MODEL_ERROR,
      500,
      error,
    );
  }

  // Token/context length errors
  if (lowerMessage.includes("token") || lowerMessage.includes("context length") || lowerMessage.includes("too long")) {
    return new AIChatError(
      "The content is too long for the AI to process. Please try with a smaller selection.",
      AIChatErrorCode.INVALID_REQUEST,
      400,
      error,
    );
  }

  // Default unknown error
  return new AIChatError("An unexpected error occurred. Please try again.", AIChatErrorCode.UNKNOWN_ERROR, 500, error);
}
