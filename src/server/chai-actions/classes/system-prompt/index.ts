import { getDefaultLangSystemPrompt } from "./default-lang-system-prompt";
import { IMAGE_GENERATION_SYSTEM_PROMPT } from "./image-generation-system-prompt";
import { TRANSLATE_TO_LANG_SYSTEM_PROMPT } from "./translate-to-lang-system-prompt";
import { UPDATE_TRANSLATED_CONTENT_SYSTEM_PROMPT } from "./update-translated-content-system-prompt";

/**
 *
 * @param initiator
 * @param options
 * @returns SYSTEM PROMPT
 */
export function getAskAiSystemPrompt(initiator: string | null = null, options: Record<string, any> = {}): string {
  if (initiator) {
    switch (initiator) {
      case "GENERATE_IMAGE":
        return IMAGE_GENERATION_SYSTEM_PROMPT;
      case "TRANSLATE_CONTENT":
        return TRANSLATE_TO_LANG_SYSTEM_PROMPT;
      case "UPDATE_CONTENT":
        return UPDATE_TRANSLATED_CONTENT_SYSTEM_PROMPT;
      default:
        return getDefaultLangSystemPrompt(options);
    }
  }
  return getDefaultLangSystemPrompt(options);
}
