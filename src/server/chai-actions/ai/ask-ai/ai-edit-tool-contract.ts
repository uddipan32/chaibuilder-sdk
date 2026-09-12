/**
 * Single source of truth for the AI page-edit tool contract, shared by two
 * surfaces:
 *
 *  - the builder (AI SDK v6 `tool()` in ai-edit-page-tools.ts), which prepends a
 *    `task` progress-label field and executes edits on the client's JSON state;
 *  - the MCP server (mcp-handler raw Zod shapes in lib/mcp/tools/*), which
 *    prepends a `url` field and applies edits to the page's draft blocks.
 *
 * The field builders take the caller's `z` instance because the app (zod v3) and
 * the SDK (zod v4) resolve different `zod` copies — exporting schema *objects*
 * would bind them to one version. `buildAiEditToolFields(z)` returns raw field
 * records (no `z.object(...)`) so each surface composes its own object shape.
 */

/** Any Zod-like namespace (v3 or v4) — only the subset used below is required. */
type ZodLike = {
  string: () => any;
  number: () => any;
  any: () => any;
  array: (schema: any) => any;
  record: (keys: any, values: any) => any;
};

export const AI_EDIT_TOOL_DESCRIPTIONS = {
  read_block_html:
    "Read the full current HTML of one or more existing blocks by their bid (from the page outline). " +
    "ALWAYS call this before edit_block — never guess a block's markup. Batch all bids you need into one call.",
  edit_block:
    "Replace one existing block (identified by bid) with new HTML. The html must be the complete replacement " +
    "for the target element. Call read_block_html for the target first.",
  add_blocks:
    "Insert new HTML into the page. Use for new sections/elements built from standard HTML and special blocks " +
    "(repeater, partial-block, icon). Do NOT use for registered custom blocks — use add_custom_block.",
  remove_blocks:
    "Remove one or more existing blocks from the page by their block IDs (bid attribute). Use when the user asks to delete, clear, or replace content.",
  add_custom_block:
    "Add a registered custom block to the page using its schema-validated props. Use this instead of HTML for registered custom blocks. Unknown types return an error listing valid types.",
  bind_prop:
    "Set a data binding on a specific prop of an existing block. The binding path must come from the page's available data binding paths provided in your context — do not invent paths.",
  get_partial_blocks:
    "Retrieve all available partial blocks (global reusable sections such as header, footer, navigation). " +
    "Call this before building a full page layout or when the user asks to include a global section. " +
    "Returns each partial's ID, name, and description. Use the ID in <chai-partial-block partial-id='ID'>.",
  get_page_outline:
    "Get the compact outline of a page: one line per block as `bid | type | name | text`, indented by nesting. " +
    "Call this first to understand a page's structure, then read_block_html for the blocks you want to edit.",
} as const;

/**
 * Per-tool input field records (excluding the surface-specific `task`/`url`
 * fields). Field order is deliberate for edit_block/add_blocks: non-html fields
 * come before `html` so streaming clients learn the target before HTML flows.
 */
export const buildAiEditToolFields = (z: ZodLike) => ({
  read_block_html: {
    blockIds: z.array(z.string()).min(1).describe("bids of the blocks to read"),
  },
  edit_block: {
    blockId: z.string().describe("bid of the block to replace"),
    html: z.string().describe("Full replacement HTML for the target element"),
  },
  add_blocks: {
    // nullish: models routinely send null instead of omitting optional fields
    parentId: z.string().nullish().describe("bid of the parent container; omit to add at page root"),
    position: z.number().nullish().describe("Child index position; -1 or omit to append at end"),
    html: z.string().describe("HTML to insert"),
  },
  remove_blocks: {
    ids: z.array(z.string()).min(1).describe("Array of block IDs (bid attribute values) to remove"),
  },
  add_custom_block: {
    type: z.string().describe("Block type exactly as listed in the catalog, e.g. 'ProductCard'"),
    parentId: z.string().nullish().describe("bid of the parent block, or omit to add at page root"),
    position: z.number().nullish().describe("Child index position; -1 or omit to append at end"),
    props: z
      .record(z.string(), z.any())
      .describe(
        "Block props as a JSON object using camelCase keys matching the catalog schema. Use {{path.to.data}} values for bound props.",
      ),
  },
  bind_prop: {
    blockId: z.string().describe("bid of the block to update"),
    propName: z.string().describe("camelCase prop name on the block"),
    bindingPath: z
      .string()
      .describe("Full binding expression including double braces, e.g. '{{product.name}}' or '{{$index.title}}'"),
  },
});
