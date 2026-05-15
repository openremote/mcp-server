import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

const credentialSchema = (description: string) => ({
  password: z.string().describe(description),
  temporary: z
    .boolean()
    .optional()
    .describe("If true, the user must change the password on next login (default false)"),
});

function credential(password: string, temporary: boolean) {
  return { type: "password", value: password, temporary };
}

export function registerUserPasswordTools(server: McpServer) {
  server.registerTool(
    "request_password_reset",
    {
      description:
        "Trigger Keycloak's password-reset email flow for a user in a realm. Requires `write:admin`.",
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
        "Trigger Keycloak's password-reset email flow for the currently authenticated user.",
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

  server.registerTool(
    "update_password",
    {
      description:
        "Directly set a user's password. Requires `write:admin`. SECURITY: the password is forwarded to OpenRemote in plaintext over the auth-protected channel; do not pass through logs.",
      inputSchema: {
        realm: z.string(),
        userId: z.string(),
        ...credentialSchema("New password value"),
      },
    },
    async ({ realm, userId, password, temporary = false }) => {
      try {
        await rest.api.UserResource.updatePassword(
          realm,
          userId,
          credential(password, temporary) as any,
        );
        return {
          content: [
            { type: "text", text: `Password updated for user ${userId} in ${realm}` },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_current_password",
    {
      description:
        "Update the currently authenticated user's password. SECURITY: same caveat as update_password.",
      inputSchema: credentialSchema("New password value"),
    },
    async ({ password, temporary = false }) => {
      try {
        await rest.api.UserResource.updatePasswordCurrent(
          credential(password, temporary) as any,
        );
        return {
          content: [{ type: "text", text: "Password updated for current user" }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "reset_user_secret",
    {
      description:
        "Regenerate the OAuth client secret for a service user. The new secret is returned ONCE — store it before responding. Requires `write:admin`.",
      inputSchema: { realm: z.string(), userId: z.string() },
    },
    async ({ realm, userId }) => {
      try {
        const response = await rest.api.UserResource.resetSecret(realm, userId);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
