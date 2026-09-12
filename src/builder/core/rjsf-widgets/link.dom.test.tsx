/**
 * @vitest-environment happy-dom
 */
import { FieldProps } from "@rjsf/utils";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { LinkField } from "./link";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("~/builder/hooks/use-languages", () => ({
  useLanguages: () => ({
    selectedLang: "en",
    fallbackLang: "en",
    languages: [],
  }),
}));

vi.mock("~/builder/hooks/use-builder-prop", () => ({
  useBuilderProp: (prop: string, defaultValue?: unknown) => {
    if (prop === "pageTypes") return [{ type: "page", label: "Page" }];
    if (prop === "searchPageTypeItems") return async () => [];
    return defaultValue;
  },
}));

vi.mock("./binding-editor/binding-editor-widget", () => ({
  BindingTextField: () => null,
  useBindingInputEnabled: () => false,
}));

vi.mock("./data-binding-selector", () => ({
  DataBindingSelector: () => null,
}));

type LinkFormData = { type: string; href: string; target: string };

function ControlledLinkField({ initial }: { initial: LinkFormData }) {
  const [formData, setFormData] = useState(initial);
  return (
    <LinkField
      {...({
        schema: { title: "Link" },
        name: "link",
        formData,
        onChange: (next: LinkFormData) => setFormData(next),
      } as unknown as FieldProps)}
    />
  );
}

describe("LinkField type select focus", () => {
  it("does not focus the href input on initial mount", () => {
    render(<ControlledLinkField initial={{ type: "url", href: "", target: "self" }} />);

    expect(document.activeElement).not.toBe(screen.getByPlaceholderText("Enter URL"));
  });

  it("focuses the href input when the link type changes", async () => {
    render(<ControlledLinkField initial={{ type: "url", href: "", target: "self" }} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "email" } });

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByPlaceholderText("Enter details"));
    });
  });

  it("focuses the page search input when type changes to pageType", async () => {
    render(<ControlledLinkField initial={{ type: "url", href: "", target: "self" }} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "pageType" } });

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByPlaceholderText("Search pages"));
    });
  });
});
