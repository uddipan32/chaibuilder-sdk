import { LANGUAGES } from "~/builder/pages/constants/LANGUAGES";
import { ChaiBlock } from "~/types/common";

/**
 * Returns per-request user prompt for HTML creation/editing.
 * - CREATE mode: generate HTML in a given content language.
 * - EDIT mode: modify existing HTML based on user input.
 */
export function getUserPrompt({
  userInput,
  language = "en",
  currentHtml,
}: {
  userInput: string;
  language: string;
  currentHtml?: string;
}): string {
  const langName = LANGUAGES[language] || "English";
  const isEditMode = currentHtml && currentHtml.trim().length > 0;

  if (isEditMode) {
    const hasSelectedBlock = currentHtml.includes('data-ai-selected="true"');
    const selectedBlockNote = hasSelectedBlock
      ? '\nNOTE: The element with data-ai-selected="true" is the user\'s current focus. While you have the full page context, prioritize changes to this selected element unless the user request explicitly requires broader changes.'
      : "";

    return `
MODE: EDIT
CURRENT HTML:
${currentHtml}

USER REQUEST: ${userInput}
Use ${langName} language.${selectedBlockNote}
`.trim();
  }

  return `
  USER REQUEST: ${userInput}
Use ${langName} language.
`.trim();
}

export function getTranslationUserPrompt({
  fallbackLang,
  language,
  blocks = [],
  userInput,
}: {
  fallbackLang: string;
  language: string;
  blocks: ChaiBlock[];
  userInput: string;
}) {
  const langName = LANGUAGES[language] || "English";

  return `
USER REQUEST: ${userInput || "Translate the content"}
LANGUAGE TO TRANSLATE: ${langName}
REQUESTED TRANSLATION LANGUAGE CODE: ${language}
FALLBACK LANGUAGE: ${LANGUAGES[fallbackLang]}
BLOCKS: ${JSON.stringify(blocks)}`.trim();
}

export const ADD_NEW_SECTIONS = [
  {
    label: "Navbar",
    prompt: `Create stunning, fully responsive navbar `,
  },
  {
    label: "Hero section",
    prompt: `Create visually compelling hero section `,
  },
  {
    label: "Features grid",
    prompt: `Create comprehensive features section `,
  },
  {
    label: "Contact form",
    prompt: `Create professional contact form `,
  },
  {
    label: "Testimonials",
    prompt: `Create engaging testimonials section `,
  },
  {
    label: "Pricing table",
    prompt: `Create modern pricing table `,
  },
  {
    label: "FAQ section",
    prompt: `Create informative FAQ section `,
  },
  {
    label: "Footer",
    prompt: `Create comprehensive footer section `,
  },
  {
    label: "Call to action",
    prompt: `Create compelling call to action section `,
  },
  {
    label: "Team section",
    prompt: `Create professional team section `,
  },
  {
    label: "Blog grid",
    prompt: `Create attractive blog grid section `,
  },
  {
    label: "Stats section",
    prompt: `Create impactful statistics section `,
  },
];

export const UPDATE_ACTIONS = [
  {
    label: "Update styles",
    prompt: "Update styles",
  },
  {
    label: "Update content",
    prompt: "Update text content",
  },
  {
    label: "Update layout",
    prompt: "Update layout",
  },
  {
    label: "Improve content",
    prompt: "Improve text content grammar and spelling",
  },
  {
    label: "Make content longer",
    prompt: "Make text content longer",
  },
  {
    label: "Make content shorter",
    prompt: "Make text content shorter",
  },
  {
    label: "Fix grammar",
    prompt: "Fix grammar of the text content",
  },
];

export const LANGUAGE_CONTENT_ACTIONS = [
  {
    label: "Change content",
    prompt: "Change text content",
  },
  {
    label: "Improve content",
    prompt: "Improve text content grammar and spelling",
  },
  {
    label: "Make content longer",
    prompt: "Make text content longer",
  },
  {
    label: "Add emojis",
    prompt: "Add emojis",
  },
  {
    label: "Remove emojis",
    prompt: "Remove emojis",
  },
  {
    label: "Make content shorter",
    prompt: "Make text content shorter",
  },
  {
    label: "Fix grammar",
    prompt: "Fix grammar of the text content",
  },
];
