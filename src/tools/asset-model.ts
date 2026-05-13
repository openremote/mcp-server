import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

export function registerAssetModelTools(server: McpServer) {
  server.registerTool(
    "get_asset_types",
    {
      description:
        "Get available asset types and their attribute descriptors. Use before creating assets to know valid types and expected attributes.",
    },
    async () => {
      try {
        const response = await rest.api.AssetModelResource.getAssetInfos();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "get_value_descriptors",
    {
      description:
        "Get available value types (number, text, boolean, etc.) and their constraints. Use when setting attribute types.",
    },
    async () => {
      try {
        const response = await rest.api.AssetModelResource.getValueDescriptors();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "get_meta_item_descriptors",
    {
      description:
        "Get available meta item descriptors (READ_ONLY, LABEL, UNITS, etc.). Use when setting attribute metadata.",
    },
    async () => {
      try {
        const response =
          await rest.api.AssetModelResource.getMetaItemDescriptors();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
