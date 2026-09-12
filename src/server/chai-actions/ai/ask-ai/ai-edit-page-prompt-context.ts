import { CHAI_BUILT_IN_DESIGN_TOKENS } from "~/constants/BUILTIN_TOKENS";
import { isBlockAvailableForPageType } from "~/builder/core/functions/block-helpers";
import { getAllRegisteredChaiBlocks } from "~/registry";
import { getRegisteredChaiPipes } from "~/registry/pipes";
import { serializePipeLiteral } from "~/render/binding-pipes";
import { getResolvedPageType } from "~/server/defaults/config-registry";
import { ChaiAIActionData } from "../../base-ai-action";

/**
 * Block types rendered as semantic HTML for the AI. Everything else is a
 * custom block, listed in the catalog and shown as a <chai-*> web component.
 * PartialBlock and Repeater are NOT here — they are special blocks documented
 * separately in the system prompt.
 */
const CORE_BLOCK_TYPES = new Set([
  "Box",
  "Button",
  "Checkbox",
  "Divider",
  "EmptyBox",
  "Form",
  "FormButton",
  "Heading",
  "Input",
  "Label",
  "LineBreak",
  "Link",
  "List",
  "ListItem",
  "Paragraph",
  "Radio",
  "RichText",
  "Select",
  "Span",
  "Text",
  "TextArea",
  "Video",
  "Icon",
  "GlobalBlock",
]);

export const buildDesignTokensList = (designTokens: ChaiAIActionData["designTokens"]): string => {
  const mergedTokens = { ...CHAI_BUILT_IN_DESIGN_TOKENS, ...(designTokens || {}) };
  return Object.entries(mergedTokens)
    .filter(([, token]) => token != null && !token.archived)
    .map(([id, token]) => `- ${id}: ${token.value} (${token.name})`)
    .join("\n");
};

export const buildCustomBlockCatalog = (pageType?: string): string => {
  const allBlocks = getAllRegisteredChaiBlocks();
  const customBlockEntries = Object.entries(allBlocks).filter(([registryKey, block]) => {
    const blockType = block.type ?? registryKey;
    if (!blockType || CORE_BLOCK_TYPES.has(blockType) || !isBlockAvailableForPageType(block, pageType || "page")) {
      return false;
    }
    // Skip data-provider-only registry stubs created before block registration.
    return Boolean(block.label ?? block.props);
  });

  if (customBlockEntries.length === 0) {
    return "No custom blocks registered.";
  }

  return customBlockEntries
    .map(([registryKey, b]) => {
      const blockType = b.type ?? registryKey;
      const props = b.props?.schema?.properties
        ? Object.entries(b.props.schema.properties as Record<string, any>)
            .filter(([, v]) => !v?.styles && !v?.runtime && !v?.hidden)
            .map(([key, v]) => {
              const type = Array.isArray(v?.type) ? v.type.join("|") : (v?.type ?? "any");
              const def = v?.default !== undefined ? ` (default: ${JSON.stringify(v.default)})` : "";
              const aiNote = b.aiProps?.includes(key) ? " [AI-settable]" : "";
              return `  - ${key} (${type})${def}${aiNote}: ${v?.title ?? key}`;
            })
            .join("\n")
        : "  (no declared props)";
      const wrapperNote = b.wrapper ? " [wrapper — can contain child blocks]" : "";
      const kebabType = blockType.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`).replace(/^-/, "");
      // b.description is defined on ChaiBlockConfig — use it as the primary AI hint
      return `### ${blockType} → <chai-${kebabType}>${wrapperNote}\nDescription: ${b.description ?? b.label}\nProps:\n${props}`;
    })
    .join("\n\n");
};

export type AiArrayBinding = {
  path: string;
  scope: "global" | "page";
  itemType: string;
  itemFields: { name: string; type: string }[];
};

export type AiDataBindingPaths = {
  global: string[];
  page: string[];
  arrays?: AiArrayBinding[];
  pathTypes?: Record<string, string>;
};

const buildArrayBindingLine = (array: AiArrayBinding): string => {
  const head = `- (${array.scope}) {{${array.path}}}`;
  if (array.itemFields.length > 0) {
    const fields = array.itemFields.map((f) => `{{$index.${f.name}}} (${f.type})`).join(", ");
    return `${head} — array of objects. Item fields: ${fields}`;
  }
  if (array.itemType === "unknown") {
    return `${head} — array, empty right now so item fields are unknown. Bind it only if the user names the fields.`;
  }
  return `${head} — array of ${array.itemType} values. Use {{$index}} for each item.`;
};

export const buildDataBindingPathsText = (dataBindingPaths: AiDataBindingPaths | undefined): string => {
  const bindingPayload = dataBindingPaths ?? { global: [], page: [] };
  const describePath = (scope: "global" | "page", path: string) => {
    const type = bindingPayload.pathTypes?.[path];
    return `- (${scope}) {{${path}}}${type ? ` (${type})` : ""}`;
  };
  const globalLines = bindingPayload.global.map((path) => describePath("global", path));
  const pageLines = bindingPayload.page.map((path) => describePath("page", path));
  const allLines = [...globalLines, ...pageLines];
  const pathsText = allLines.length > 0 ? allLines.join("\n") : "No data binding paths available for this page.";

  const arrays = bindingPayload.arrays ?? [];
  if (arrays.length === 0) return pathsText;

  const arraysText = arrays.map(buildArrayBindingLine).join("\n");
  return `${pathsText}\n\nArrays — these are the only paths a Repeater can iterate. Set \`repeater-items="{{arrayPath}}"\` on the Repeater, then bind its child blocks to the item fields listed below using {{$index.field}}:\n${arraysText}`;
};

