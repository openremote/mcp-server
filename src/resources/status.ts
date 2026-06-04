import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import rest from "@openremote/rest";

export function registerStatusResources(server: McpServer) {
  server.registerResource(
    "status-health",
    "openremote://status/health",
    {
      title: "OpenRemote system health",
      description:
        "Live health status (DB, gateway, message broker, …). Snapshot at read time.",
      mimeType: "application/json",
    },
    async (uri) => {
      const response = await rest.api.StatusResource.getHealthStatus();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "status-info",
    "openremote://status/info",
    {
      title: "OpenRemote system information",
      description: "Version, build time, deployment metadata.",
      mimeType: "application/json",
    },
    async (uri) => {
      const response = await rest.api.StatusResource.getInfo();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    },
  );
}
