/**
 * Marks an AI failure that is a *setup* problem — a configured provider whose
 * package is not installed, say — rather than something that went wrong during
 * the request itself.
 *
 * The text after the marker is already written for whoever is looking at the
 * builder: it names the provider and what to install. `getHumanReadableError`
 * strips the marker and shows the rest verbatim instead of guessing at the
 * cause from keywords, which is how a missing OpenRouter package once surfaced
 * as "Your AI usage limit has been reached".
 */
export const AI_SETUP_ERROR_PREFIX = "[chai:ai-setup] ";
