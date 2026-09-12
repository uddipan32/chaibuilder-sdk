/**
 * @vitest-environment happy-dom
 */
import { render, screen } from "@testing-library/react";
import type { WidgetProps } from "@rjsf/utils";
import { RepeaterBindingWidget } from "./repeater-binding";
import { useRepeaterSource } from "~/builder/core/rjsf-widgets/repeater-data/use-repeater-source";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";

vi.mock("~/builder/core/rjsf-widgets/repeater-data/use-repeater-source", () => ({ useRepeaterSource: vi.fn() }));
vi.mock("~/builder/hooks/use-builder-prop", () => ({ useBuilderProp: vi.fn() }));
vi.mock("~/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
}));

const sourceMock = useRepeaterSource as ReturnType<typeof vi.fn>;
const builderPropMock = useBuilderProp as ReturnType<typeof vi.fn>;

const widget = (value: string) => render(<RepeaterBindingWidget {...({ value, onChange: vi.fn() } as unknown as WidgetProps)} />);

beforeEach(() => {
  builderPropMock.mockImplementation((key: string, fallback: unknown) =>
    key === "collections" ? [{ id: "col_8f3a", name: "Blog posts" }] : fallback,
  );
});

describe("RepeaterBindingWidget", () => {
  it("shows the collection name for a legacy collection binding", () => {
    sourceMock.mockReturnValue({ kind: "collection", id: "col_8f3a" });
    widget("{{#col_8f3a}}");
    expect(screen.getByText("Blog posts")).toBeTruthy();
    expect(screen.queryByText("col_8f3a")).toBeNull();
  });

  it("falls back to the id when the collection no longer exists", () => {
    sourceMock.mockReturnValue({ kind: null, id: null });
    widget("{{#gone_123}}");
    expect(screen.getByText("gone_123")).toBeTruthy();
  });

  it("keeps the repeater-data name for repeater data sources", () => {
    sourceMock.mockReturnValue({ kind: "repeaterData", id: "posts", definition: { name: "posts" } });
    widget("{{#posts}}");
    expect(screen.getByText("Posts")).toBeTruthy();
  });
});
