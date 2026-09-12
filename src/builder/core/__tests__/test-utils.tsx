import { render, RenderOptions } from "@testing-library/react";
import { Provider } from "jotai";
import { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

export type MockDocument = {
  documentElement: {
    classList: {
      add: ReturnType<typeof vi.fn<(className: string) => void>>;
      remove: ReturnType<typeof vi.fn<(className: string) => void>>;
    };
  };
};

interface CoreTestProviderProps {
  children: ReactNode;
}

export function CoreTestProvider({ children }: CoreTestProviderProps) {
  return <Provider>{children}</Provider>;
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  wrapper?: typeof CoreTestProvider;
}

export function renderWithJotai(ui: ReactElement, options?: CustomRenderOptions) {
  return render(ui, { wrapper: CoreTestProvider, ...options });
}

export * from "@testing-library/react";
export { renderWithJotai as render };
