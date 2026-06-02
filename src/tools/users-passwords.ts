import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

export function registerUserPasswordTools(server: McpServer) {
  server.registerTool(
    "request_password_reset",
    {
      description:
        "Trigger Keycloak's password-reset email flow for a user in a realm. Requires `write:admin`. Requires a configured SMTP/mail server on the deployment — without one the backend returns a 500 (IllegalStateException), not a 4xx, and the error cannot be distinguished from an invalid user id.",
      inputSchema: { realm: z.string(), userId: z.string() },
    },
    async ({ realm, userId }) => {
      try {
        await rest.api.UserResource.requestPasswordReset(realm, userId);
        return {
          content: [
            { type: "text", text: `Password reset requested for user ${userId} in ${realm}` },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "request_current_password_reset",
    {
      description:
        "Trigger Keycloak's password-reset email flow for the currently authenticated user. Requires a configured SMTP/mail server on the deployment — without one the backend returns a 500 (IllegalStateException), not a 4xx.",
      inputSchema: {},
    },
    async () => {
      try {
        await rest.api.UserResource.requestPasswordResetCurrent();
        return {
          content: [
            { type: "text", text: "Password reset email requested for current user" },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
