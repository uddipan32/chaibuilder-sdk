import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import React from "react";
import { describe, expect, it } from "vitest";
import { server } from "~/__mocks__/server";
import { renderWithProviders } from "~/pages/__tests__/test-utils";

describe("Example Pages Component Test", () => {
  it("should use MSW to mock API calls", async () => {
    server.use(
      http.get("/api/pages", () => {
        return HttpResponse.json({
          pages: [
            { id: "1", title: "Home" },
            { id: "2", title: "About" },
          ],
        });
      }),
    );

    const TestComponent = () => {
      const [data, setData] = React.useState<any>(null);

      React.useEffect(() => {
        fetch("/api/pages")
          .then((res) => res.json())
          .then(setData);
      }, []);

      if (!data) return <div>Loading...</div>;

      return (
        <div>
          {data.pages.map((page: any) => (
            <div key={page.id}>{page.title}</div>
          ))}
        </div>
      );
    };

    const { getByText } = renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(getByText("Home")).toBeInTheDocument();
      expect(getByText("About")).toBeInTheDocument();
    });
  });

  it("should handle API errors with MSW", async () => {
    server.use(
      http.get("/api/pages", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const TestComponent = () => {
      const [error, setError] = React.useState<string | null>(null);

      React.useEffect(() => {
        fetch("/api/pages")
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
          })
          .catch((err) => setError(err.message));
      }, []);

      if (error) return <div>Error: {error}</div>;

      return <div>Loading...</div>;
    };

    const { getByText } = renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(getByText(/error/i)).toBeInTheDocument();
    });
  });
});
