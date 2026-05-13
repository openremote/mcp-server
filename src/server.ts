import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AuthConfig } from "./auth.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerAttributeTools } from "./tools/attributes.js";
import { registerAssetModelTools } from "./tools/asset-model.js";
import { registerAttributeHistoryTool } from "./tools/attribute-history.js";
import { registerAttributeMetaTool } from "./tools/attribute-meta.js";
import { registerAssetModelResources } from "./resources/asset-model.js";
import { registerRealmResources } from "./resources/realms.js";

export function createServer(config: AuthConfig): McpServer {
  const server = new McpServer(
    {
      name: "openremote",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
      },
      instructions: `OpenRemote MCP server (BETA). Provides access to assets, attributes, and asset-model catalogs at ${config.host}.

Tools (LLM-invokable):
- query_assets / get_asset / create_asset / update_asset / delete_assets
- get_attribute / write_attribute / write_attributes
- get_attribute_history (time-series data points for an attribute)
- update_attribute_meta (partial-merge attribute metadata: label, units, ruleState, …)
- get_asset_types / get_value_descriptors / get_meta_item_descriptors

Resources (user-attachable context):
- openremote://asset-model/types
- openremote://asset-model/values
- openremote://asset-model/meta
- openremote://realm/{name}

Recommended flow: attach asset-model resources or call get_asset_types before creating/updating assets; call query_assets before mutating.`,
    },
  );

  registerAssetTools(server);
  registerAttributeTools(server);
  registerAssetModelTools(server);
  registerAttributeHistoryTool(server);
  registerAttributeMetaTool(server);
  registerAssetModelResources(server);
  registerRealmResources(server);

  return server;
}
