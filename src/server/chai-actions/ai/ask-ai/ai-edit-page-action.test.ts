import { afterEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import { registerChaiAiCustomization, resetChaiAiCustomizersForTests } from "~/server/plugin-api/ai-customization";

vi.mock("~/server/chai-actions/db", () => ({
  db: {},
  safeQuery: vi.fn(),
  schema: {},
}));

vi.mock("~/server/chai-builder/state", () => ({
  getInitializedStateWithUser: vi.fn(() => ({ appId: "app-1" })),
}));

vi.mock("~/server/defaults/config-registry", () => ({
  getResolvedPageType: vi.fn(() => ({ description: "A landing page" })),
  getConfigAI: vi.fn(() => ({ models: {} })),
  getConfigFeatures: vi.fn(() => ({})),
}));

vi.mock("~/registry", () => ({
  getAllRegisteredChaiBlocks: vi.fn(() => ({
    ProductCard: {
      type: "ProductCard",
      label: "Product Card",
      description: "Shows a product",
      props: { schema: { properties: { productId: { type: "string", title: "Product ID" } } } },
      aiProps: ["productId"],
    },
  })),
}));

const userMessage = (id: string, text: string): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});

const assistantWithEdit = (id: string, html: string): UIMessage =>
  ({
    id,
    role: "assistant",
    parts: [
      {
        type: "tool-edit_block",
        toolCallId: `call-${id}`,
        state: "output-available",
        input: { task: "Edit hero", blockId: "hero-1", html },
        output: { ok: true },
      },
    ],
  }) as unknown as UIMessage;

const buildAction = async () => {
  const { AIEditPageAction } = await import("./ai-edit-page-action");

  class TestAction extends AIEditPageAction {
    public capturedParams: any = null;
    context = { action: "AI_EDIT_PAGE", userId: "u1", appId: "a1" } as any;

    protected async streamText(params: any): Promise<any> {
      this.capturedParams = params;
      return {
        toUIMessageStreamResponse: (options: any) => {
          // exercise the onError sanitizer wiring
          options?.onError?.(new Error("boom\n--END--"));
          return new Response("stream", { headers: { "content-type": "text/event-stream" } });
        },
      };
    }
  }

  return new TestAction();
};

