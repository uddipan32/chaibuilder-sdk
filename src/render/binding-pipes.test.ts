import { describe, expect, it, vi } from "vitest";
import { getRegisteredChaiPipes, registerChaiPipe } from "~/registry";
import { resolveBinding, resolveBindingVisibility, resolveStringBinding } from "./binding-engine";
import {
  evaluateBindingExpression,
  evaluateVisibilityExpression,
  getValueAtBindingPath,
  isValidBindingTemplate,
  isVisibilityCombinatorExpression,
  parseBindingExpression,
  resolveCollectionItemBindingPath,
  validateBindingPath,
  validateVisibilityExpression,
} from "./binding-pipes";

describe("safe binding parser", () => {
  it("parses paths, repeaters, collections, chains, and primitive arguments", () => {
    expect(parseBindingExpression("listing.price")).toMatchObject({ kind: "path", path: "listing.price" });
    expect(parseBindingExpression("$index.price | currency 'USD'")).toMatchObject({
      kind: "pipeline",
      path: "$index.price",
      pipes: [{ name: "currency", args: ["USD"] }],
    });
    expect(parseBindingExpression("#products/repeater-id | default null")).toMatchObject({
      kind: "pipeline",
      path: "#products/repeater-id",
      pipes: [{ name: "default", args: [null] }],
    });
    expect(parseBindingExpression("value | equals true")).toMatchObject({
      kind: "pipeline",
      pipes: [{ name: "equals", args: [true] }],
    });
  });

  it("accepts and resolves object keys with internal spaces and accents", () => {
    // The real team binding is `global.departments.Service et pièces.…` — spaces AND an accent
    // (è). These validated + resolved on the v3 builder and must keep doing so on v4; the app's
    // runtime resolver (utils/binding-engine.ts) already accepts such dotted segments.
    expect(parseBindingExpression("global.departments.Service et pièces.phoneNumber.phone")).toMatchObject({
      kind: "path",
      path: "global.departments.Service et pièces.phoneNumber.phone",
    });
    expect(
      resolveBinding("{{global.departments.Service et pièces.phoneNumber.phone}}", {
        global: { departments: { "Service et pièces": { phoneNumber: { phone: "418-555-0100" } } } },
      }),
    ).toBe("418-555-0100");
    // A spaced/accented path still parses cleanly alongside a pipe (the `|` split happens before
    // whitespace tokenizing, so path spaces never collide with pipe parsing).
    expect(parseBindingExpression("global.departments.Service et pièces | default 'n/a'")).toMatchObject({
      kind: "pipeline",
      path: "global.departments.Service et pièces",
      pipes: [{ name: "default", args: ["n/a"] }],
    });
    // Double spaces and non-space whitespace inside a segment remain invalid.
    expect(parseBindingExpression("global.Service  Client")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("global.Service\tClient")).toMatchObject({ kind: "invalid" });
    // ...and bad whitespace gets the targeted message, not the generic one.
    expect(validateBindingPath("global.Service  Client")).toMatchObject({
      valid: false,
      reason: "Binding path segments may only contain single spaces between words",
    });
  });

  it("keeps quoted pipes and escaped quotes inside arguments", () => {
    expect(parseBindingExpression(String.raw`title | default 'a|b'`)).toMatchObject({
      kind: "pipeline",
      pipes: [{ args: ["a|b"] }],
    });
    expect(parseBindingExpression(String.raw`title | default 'can\'t'`)).toMatchObject({
      kind: "pipeline",
      pipes: [{ args: ["can't"] }],
    });
  });

  it("rejects malformed syntax, computed access, and prototype paths", () => {
    expect(parseBindingExpression("value | default '")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("items[0] | truthy")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("user.__proto__.admin | truthy")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("user.constructor | truthy")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("user.prototype.admin")).toMatchObject({ kind: "invalid" });
  });

  it("enforces expression, pipe, and argument limits", () => {
    expect(parseBindingExpression("a".repeat(501))).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression(`value${" | truthy".repeat(11)}`)).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression(`value | default ${Array(11).fill("'x'").join(" ")}`)).toMatchObject({
      kind: "invalid",
    });
  });

  it("rejects malformed pipes and JavaScript expressions", () => {
    expect(parseBindingExpression("value | not a pipe")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("value | toUpperCase()")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("value * 2")).toMatchObject({ kind: "invalid" });
    expect(resolveBinding("{{value * 2}}", { value: 7 })).toBe("");
  });

  it("uses own-property traversal only", () => {
    const inherited = Object.create({ secret: "no" });
    inherited.visible = "yes";
    expect(getValueAtBindingPath({ inherited }, "inherited.visible")).toBe("yes");
    expect(getValueAtBindingPath({ inherited }, "inherited.secret")).toBeUndefined();
  });

  it("desugars a leading logical-NOT into a terminal boolean pipe", () => {
    expect(parseBindingExpression("!!global.social.facebook")).toMatchObject({
      kind: "pipeline",
      path: "global.social.facebook",
      pipes: [{ name: "truthy", args: [] }],
    });
    expect(parseBindingExpression("!vehicle.sold")).toMatchObject({
      kind: "pipeline",
      path: "vehicle.sold",
      pipes: [{ name: "not", args: [] }],
    });
    // The prefix negates the whole value → the boolean pipe lands after explicit pipes.
    expect(parseBindingExpression("!price | gt 0")).toMatchObject({
      kind: "pipeline",
      path: "price",
      pipes: [{ name: "gt" }, { name: "not", args: [] }],
    });
    // A dangling prefix over a non-path still fails closed.
    expect(parseBindingExpression("!!")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("!price * 2")).toMatchObject({ kind: "invalid" });
  });

  it("desugars an infix comparison into a terminal boolean pipe", () => {
    // Loose `==`/`!=` desugar to the loose pipes (Eta parity); strict `===`/`!==` stay Object.is.
    expect(parseBindingExpression("vehicle.stock_status == 'Réservé'")).toMatchObject({
      kind: "pipeline",
      path: "vehicle.stock_status",
      pipes: [{ name: "looseEquals", args: ["Réservé"] }],
    });
    expect(parseBindingExpression("status === 'sold'")).toMatchObject({ pipes: [{ name: "equals", args: ["sold"] }] });
    expect(parseBindingExpression("status != 'sold'")).toMatchObject({
      pipes: [{ name: "looseNotEquals", args: ["sold"] }],
    });
    expect(parseBindingExpression("status !== 'sold'")).toMatchObject({ pipes: [{ name: "notEquals" }] });
    expect(parseBindingExpression("price >= 5000")).toMatchObject({ pipes: [{ name: "gte", args: [5000] }] });
    expect(parseBindingExpression("price < 10")).toMatchObject({ pipes: [{ name: "lt", args: [10] }] });
    // A string containing an operator must not be split at the inner operator.
    expect(parseBindingExpression("label == 'A > B'")).toMatchObject({ pipes: [{ name: "looseEquals", args: ["A > B"] }] });
    // gt/gte/lt/lte require a numeric right side; path-vs-path and missing sides fail closed.
    expect(parseBindingExpression("price > 'x'")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("a == b")).toMatchObject({ kind: "invalid" });
    expect(parseBindingExpression("status ==")).toMatchObject({ kind: "invalid" });
  });
});

