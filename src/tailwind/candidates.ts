// Mirrors Tailwind's permissive content extraction by capturing token-like non-whitespace
// sequences, while excluding a trailing ":" so variant prefixes like "hover:" don't become
// standalone candidates. This intentionally favors broad candidate discovery over strict parsing,
// so escaped edge cases may be missed in favour of not over-parsing.
const TAILWIND_CANDIDATE_REGEX = /[^<>"'`\s]*[^<>"'`\s:]/g;

export const extractTailwindCandidates = (markupStrings: string[], safelist: string[] = []) => {
  const candidates = new Set<string>(safelist);

  for (const markupString of markupStrings) {
    const matches = markupString.match(TAILWIND_CANDIDATE_REGEX) || [];

    for (const match of matches) {
      candidates.add(match);
    }
  }

  return Array.from(candidates);
};