describe("AIEditPageAction (tool-call / UIMessage flow)", () => {
  it("returns a dataStream Response envelope for the dispatcher", async () => {
    const action = await buildAction();
    const result = await action.execute({
      messages: [userMessage("m1", "Add a hero section")],
      pageOutline: "box-1 | Box | Hero",
      pageHtml: "<div bid='box-1'></div>",
    } as any);

    expect(result._streamingResponse).toBe(true);
    expect(result._streamResult.isDataStream).toBe(true);
    expect(result._streamResult.dataStream).toBeInstanceOf(Response);
  });

  it("builds the system prompt with outline, catalog, bindings and page type", async () => {
    const action = await buildAction();
    await action.execute({
      messages: [userMessage("m1", "hello")],
      pageOutline: "box-1 | Box | Hero Section",
      pageHtml: "<div bid='box-1'></div>",
      options: {
        pageType: "landing",
        dataBindingPaths: {
          global: ["global.user.name"],
          page: ["posts"],
          pathTypes: { "global.user.name": "string", posts: "array" },
        },
      },
    } as any);

    const system: string = action.capturedParams.system;
    expect(system).toContain("box-1 | Box | Hero Section");
    expect(system).toContain("ProductCard");
    expect(system).toContain("{{global.user.name}} (string)");
    expect(system).toContain("Example: {{path | currency 'USD'}}");
    expect(system).toContain("NEVER append the default pipe routinely");
    expect(system).toContain("Boolean formatters (conditional visibility / _show only)");
    expect(system).toContain("A landing page");
    expect(system).not.toContain("--START--");
    expect(system).not.toContain("{{PAGE_OUTLINE}}");
    expect(system).not.toContain("{{CUSTOM_BLOCK_CATALOG}}");
    expect(system).not.toContain("{{DESIGN_TOKENS_LIST}}");
  });

  it("exposes the full tool set with read_block_html bound to the request pageHtml", async () => {
    const action = await buildAction();
    await action.execute({
      messages: [userMessage("m1", "hello")],
      pageHtml: "<section bid='hero-1'><h1>Hi</h1></section>",
    } as any);

    const tools = action.capturedParams.tools;
    expect(Object.keys(tools).sort()).toEqual([
      "add_blocks",
      "add_custom_block",
      "bind_prop",
      "edit_block",
      "get_partial_blocks",
      "read_block_html",
      "remove_blocks",
    ]);

    const slices = await tools.read_block_html.execute({ blockIds: ["hero-1"] });
    expect(slices["hero-1"]).toContain("Hi");
  });

  it("prunes html from tool inputs in all but the last assistant message", async () => {
    const action = await buildAction();
    await action.execute({
      messages: [
        userMessage("m1", "edit hero"),
        assistantWithEdit("a1", "<div>OLD HUGE HTML</div>"),
        userMessage("m2", "now edit footer"),
        assistantWithEdit("a2", "<div>LATEST HTML</div>"),
      ],
      pageHtml: "",
    } as any);

    const serialized = JSON.stringify(action.capturedParams.messages);
    expect(serialized).not.toContain("OLD HUGE HTML");
    expect(serialized).toContain("LATEST HTML");
  });

  it("adds selected block context from the last user message metadata", async () => {
    const action = await buildAction();
    await action.execute({
      messages: [{ ...userMessage("m1", "make it pop"), metadata: { selectedBlockId: "hero-1" } }],
      pageHtml: "",
    } as any);

    expect(action.capturedParams.system).toContain('bid "hero-1"');
  });

  describe("root-app AI customization", () => {
    afterEach(() => resetChaiAiCustomizersForTests());

    it("applies a registered prompt customizer and passes the action context", async () => {
      const seen: any[] = [];
      registerChaiAiCustomization("test", {
        prompt: (prompt, ctx) => {
          seen.push(ctx);
          return `${prompt}\nAlways use British spelling.`;
        },
      });

      const action = await buildAction();
      await action.execute({
        messages: [userMessage("m1", "hello")],
        pageOutline: "box-1 | Box | Hero",
        pageHtml: "<div bid='box-1'></div>",
      } as any);

      expect(action.capturedParams.system).toContain("Always use British spelling.");
      expect(seen[0]).toMatchObject({ action: "AI_EDIT_PAGE", initiator: "page" });
    });

    it("merges a registered app tool alongside the built-in tools", async () => {
      const appTool = { description: "fetch products", execute: async () => "ok" };
      registerChaiAiCustomization("test", { tools: () => ({ fetch_products: appTool }) as any });

      const action = await buildAction();
      await action.execute({
        messages: [userMessage("m1", "hello")],
        pageHtml: "<section bid='hero-1'><h1>Hi</h1></section>",
      } as any);

      const tools = action.capturedParams.tools;
      expect(tools.fetch_products).toBe(appTool);
      expect(tools.read_block_html).toBeDefined();
      expect(tools.edit_block).toBeDefined();
    });

    it("tags a block-scoped run with the block initiator", async () => {
      const seen: any[] = [];
      registerChaiAiCustomization("test", {
        prompt: (prompt, ctx) => {
          seen.push(ctx);
          return prompt;
        },
      });

      const action = await buildAction();
      await action.execute({
        messages: [userMessage("m1", "make the heading bigger")],
        pageHtml: "<section bid='hero-1'><h1>Hi</h1></section>",
        scopedBlockId: "hero-1",
      } as any);

      expect(seen[0]).toMatchObject({ action: "AI_EDIT_PAGE", initiator: "block" });
    });
  });

  describe("scopedBlockId (block floating AI)", () => {
    const executeScoped = async (
      pageHtml = "<section bid='hero-1'><h1>Hi</h1></section><footer bid='foot-1'>F</footer>",
    ) => {
      const action = await buildAction();
      await action.execute({
        messages: [userMessage("m1", "make the heading bigger")],
        pageOutline: "hero-1 | Section | Hero\nfoot-1 | Footer | Footer",
        pageHtml,
        scopedBlockId: "hero-1",
      } as any);
      return action;
    };

    it("hands the model read, edit and scoped binding tools", async () => {
      const action = await executeScoped();
      expect(Object.keys(action.capturedParams.tools).sort()).toEqual(["bind_prop", "edit_block", "read_block_html"]);
    });

    it("states the single-block scope in the system prompt", async () => {
      const action = await executeScoped();
      const system: string = action.capturedParams.system;
      expect(system).toContain("Edit Scope: Single Block (STRICT)");
      expect(system).toContain('ONLY the block with bid "hero-1"');
      expect(system).toContain("read, replace, or data-bind");
    });

    it("reads the scoped block", async () => {
      const action = await executeScoped();
      const slices = await action.capturedParams.tools.read_block_html.execute({ blockIds: ["hero-1"] });
      expect(slices["hero-1"]).toContain("Hi");
    });

    it("refuses to read a block outside the scope", async () => {
      const action = await executeScoped();
      const slices = await action.capturedParams.tools.read_block_html.execute({ blockIds: ["foot-1"] });
      expect(slices["foot-1"]).toContain("outside the current edit scope");
      expect(slices["foot-1"]).not.toContain("<footer");
    });

    it("refuses a batch that smuggles an out-of-scope bid alongside the scoped one", async () => {
      const action = await executeScoped();
      const slices = await action.capturedParams.tools.read_block_html.execute({ blockIds: ["hero-1", "foot-1"] });
      expect(slices["foot-1"]).toContain("outside the current edit scope");
      expect(slices["hero-1"]).toBeUndefined();
    });
  });
});