describe("visibility expression evaluator", () => {
  const ok = (expr: string, data: Record<string, any>) => {
    const r = evaluateVisibilityExpression(expr, data);
    return r.ok ? r.value : `ERR:${r.reason}`;
  };

  it("evaluates boolean atoms, negation, and combinators", () => {
    expect(ok("!!global.social.facebook", { global: { social: { facebook: "x" } } })).toBe(true);
    expect(ok("!model.model && !vehicle.model", { model: {}, vehicle: {} })).toBe(true);
    expect(ok("!model.model && !vehicle.model", { model: { model: "A" }, vehicle: {} })).toBe(false);
    expect(ok("price | gt 0 || active", { price: 0, active: true })).toBe(true);
  });

  it("evaluates comparisons, including inside combinators", () => {
    expect(ok("vehicle.stock_status == 'Réservé'", { vehicle: { stock_status: "Réservé" } })).toBe(true);
    expect(ok("vehicle.stock_status == 'Réservé'", { vehicle: { stock_status: "Disponible" } })).toBe(false);
    expect(ok("vehicle.stock_status != 'Réservé'", { vehicle: { stock_status: "Disponible" } })).toBe(true);
    expect(ok("price >= 5000 && status == 'new'", { price: 8000, status: "new" })).toBe(true);
    expect(ok("price >= 5000 && status == 'new'", { price: 100, status: "new" })).toBe(false);
  });

  it("keeps `==` loose (Eta parity) but `===` strict", () => {
    // Provider supplies a string; loose `==` coerces (matches Eta), strict `===` does not.
    expect(ok("vehicle.year == 2026", { vehicle: { year: "2026" } })).toBe(true);
    expect(ok("vehicle.year === 2026", { vehicle: { year: "2026" } })).toBe(false);
    expect(ok("vehicle.year === 2026", { vehicle: { year: 2026 } })).toBe(true);
    // The `x == null` idiom must match a missing/undefined value, like JS loose equality.
    expect(ok("vehicle.trim == null", { vehicle: {} })).toBe(true);
    expect(ok("vehicle.trim != null", { vehicle: { trim: "Sport" } })).toBe(true);
    expect(ok("vehicle.trim != null", { vehicle: {} })).toBe(false);
  });

  it("keeps string literals containing operators intact", () => {
    // `&&` inside a quoted pipe arg must not be treated as a combinator.
    expect(ok("status | equals 'A && B'", { status: "A && B" })).toBe(true);
  });

  it("fails closed for non-boolean leaves, empty operands, and overflow", () => {
    expect(ok("title", { title: "hi" })).toBe("ERR:visibility binding must resolve to a boolean: title");
    expect(ok("!!a && ", { a: 1 })).toMatch(/^ERR:/);
    expect(ok(Array(11).fill("!!a").join(" && "), { a: 1 })).toBe("ERR:Too many conditions");
  });
});

