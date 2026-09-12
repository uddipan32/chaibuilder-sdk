/**
 * Small English singularizer. Internal replacement for `pluralize.singular()`
 * from the `pluralize` package (MIT), covering the vocabulary we feed it:
 * collection slugs / type names (e.g. "pages", "categories", "products").
 */

const IRREGULARS: Record<string, string> = {
  people: "person",
  children: "child",
  men: "man",
  women: "woman",
  teeth: "tooth",
  feet: "foot",
  mice: "mouse",
  geese: "goose",
  oxen: "ox",
  indices: "index",
  vertices: "vertex",
  matrices: "matrix",
  media: "medium",
  criteria: "criterion",
  leaves: "leaf",
  knives: "knife",
  wolves: "wolf",
  lives: "life",
  shelves: "shelf",
};

const UNCOUNTABLE = new Set([
  "news",
  "series",
  "species",
  "sheep",
  "fish",
  "deer",
  "data",
  "information",
  "equipment",
  "analytics",
  "settings",
]);

const RULES: Array<[RegExp, string]> = [
  [/(qu|[^aeiou])ies$/i, "$1y"], // categories -> category, cities -> city
  [/(x|ch|sh|ss|zz)es$/i, "$1"], // boxes -> box, classes -> class, dishes -> dish
  [/(us)es$/i, "$1"], // statuses -> status
  [/(o)es$/i, "$1"], // heroes -> hero
  [/([^s])s$/i, "$1"], // pages -> page (leaves "ss" endings alone)
];

export function singularize(word: string): string {
  const lower = word.toLowerCase();
  if (UNCOUNTABLE.has(lower)) return word;
  if (IRREGULARS[lower]) {
    const singular = IRREGULARS[lower];
    // Preserve leading capitalization of the input
    return word[0] === word[0].toUpperCase() ? singular[0].toUpperCase() + singular.slice(1) : singular;
  }
  for (const [pattern, replacement] of RULES) {
    if (pattern.test(word)) return word.replace(pattern, replacement);
  }
  return word;
}
