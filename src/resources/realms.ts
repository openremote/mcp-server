import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import rest from "@openremote/rest";

export function registerRealmResources(server: McpServer) {
  server.registerResource(
    "realm",
    new ResourceTemplate("openremote://realm/{name}", {
      list: async () => {
        const realms = (await rest.api.RealmResource.getAccessible()).data;
        return {
          resources: realms.map((r) => ({
            uri: `openremote://realm/${r.name}`,
            name: r.displayName ?? r.name ?? "",
            mimeType: "application/json",
          })),
        };
      },
    }),
    {
      title: "OpenRemote realm",
      description:
        "A Keycloak realm definition (name, display name, enabled flag, configured roles).",
      mimeType: "application/json",
    },
    async (uri, { name }) => {
      const realmName = Array.isArray(name) ? name[0] : name;
      const response = await rest.api.RealmResource.get(realmName);
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
