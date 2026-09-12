import { ActionError } from "~/server/chai-actions/action-error";
import { AIChatError } from "~/server/chai-actions/classes/chai-ai-chat-handler";

export function throwAiChatError(error: AIChatError): never {
  throw new ActionError(error.message, error.code, error.statusCode);
}
