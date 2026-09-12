/**
 * @vitest-environment happy-dom
 */
import { render } from "@testing-library/react";

const selectedBlock = { current: { _id: "heading-1", _type: "Heading", content: "Heading goes here" } as any };
const hasChildren = { current: false };
const jsonFormProps: any[] = [];

vi.mock("~/builder/core/components/settings/json-form", () => ({
  JSONForm: (props: any) => {
    jsonFormProps.push(props);
    return <div data-testid="json-form" />;
  },
}));
vi.mock("./visibility-setting", () => ({ VisibilitySettings: () => null }));
vi.mock("~/builder/hooks/use-languages", () => ({ useLanguages: () => ({ selectedLang: "" }) }));
vi.mock("~/builder/hooks/use-chai-collections", () => ({ useChaiCollections: () => [] }));
vi.mock("~/builder/hooks/use-wrapper-block", () => ({ useWrapperBlock: () => null }));
vi.mock("~/builder/hooks/use-update-blocks-props", () => ({
  useUpdateBlocksProps: () => vi.fn(),
  useUpdateBlocksPropsRealtime: () => vi.fn(),
}));
vi.mock("~/builder/hooks/use-selected-blockIds", () => ({ useSelectedBlock: () => selectedBlock.current }));
vi.mock("~/builder/hooks/use-selected-block-has-children", () => ({
  useSelectedBlockHasChildren: () => hasChildren.current,
}));
const overrideProps = { current: ["content"] as string[] };

vi.mock("~/registry", () => ({
  getBlockFormSchemas: () => ({
    schema: {
      properties: { tag: { type: "string" }, content: { type: "string" }, items: { type: "array" } },
    },
    uiSchema: { content: { "ui:widget": "textarea", "ui:rows": 3 } },
  }),
  getChaiBlockStyleVariantProps: () => ({}),
  getRegisteredChaiBlock: () => ({ type: "Heading", childrenOverrideProps: overrideProps.current }),
}));

const BlockSettings = (await import("./block-settings")).default;

describe("BlockSettings - props the children override", () => {
  beforeEach(() => {
    jsonFormProps.length = 0;
    hasChildren.current = false;
    overrideProps.current = ["content"];
  });

  it("keeps the prop visible while the block has no children", () => {
    render(<BlockSettings />);

    expect(jsonFormProps[0].uiSchema.content).toEqual({ "ui:widget": "textarea", "ui:rows": 3 });
  });

  it("hides the prop once the block has children, keeping the rest of its uiSchema", () => {
    hasChildren.current = true;

    render(<BlockSettings />);

    expect(jsonFormProps[0].uiSchema.content).toEqual({ "ui:widget": "hidden", "ui:rows": 3 });
    expect(jsonFormProps[0].formData.content).toBe("Heading goes here");
  });

  it("hides an array prop with the empty field, which a hidden widget would not", () => {
    hasChildren.current = true;
    overrideProps.current = ["items"];

    render(<BlockSettings />);

    expect(jsonFormProps[0].uiSchema.items).toEqual({ "ui:field": "hiddenField" });
  });

  it("recomputes the uiSchema when the children appear", () => {
    render(<BlockSettings />);
    hasChildren.current = true;
    render(<BlockSettings />);

    expect(jsonFormProps[0].uiSchema.content["ui:widget"]).toBe("textarea");
    expect(jsonFormProps[1].uiSchema.content["ui:widget"]).toBe("hidden");
  });
});
