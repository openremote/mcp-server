import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

export function registerStatusTools(server: McpServer) {
  server.registerTool(
    "get_health_status",
    {
      description:
        "Get the OpenRemote system health status (database, gateway, etc.). Requires `read:admin`. Returns a map keyed by component.",
      inputSchema: {},
    },
    async () => {
      try {
        const r = await rest.api.StatusResource.getHealthStatus();
        return {
          content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_system_info",
    {
      description:
        "Get OpenRemote system information (version, build time, deployment metadata). Public — no admin role required.",
      inputSchema: {},
    },
    async () => {
      try {
        const r = await rest.api.StatusResource.getInfo();
        return {
          content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