describe("isVisibilityCombinatorExpression", () => {
  it("detects top-level && / || outside quotes", () => {
    expect(isVisibilityCombinatorExpression("!a && !b")).toBe(true);
    expect(isVisibilityCombinatorExpression("a || b")).toBe(true);
    expect(isVisibilityCombinatorExpression("!!global.social.facebook")).toBe(false);
    expect(isVisibilityCombinatorExpression("vehicle.stock_status == 'Réservé'")).toBe(false);
    // `&&` inside a quoted literal is not a combinator.
    expect(isVisibilityCombinatorExpression("status | equals 'A && B'")).toBe(false);
  });
});

describe("validateVisibilityExpression (author-time)", () => {
  it("accepts valid atoms, negation, comparisons, and combinators", () => {
    expect(validateVisibilityExpression("!!global.social.facebook", {})).toBeNull();
    expect(validateVisibilityExpression("!model.model && !vehicle.model", {})).toBeNull();
    expect(validateVisibilityExpression("vehicle.stock_status == 'Réservé'", {})).toBeNull();
  });

  it("surfaces an invalid branch even when a sibling would short-circuit (finding 2)", () => {
    // `!!flag` is truthy in preview data, so the runtime evaluator never parses `price * 2`;
    // the validator still must, so the malformed branch cannot be saved silently.
    expect(evaluateVisibilityExpression("!!flag || price * 2", { flag: 1 })).toMatchObject({ ok: true, value: true });
    expect(validateVisibilityExpression("!!flag || price * 2", { flag: 1 })).not.toBeNull();
    expect(validateVisibilityExpression("!!ok && ", { ok: 1 })).not.toBeNull();
  });

  it("errors on a concrete non-boolean leaf but tolerates undefined (finding 4)", () => {
    // A pipeline ending in a string-returning pipe is a real authoring error.
    expect(validateVisibilityExpression("title | uppercase", { title: "hi" })).not.toBeNull();
    // A boolean-typed value is fine.
    expect(validateVisibilityExpression("active", { active: true })).toBeNull();
    // Missing preview data (undefined) is tolerated — the real page data may differ.
    expect(validateVisibilityExpression("someFlag", {})).toBeNull();
    expect(validateVisibilityExpression("a.b.c", { a: {} })).toBeNull();
  });
});

