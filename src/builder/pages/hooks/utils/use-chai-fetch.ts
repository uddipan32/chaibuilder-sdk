import { useCallback } from "react";
import { useAccessToken } from "~/builder/pages/hooks/use-access-token";
import { useChaiAuth } from "~/builder/pages/hooks/use-chai-auth";
import {
  ChaiHttpActionRequestError,
  isChaiHttpActionFailure,
  parseChaiHttpActionResponse,
} from "~/builder/pages/utils/parse-chai-http-action-response";

export const useChaiFetch = () => {
  const { logout } = useChaiAuth();
  const { getAccessToken } = useAccessToken();
  return useCallback(
    async ({
      url,
      method = "GET",
      body = {},
      headers = {},
    }: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      url: string;
      body?: any;
      headers?: Record<string, string>;
    }) => {
      const authToken = await getAccessToken();
      if (!url) {
        throw new Error("URL is required");
      }
      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            ...headers,
          },
          body: JSON.stringify(body),
        });

        const bodyJson = await response.json();

        if (response.status === 401 || (isChaiHttpActionFailure(bodyJson) && bodyJson.error.status === 401)) {
          console.log("Session expired", response);
          await logout();
          window.location.reload();
          return null;
        }

        if (!response.ok || isChaiHttpActionFailure(bodyJson)) {
          if (isChaiHttpActionFailure(bodyJson)) {
            throw new ChaiHttpActionRequestError(
              bodyJson.error.message,
              bodyJson.error.code,
              bodyJson.error.status,
              bodyJson.error.metadata,
            );
          }

          throw new ChaiHttpActionRequestError("Something went wrong.", "INTERNAL_ERROR", response.status || 500);
        }

        return parseChaiHttpActionResponse(bodyJson, response.status);
      } catch (error) {
        console.log("Something went wrong", error);
        throw error;
      }
    },
    [logout, getAccessToken],
  );
};
