import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AuthConfig } from "./auth.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerAttributeTools } from "./tools/attributes.js";
import { registerAssetModelTools } from "./tools/asset-model.js";
import { registerAttributeHistoryTool } from "./tools/attribute-history.js";
import { registerAttributeMetaTool } from "./tools/attribute-meta.js";
import { registerUserCrudTools } from "./tools/users-crud.js";
import { registerUserPasswordTools } from "./tools/users-passwords.js";
import { registerUserRoleTools } from "./tools/users-roles.js";
import { registerRealmTools } from "./tools/realms.js";
import { registerStatusTools } from "./tools/status.js";
import { registerSyslogTools } from "./tools/syslog.js";
import { registerAssetModelResources } from "./resources/asset-model.js";
import { registerRealmResources } from "./resources/realms.js";
import { registerStatusResources } from "./resources/status.js";

export function createServer(config: AuthConfig): McpServer {
  const server = new McpServer(
    {
      name: "openremote",
      version: "0.2.0",
    },
    {
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
      },
      instructions: `OpenRemote MCP server (BETA). Provides access to assets, attributes, asset-model, users, realms, system status, and syslog at ${config.host}.

Tools — assets and attributes:
- query_assets / get_asset / create_asset / update_asset / delete_assets
- get_attribute / write_attribute / write_attributes
- get_attribute_history (time-series data points)
- update_attribute_meta (partial-merge attribute metadata)
- get_asset_types / get_value_descriptors / get_meta_item_descriptors

Tools — users (Keycloak-backed):
- query_users / get_user / create_user / update_user / delete_user
- request_password_reset / request_current_password_reset
- get_client_roles / update_client_roles / update_realm_roles / get_user_realm_roles / update_user_realm_roles / get_user_client_roles / update_user_client_roles / get_current_user_realm_roles / get_current_user_client_roles

Tools — realms:
- list_realms / list_accessible_realms / get_realm / create_realm / update_realm / delete_realm

Tools — system:
- get_health_status / get_system_info

Tools — syslog:
- query_syslog_events / clear_syslog_events / get_syslog_config / update_syslog_config

Resources (user-attachable context):
- openremote://asset-model/types
- openremote://asset-model/values
- openremote://asset-model/meta
- openremote://realm/{name}
- openremote://status/health
- openremote://status/info

Recommended flow: attach asset-model resources or call get_asset_types before creating/updating assets; call query_assets before mutating. For multi-realm work, call list_accessible_realms first.`,
    },
  );

  registerAssetTools(server);
  registerAttributeTools(server);
  registerAssetModelTools(server);
  registerAttributeHistoryTool(server);
  registerAttributeMetaTool(server);
  registerUserCrudTools(server);
  registerUserPasswordTools(server);
  registerUserRoleTools(server);
  registerRealmTools(server);
  registerStatusTools(server);
  registerSyslogTools(server);
  registerAssetModelResources(server);
  registerRealmResources(server);
  registerStatusResources(server);

  return server;
}