describe("pipe registry and evaluator", () => {
  it("registers custom pipes with HMR-style upsert semantics", () => {
    registerChaiPipe({
      name: "testSuffix",
      label: "Suffix",
      accepts: ["string"],
      transform: ({ value }) => `${value}!`,
    });
    registerChaiPipe({
      name: "testSuffix",
      label: "Suffix v2",
      accepts: ["string"],
      transform: ({ value }) => `${value}?`,
    });
    expect(getRegisteredChaiPipes().filter((pipe) => pipe.name === "testSuffix")).toHaveLength(1);
    expect(resolveBinding("{{name | testSuffix}}", { name: "Chai" })).toBe("Chai?");
  });

  it("fails closed for thrown errors and promises", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    registerChaiPipe({
      name: "testThrow",
      label: "Throw",
      transform: () => {
        throw new Error("boom");
      },
    });
    registerChaiPipe({ name: "testAsync", label: "Async", transform: () => Promise.resolve("unsafe") });
    expect(resolveBinding("{{name | testThrow}}", { name: "x" })).toBe("");
    expect(resolveBinding("{{name | testAsync}}", { name: "x" })).toBe("");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("skips unknown pipes instead of blanking the binding", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveBinding("{{price | money '$xx' 2}}", { price: 12 })).toBe("12");
    expect(resolveBinding("{{title | missing | uppercase}}", { title: "chai" })).toBe("CHAI");
    expect(resolveBindingVisibility("{{items | missing | empty}}", { items: [] })).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("rejects a pipeline when input types are incompatible", () => {
    expect(evaluateBindingExpression("name | join ', '", { name: "not an array" })).toMatchObject({ ok: false });
  });

  it("reserves boolean-returning pipes for conditional visibility", () => {
    expect(evaluateBindingExpression("price | gt 0", { price: 5 })).toMatchObject({
      ok: false,
      reason: 'Pipe "gt" is only available for conditional visibility',
    });
    expect(evaluateBindingExpression("price | gt 0", { price: 5 }, { usage: "visibility" })).toMatchObject({
      ok: true,
      value: true,
    });
    expect(resolveBinding("{{price | gt 0}}", { price: 5 })).toBe("");
  });

  it("runs each transform once per bound property", () => {
    const transform = vi.fn(({ value }) => String(value).toUpperCase());
    registerChaiPipe({ name: "testOnce", label: "Once", accepts: ["string"], transform });
    expect(resolveStringBinding("Hello {{name | testOnce}}", { name: "chai" }, -1, "", "title")).toBe("Hello CHAI");
    expect(transform).toHaveBeenCalledTimes(1);
  });
});

describe("built-in pipes", () => {
  it("formats fallback, text, collections, number, currency, and date", () => {
    expect(resolveBinding("{{missing | default 'n/a'}}", {})).toBe("n/a");
    expect(resolveBinding("{{title | trim | uppercase}}", { title: " chai " })).toBe("CHAI");
    expect(resolveBinding("{{title | lowercase | capitalize}}", { title: "CHAI" })).toBe("Chai");
    expect(resolveBinding("{{tags | join ', '}}", { tags: ["a", "b"] })).toBe("a, b");
    expect(resolveBinding("{{price | number 2}}", { price: 1234.5 }, "en-US")).toBe("1,234.50");
    expect(resolveBinding("{{price | currency 'USD'}}", { price: 12 }, "en-US")).toContain("$12.00");
    expect(resolveBinding("{{created | date 'short'}}", { created: "2020-01-02T23:00:00-05:00" }, "en-US")).toBe(
      "1/3/20",
    );
  });

  it("falls back on falsy values with or", () => {
    expect(resolveBinding("{{count | or 'none'}}", { count: 0 })).toBe("none");
    expect(resolveBinding("{{name | or 'Anonymous'}}", { name: "" })).toBe("Anonymous");
    expect(resolveBinding("{{name | or 'Anonymous'}}", { name: "Chai" })).toBe("Chai");
    expect(resolveBinding("{{count | default 'none'}}", { count: 0 })).toBe("0");
  });

  it("formats NANP phone numbers and leaves other numbers untouched", () => {
    expect(resolveBinding("{{phone | telephone}}", { phone: "7025551234" })).toBe("(702) 555-1234");
    expect(resolveBinding("{{phone | telephone}}", { phone: "+1 702-555-1234" })).toBe("+1 (702) 555-1234");
    expect(resolveBinding("{{phone | telephone}}", { phone: 7025551234 })).toBe("(702) 555-1234");
    expect(resolveBinding("{{phone | telephone}}", { phone: "+44 20 7946 0958" })).toBe("+44 20 7946 0958");
    expect(resolveBinding("{{phone | telephone}}", { phone: "" })).toBe("");
  });

  it("evaluates comparison and boolean pipes", () => {
    expect(resolveBindingVisibility("{{price | gt 0}}", { price: 2 })).toBe(true);
    expect(resolveBindingVisibility("{{price | gte 2}}", { price: 2 })).toBe(true);
    expect(resolveBindingVisibility("{{price | lt 2}}", { price: 3 })).toBe(false);
    expect(resolveBindingVisibility("{{price | lte 3}}", { price: 3 })).toBe(true);
    expect(resolveBindingVisibility("{{status | equals 'live'}}", { status: "live" })).toBe(true);
    expect(resolveBindingVisibility("{{status | notEquals 'draft'}}", { status: "live" })).toBe(true);
    expect(resolveBindingVisibility("{{active | not}}", { active: false })).toBe(true);
    expect(resolveBindingVisibility("{{name | truthy}}", { name: "Chai" })).toBe(true);
    expect(resolveBindingVisibility("{{items | empty}}", { items: [] })).toBe(true);
    expect(resolveBindingVisibility("{{items | notEmpty}}", { items: [] })).toBe(false);
    expect(resolveBindingVisibility("{{items | notEmpty}}", { items: [1] })).toBe(true);
  });
});

describe("runtime safety", () => {
  it("leaves pipe output unescaped for non-HTML props and sanitizes raw property output", () => {
    registerChaiPipe({ name: "testHtml", label: "HTML", transform: () => '<img src=x onerror="alert(1)">' });
    // Non-raw props are rendered by React (which escapes); no pre-escaping.
    expect(resolveBinding("{{name | testHtml}}", { name: "x" })).toBe('<img src=x onerror="alert(1)">');
    expect(resolveStringBinding("{{name | testHtml}}", { name: "x" }, -1, "", "content")).not.toContain("onerror");
  });

  it("supports raw boolean paths and hides invalid or non-boolean visibility", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveBindingVisibility("{{active}}", { active: true })).toBe(true);
    expect(resolveBindingVisibility("{{title}}", { title: "yes" })).toBe(false);
    expect(resolveBindingVisibility("{{title | missing}}", { title: "yes" })).toBe(false);
    warn.mockRestore();
  });

  it("always rejects JavaScript expressions", () => {
    expect(resolveBinding("{{price * 2}}", { price: 5 })).toBe("");
    // Arithmetic and ternaries have no pipe form and stay rejected (unlike `>`/`==`,
    // which now desugar to boolean pipes for visibility).
    expect(resolveBindingVisibility("{{price * 2 > 0}}", { price: 5 })).toBe(false);
    expect(resolveBindingVisibility("{{price > 0 ? 1 : 0}}", { price: 5 })).toBe(false);
    expect(isValidBindingTemplate("{{price | gt 0}}")).toBe(false);
    expect(isValidBindingTemplate("{{price | gt 0}}", "visibility")).toBe(true);
    // A bare comparison is a boolean → valid for visibility, not for a value sink.
    expect(isValidBindingTemplate("{{price > 0}}")).toBe(false);
    expect(isValidBindingTemplate("{{price > 0}}", "visibility")).toBe(true);
  });

  it("warns once per unique invalid expression", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveBinding("{{invalidWarnProbe + 1}}", { invalidWarnProbe: 1 })).toBe("");
    expect(resolveBinding("{{invalidWarnProbe + 1}}", { invalidWarnProbe: 2 })).toBe("");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("resolveCollectionItemBindingPath", () => {
  it("resolves bare $item and dotted $item paths against the item key", () => {
    expect(resolveCollectionItemBindingPath("$item", "#agents/blk1.0")).toBe("#agents/blk1.0");
    expect(resolveCollectionItemBindingPath("$item.title", "#agents/blk1.0")).toBe("#agents/blk1.0.title");
    expect(resolveCollectionItemBindingPath("$item.address.city", "#agents/blk1.0")).toBe(
      "#agents/blk1.0.address.city",
    );
  });

  it("leaves non-$item paths and empty item keys unchanged", () => {
    expect(resolveCollectionItemBindingPath("listing.title", "#agents/blk1.0")).toBe("listing.title");
    expect(resolveCollectionItemBindingPath("$index.title", "#agents/blk1.0")).toBe("$index.title");
    expect(resolveCollectionItemBindingPath("$item.title", "")).toBe("$item.title");
    expect(resolveCollectionItemBindingPath("$items.title", "#agents/blk1.0")).toBe("$items.title");
  });

  it("resolves $item and $index independently when both contexts are set", () => {
    const data = {
      "#agents/blk1": [{ name: "Ann" }],
      "#listings/blk2": [{ title: "First" }, { title: "Second" }],
    };
    const options = { index: 1, repeaterKey: "{{#listings/blk2}}", itemKey: "#agents/blk1.0" };
    expect(evaluateBindingExpression("$item.name", data, options)).toMatchObject({ ok: true, value: "Ann" });
    expect(evaluateBindingExpression("$index.title", data, options)).toMatchObject({ ok: true, value: "Second" });
  });
});
