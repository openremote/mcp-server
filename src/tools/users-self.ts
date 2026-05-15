import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

const userBodySchema = z
  .object({
    username: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    attributes: z.record(z.string(), z.any()).optional(),
  })
  .passthrough();

export function registerUserSelfTools(server: McpServer) {
  server.registerTool(
    "update_current_user",
    {
      description:
        "Update the currently authenticated user's own profile. Backend replaces the user with the supplied object.",
      inputSchema: { user: userBodySchema },
    },
    async ({ user }) => {
      try {
        const r = await rest.api.UserResource.updateCurrent(user as any);
        return {
          content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_current_user_locale",
    {
      description:
        "Update the locale (UI language) attribute for the currently authenticated user. Example values: 'en', 'nl_NL', 'de'.",
      inputSchema: {
        locale: z.string().describe("Locale code, e.g. 'en' or 'nl_NL'"),
      },
    },
    async ({ locale }) => {
      try {
        await rest.api.UserResource.updateCurrentUserLocale(locale);
        return { content: [{ type: "text", text: `Locale updated to ${locale}` }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