const describeDataBindingPipe = (pipe: ReturnType<typeof getRegisteredChaiPipes>[number]): string => {
  const accepted = pipe.accepts?.join("|") || "any";
  const args = (pipe.args ?? [])
    .map((argument) => {
      const required = argument.required ? "required" : "optional";
      const defaultValue = argument.default !== undefined ? `, default ${serializePipeLiteral(argument.default)}` : "";
      const options = argument.options?.length
        ? `, one of ${argument.options.map((option) => serializePipeLiteral(option.value)).join("|")}`
        : "";
      return `${argument.name}:${argument.type} (${required}${defaultValue}${options})`;
    })
    .join("; ");
  const argumentDefinitions = pipe.args ?? [];
  const lastRequiredArgument = argumentDefinitions.reduce(
    (lastIndex, argument, index) => (argument.required ? index : lastIndex),
    -1,
  );
  const exampleArgumentCount =
    lastRequiredArgument >= 0 ? lastRequiredArgument + 1 : argumentDefinitions[0]?.default !== undefined ? 1 : 0;
  const exampleArgs = argumentDefinitions.slice(0, exampleArgumentCount).map((argument) => {
    if (argument.default !== undefined && argument.default !== "") return argument.default;
    if (argument.options?.length) return argument.options[0].value;
    if (argument.type === "number") return 0;
    if (argument.type === "boolean") return true;
    if (argument.type === "literal") return "value";
    return "value";
  });
  const example = `{{path | ${pipe.name}${exampleArgs.length ? ` ${exampleArgs.map(serializePipeLiteral).join(" ")}` : ""}}}`;
  const usageWarning =
    pipe.name === "default"
      ? " USE ONLY when user explicitly requests a fallback value; never append it routinely."
      : "";
  return `- ${pipe.name} [${accepted} → ${pipe.returns ?? "any"}]${args ? ` args: ${args}` : ""}. Example: ${example}${pipe.description ? ` — ${pipe.description}` : ""}${usageWarning}`;
};

export const buildDataBindingPipesText = (): string => {
  const pipes = getRegisteredChaiPipes();
  const valuePipes = pipes
    .filter((pipe) => pipe.returns !== "boolean" && pipe.name !== "default")
    .map(describeDataBindingPipe)
    .join("\n");
  const fallbackPipes = pipes
    .filter((pipe) => pipe.name === "default")
    .map(describeDataBindingPipe)
    .join("\n");
  const visibilityPipes = pipes
    .filter((pipe) => pipe.returns === "boolean")
    .map(describeDataBindingPipe)
    .join("\n");
  return `Plain bindings need no formatter: {{path}}. Add a formatter only when it changes output required by the user. Never add default automatically.\nChoose pipes whose accepted input type matches the binding path type. Pipe output becomes next pipe's input.\n\nValue formatters (regular block properties only):\n${valuePipes || "- None registered."}\n\nFallback formatter (opt-in only):\n${fallbackPipes || "- None registered."}\n\nBoolean formatters (conditional visibility / _show only):\n${visibilityPipes || "- None registered."}`;
};

export const buildPageTypeContext = (pageTypeKey: string | undefined): string => {
  if (!pageTypeKey) return "Standard page (no specific page type).";
  const registeredPageType = getResolvedPageType(pageTypeKey);
  const description = registeredPageType?.description ?? registeredPageType?.helpText;
  return description ? `Page type: ${pageTypeKey}\n${description}` : `Page type: ${pageTypeKey}`;
};

/**
 * Fill the shared context placeholders of an AI edit system prompt and append
 * site/page information. Used by the page-edit action; the block-edit action
 * can adopt it when it migrates.
 */
export const fillAiEditSystemPromptContext = (
  systemPrompt: string,
  data: Pick<ChaiAIActionData, "designTokens" | "context" | "options">,
): string => {
  let prompt = systemPrompt;
  prompt = prompt.replace("{{DESIGN_TOKENS_LIST}}", buildDesignTokensList(data.designTokens));
  prompt = prompt.replace("{{CUSTOM_BLOCK_CATALOG}}", buildCustomBlockCatalog(data?.options?.pageType));
  prompt = prompt.replace("{{DATA_BINDING_PATHS}}", buildDataBindingPathsText(data?.options?.dataBindingPaths));
  prompt = prompt.replace("{{DATA_BINDING_PIPES}}", buildDataBindingPipesText());
  prompt = prompt.replace("{{PAGE_TYPE_CONTEXT}}", buildPageTypeContext(data?.options?.pageType));

  if (data.context) {
    prompt += "\n\n## Additional Information";
    if (data.context?.site) {
      prompt += `\n\n## Website Information\n${JSON.stringify(data.context.site)}`;
    }
    if (data.context?.page) {
      prompt += `\n\n## Page Information\n${JSON.stringify(data.context.page)}`;
    }
  }

  return prompt;
};
