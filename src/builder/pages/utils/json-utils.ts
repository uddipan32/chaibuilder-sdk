/**
 * Utility functions for handling JSON with placeholders
 */

import { get } from "lodash-es";

/**
 * Escape regex special characters in a string
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Gets a nested value from an object using dot notation
 */
export const getNestedValue = (obj: Record<string, any>, path: string): any => {
  if (!obj || !path) return undefined;

  // Handle both dot notation and bracket notation
  const normalizedPath = path.replace(/\[([^\]]+)\]/g, ".$1");
  const keys = normalizedPath.split(".");

  try {
    // Try to navigate the object using the path
    return keys.reduce((o, key) => {
      // Skip empty keys that might result from something like obj..prop
      if (!key) return o;
      return o?.[key];
    }, obj);
  } catch (e) {
    console.log(`Error getting value for path ${path}:`, e);
    return undefined;
  }
};

/**
 * Format JSON with indentation
 */
export const formatJson = (jsonString: string): string => {
  if (!jsonString.trim()) return "";

  try {
    const parsedJson = JSON.parse(jsonString);
    return JSON.stringify(parsedJson, null, 2);
  } catch {
    // If formatting fails, return the original string
    return jsonString;
  }
};

/**
 * Interface for JSON error information
 */
export interface JsonError {
  message: string;
  position?: number;
  line?: number;
  column?: number;
}

/**
 * Parse and validate JSON with placeholders
 */
