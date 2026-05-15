import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

export function registerUserSessionTools(server: McpServer) {
  server.registerTool(
    "get_user_sessions",
    {
      description: "List active Keycloak sessions for a user in a realm.",
      inputSchema: { realm: z.string(), userId: z.string() },
    },
    async ({ realm, userId }) => {
      try {
        const r = await rest.api.UserResource.getUserSessions(realm, userId);
        return {
          content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "disconnect_user_session",
    {
      description:
        "Forcefully disconnect (log out) a specific user session. NOTE: the upstream OpenRemote endpoint is a GET — this tool follows that contract even though it mutates state.",
      inputSchema: { realm: z.string(), sessionId: z.string() },
    },
    async ({ realm, sessionId }) => {
      try {
        await rest.api.UserResource.disconnectUserSession(realm, sessionId);
        return {
          content: [{ type: "text", text: `Disconnected session ${sessionId}` }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
