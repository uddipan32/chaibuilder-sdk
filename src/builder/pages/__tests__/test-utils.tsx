import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, RenderOptions } from "@testing-library/react";
import { Provider as JotaiProvider } from "jotai";
import { ReactElement, ReactNode } from "react";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface PagesTestProviderProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function PagesTestProvider({ children, queryClient }: PagesTestProviderProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <JotaiProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </JotaiProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options?: CustomRenderOptions) {
  const { queryClient, ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <PagesTestProvider queryClient={queryClient}>{children}</PagesTestProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from "@testing-library/react";
export { renderWithProviders as render };