export const parseJSONWithPlaceholders = (jsonString: string) => {
  if (!jsonString.trim()) {
    return { isValid: false, parsed: null, placeholders: [], error: { message: "JSON is empty" } };
  }

  // Fast path: bindings ({{path}}) always live inside quoted JSON strings, so
  // well-formed content is already valid JSON as-is. Parse it verbatim first and
  // accept it — this short-circuits the common case AND avoids the placeholder
  // substitution below, whose per-token "isQuoted" heuristic corrupts string
  // values that mix text with multiple bindings, e.g. "{{make}} {{model}}"
  // (it injected quotes around the first token, closing the string early and
  // producing a false `Expected ',' or '}'` error). The substitution path stays
  // as a fallback only for genuinely-unquoted bindings, which are invalid JSON.
  try {
    const parsed = JSON.parse(jsonString);
    return { isValid: true, parsed, error: null, placeholders: [] };
  } catch {
    // Not valid as-is (e.g. an unquoted binding); fall through to the
    // placeholder-aware handling to produce a helpful error / tolerate it.
  }

  // Step 1: Find all placeholders
  const placeholderPattern = /{{([^{}]+)}}/g;
  const placeholders: { original: string; replaced: string; position: number }[] = [];
  let tempJsonString = jsonString;
  let match;

  // Replace placeholders with dummy values to make JSON valid
  while ((match = placeholderPattern.exec(jsonString)) !== null) {
    const original = match[0]; // {{field}}
    const position = match.index;

    // Check if placeholder is already quoted by looking at surrounding characters
    const beforeChar = position > 0 ? jsonString[position - 1] : "";
    const afterChar = position + original.length < jsonString.length ? jsonString[position + original.length] : "";
    const isQuoted = beforeChar === '"' && afterChar === '"';

    // If not quoted, the JSON is invalid (placeholders must be quoted)
    if (!isQuoted) {
      // Try to parse anyway to get a proper error message
      try {
        JSON.parse(jsonString);
      } catch (error) {
        const jsonError = error as SyntaxError;
        const positionMatch = jsonError.message.match(/position (\d+)/);
        const errorPosition = positionMatch ? parseInt(positionMatch[1]) : undefined;

        let line, column;
        if (errorPosition !== undefined) {
          const lines = jsonString.substring(0, errorPosition).split("\n");
          line = lines.length;
          column = lines[lines.length - 1].length + 1;
        }

        return {
          isValid: false,
          parsed: null,
          placeholders: [],
          error: {
            message: jsonError.message,
            line,
            column,
            position: errorPosition,
          },
        };
      }
    }

    // If already quoted, don't add quotes; otherwise add them
    const replacement = isQuoted
      ? `__placeholder_${placeholders.length}__`
      : `"__placeholder_${placeholders.length}__"`;
    placeholders.push({ original, replaced: replacement, position });

    // Replace all occurrences of this placeholder with a temporary value
    tempJsonString = tempJsonString.replaceAll(original, replacement);
  }

  // Step 2: Try to parse the JSON (original or modified)
  try {
    const parsedJson = JSON.parse(tempJsonString);
    return { isValid: true, parsed: parsedJson, error: null, placeholders };
  } catch (error) {
    const jsonError = error as SyntaxError;
    // Extract line and column info from error message
    const positionMatch = jsonError.message.match(/position (\d+)/);
    const position = positionMatch ? parseInt(positionMatch[1]) : undefined;

    // Basic line/column calculation for error reporting
    let line, column;
    if (position !== undefined) {
      const lines = tempJsonString.substring(0, position).split("\n");
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    return {
      isValid: false,
      parsed: null,
      placeholders,
      error: {
        message: jsonError.message,
        line,
        column,
        position,
      },
    };
  }
};

/**
 * Restores placeholders in JSON string
 */
export const restorePlaceholders = (
  json: any,
  placeholders: { original: string; replaced: string; position: number }[],
) => {
  const jsonStr = JSON.stringify(json, null, 2);
  let resultStr = jsonStr;

  placeholders.forEach(({ original }, index) => {
    // Remove quotes around the placeholder replacement and wrap the original in quotes
    const quotedReplacement = `"__placeholder_${index}__"`;
    const quotedOriginal = `"${original}"`;
    const specificPattern = new RegExp(escapeRegExp(quotedReplacement), "g");
    resultStr = resultStr.replace(specificPattern, quotedOriginal);
  });

  return resultStr;
};

/**
 * Evaluates placeholders based on page data
 */
export const evaluatePlaceholders = (json: any, pageData: Record<string, any>) => {
  if (!json) return "";

  // Replace every {{path}} in a SINGLE pass over the stable stringified JSON.
  // A `while (regex.exec)` loop that reassigns the string each iteration is
  // unsafe: mutating the input shifts later tokens behind the global regex's
  // `lastIndex`, so a value shorter than its placeholder leaves the next
  // binding unresolved (e.g. only the first of "{{make}} {{model}}" resolves).
  const jsonStr = JSON.stringify(json, null, 2);
  return jsonStr.replace(/{{([^{}]+)}}/g, (_match, fieldName) => String(get(pageData, fieldName, null)));
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("escapeRegExp", () => {
    it("should escape special regex characters", () => {
      expect(escapeRegExp(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
    });

    it("should return unchanged string without special characters", () => {
      expect(escapeRegExp("hello world")).toBe("hello world");
    });

    it("should handle empty string", () => {
      expect(escapeRegExp("")).toBe("");
    });

    it("should escape mixed content", () => {
      expect(escapeRegExp("test.value[0]")).toBe("test\\.value\\[0\\]");
    });
  });

  describe("getNestedValue", () => {
    it("should get simple property", () => {
      const obj = { name: "John" };
      expect(getNestedValue(obj, "name")).toBe("John");
    });

    it("should get nested property with dot notation", () => {
      const obj = { user: { profile: { name: "Jane" } } };
      expect(getNestedValue(obj, "user.profile.name")).toBe("Jane");
    });

    it("should get nested property with bracket notation", () => {
      const obj = { items: ["first", "second"] };
      expect(getNestedValue(obj, "items[0]")).toBe("first");
    });

    it("should handle mixed bracket and dot notation", () => {
      const obj = { data: [{ value: 42 }] };
      expect(getNestedValue(obj, "data[0].value")).toBe(42);
    });

    it("should return undefined for non-existent path", () => {
      const obj = { name: "John" };
      expect(getNestedValue(obj, "age")).toBeUndefined();
    });

    it("should return undefined for null object", () => {
      expect(getNestedValue(null as any, "name")).toBeUndefined();
    });

    it("should return undefined for empty path", () => {
      const obj = { name: "John" };
      expect(getNestedValue(obj, "")).toBeUndefined();
    });

    it("should handle deeply nested paths", () => {
      const obj = { a: { b: { c: { d: "deep" } } } };
      expect(getNestedValue(obj, "a.b.c.d")).toBe("deep");
    });

    it("should skip empty keys from double dots", () => {
      const obj = { a: { b: "value" } };
      expect(getNestedValue(obj, "a..b")).toBe("value");
    });
  });

  describe("formatJson", () => {
    it("should format valid JSON with indentation", () => {
      const input = '{"name":"John","age":30}';
      const result = formatJson(input);
      expect(result).toContain("  ");
      expect(JSON.parse(result)).toEqual({ name: "John", age: 30 });
    });

    it("should return empty string for empty input", () => {
      expect(formatJson("")).toBe("");
      expect(formatJson("   ")).toBe("");
    });

    it("should return original string for invalid JSON", () => {
      const invalid = '{"name": invalid}';
      expect(formatJson(invalid)).toBe(invalid);
    });

    it("should format nested objects", () => {
      const input = '{"user":{"name":"Jane","age":25}}';
      const result = formatJson(input);
      expect(result).toContain("  ");
      const parsed = JSON.parse(result);
      expect(parsed.user.name).toBe("Jane");
    });

    it("should format arrays", () => {
      const input = "[1,2,3]";
      const result = formatJson(input);
      expect(JSON.parse(result)).toEqual([1, 2, 3]);
    });
  });

  describe("parseJSONWithPlaceholders", () => {
    it("should parse valid JSON without placeholders", () => {
      const result = parseJSONWithPlaceholders('{"name": "John"}');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({ name: "John" });
      expect(result.placeholders).toEqual([]);
      expect(result.error).toBeNull();
    });

    it("should return error for empty JSON", () => {
      const result = parseJSONWithPlaceholders("");
      expect(result.isValid).toBe(false);
      expect(result.error?.message).toBe("JSON is empty");
    });

    it("should parse JSON with single placeholder and keep the binding intact", () => {
      const result = parseJSONWithPlaceholders('{"name": "{{user.name}}"}');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({ name: "{{user.name}}" });
    });

    it("should parse JSON with multiple placeholders and keep them intact", () => {
      const result = parseJSONWithPlaceholders('{"first": "{{firstName}}", "last": "{{lastName}}"}');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.parsed).toEqual({ first: "{{firstName}}", last: "{{lastName}}" });
      // Valid content takes the raw-parse fast path, so no substitution happens.
      expect(result.placeholders).toEqual([]);
    });

    it("should accept a string value that mixes text and multiple bindings", () => {
      // Regression: the VDP New/Used shared JSON-LD schemas concatenate bindings
      // in one value (e.g. "name": "{{vehicle.make}} {{vehicle.model}}"). The old
      // per-token quote-injection heuristic reported a false `Expected ',' or '}'`.
      const result = parseJSONWithPlaceholders('{"name": "{{vehicle.make}} {{vehicle.model}} {{vehicle.year}}"}');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.parsed).toEqual({ name: "{{vehicle.make}} {{vehicle.model}} {{vehicle.year}}" });
    });

    it("should accept bindings padded with spaces inside the quotes", () => {
      const result = parseJSONWithPlaceholders('{"image": " {{vehicle.jsonLD.image}} "}');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({ image: " {{vehicle.jsonLD.image}} " });
    });

    it("should return error for invalid JSON even with placeholders", () => {
      const result = parseJSONWithPlaceholders('{"name": {{user.name}}}');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should handle nested placeholders", () => {
      const result = parseJSONWithPlaceholders('{"user": {"name": "{{name}}", "age": "{{age}}"}}');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({ user: { name: "{{name}}", age: "{{age}}" } });
    });

    it("should handle placeholders in arrays", () => {
      const result = parseJSONWithPlaceholders('["{{item1}}", "{{item2}}"]');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual(["{{item1}}", "{{item2}}"]);
    });
  });

  describe("restorePlaceholders", () => {
    it("should restore placeholders in JSON", () => {
      const json = { name: "__placeholder_0__" };
      const placeholders = [{ original: "{{user.name}}", replaced: '"__placeholder_0__"', position: 10 }];
      const result = restorePlaceholders(json, placeholders);
      expect(result).toContain("{{user.name}}");
      expect(result).not.toContain("__placeholder_0__");
    });

    it("should restore multiple placeholders", () => {
      const json = { first: "__placeholder_0__", last: "__placeholder_1__" };
      const placeholders = [
        { original: "{{firstName}}", replaced: '"__placeholder_0__"', position: 10 },
        { original: "{{lastName}}", replaced: '"__placeholder_1__"', position: 30 },
      ];
      const result = restorePlaceholders(json, placeholders);
      expect(result).toContain("{{firstName}}");
      expect(result).toContain("{{lastName}}");
    });

    it("should handle empty placeholders array", () => {
      const json = { name: "John" };
      const result = restorePlaceholders(json, []);
      expect(result).toContain("John");
    });

    it("should preserve JSON structure", () => {
      const json = { user: { name: "__placeholder_0__" } };
      const placeholders = [{ original: "{{name}}", replaced: '"__placeholder_0__"', position: 15 }];
      const result = restorePlaceholders(json, placeholders);
      const parsed = JSON.parse(result);
      expect(parsed.user.name).toBe("{{name}}");
    });

    it("should handle nested objects with placeholders", () => {
      const json = {
        data: {
          value: "__placeholder_0__",
          nested: { field: "__placeholder_1__" },
        },
      };
      const placeholders = [
        { original: "{{value}}", replaced: '"__placeholder_0__"', position: 20 },
        { original: "{{field}}", replaced: '"__placeholder_1__"', position: 50 },
      ];
      const result = restorePlaceholders(json, placeholders);
      expect(result).toContain("{{value}}");
      expect(result).toContain("{{field}}");
    });
  });

  describe("evaluatePlaceholders", () => {
    it("should return empty string for null or undefined json", () => {
      expect(evaluatePlaceholders(null, {})).toBe("");
      expect(evaluatePlaceholders(undefined, {})).toBe("");
    });

    it("should resolve EVERY binding when several share one string value", () => {
      // Regression: a stateful-regex loop that mutated the string mid-iteration
      // left later bindings unresolved once an earlier value was shorter than
      // its placeholder. All three must resolve in the Preview.
      const json = { name: "{{make}} {{model}} {{year}}" };
      const pageData = { make: "Toyota", model: "Corolla", year: 2020 };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("Toyota");
      expect(result).toContain("Corolla");
      expect(result).toContain("2020");
      expect(result).not.toContain("{{");
    });

    it("should replace simple placeholders with values from pageData", () => {
      const json = { message: "{{greeting}}" };
      const pageData = { greeting: "Hello World" };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("Hello World");
    });

    it("should replace nested placeholders using dot notation", () => {
      const json = { text: "{{user.name}}" };
      const pageData = { user: { name: "John Doe" } };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("John Doe");
    });

    it("should replace multiple placeholders in the same object", () => {
      const json = {
        firstName: "{{user.firstName}}",
        lastName: "{{user.lastName}}",
      };
      const pageData = {
        user: { firstName: "Jane", lastName: "Smith" },
      };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("Jane");
      expect(result).toContain("Smith");
    });

    it("should replace placeholders with null when field is not found", () => {
      const json = { value: "{{nonexistent}}" };
      const pageData = { other: "value" };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("null");
    });

    it("should handle deeply nested paths", () => {
      const json = { data: "{{a.b.c.d}}" };
      const pageData = { a: { b: { c: { d: "deep value" } } } };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("deep value");
    });

    it("should handle placeholders with numeric values", () => {
      const json = { count: "{{count}}" };
      const pageData = { count: 42 };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("42");
    });

    it("should handle placeholders with boolean values", () => {
      const json = { active: "{{isActive}}" };
      const pageData = { isActive: true };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("true");
    });

    it("should handle empty pageData object", () => {
      const json = { value: "{{field}}" };
      const result = evaluatePlaceholders(json, {});
      expect(result).toContain("null");
    });

    it("should preserve JSON structure while replacing placeholders", () => {
      const json = {
        title: "{{title}}",
        nested: {
          value: "{{nested.value}}",
        },
      };
      const pageData = {
        title: "Test Title",
        nested: { value: "Nested Value" },
      };
      const result = evaluatePlaceholders(json, pageData);
      const parsed = JSON.parse(result);
      expect(parsed.title).toBe("Test Title");
      expect(parsed.nested.value).toBe("Nested Value");
    });

    it("should handle array values in pageData", () => {
      const json = { items: "{{items.0}}" };
      const pageData = { items: ["first", "second", "third"] };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("first");
    });

    it("should handle complex nested objects", () => {
      const json = {
        user: "{{profile.user.email}}",
        settings: "{{profile.settings.theme}}",
      };
      const pageData = {
        profile: {
          user: { email: "test@example.com" },
          settings: { theme: "dark" },
        },
      };
      const result = evaluatePlaceholders(json, pageData);
      expect(result).toContain("test@example.com");
      expect(result).toContain("dark");
    });
  });
}
