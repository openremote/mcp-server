# @openremote/mcp-server

> ⚠️ **Beta — early work.** API may change before 1.0. Use in production at your own risk. Feedback welcome via [GitHub Issues](https://github.com/openremote/mcp-server/issues).

A [Model Context Protocol](https://modelcontextprotocol.io) server for the [OpenRemote](https://openremote.io) IoT platform. Exposes asset and attribute operations as tools and resources for AI assistants like Claude Desktop and Claude Code.

## Capabilities

### Tools (43)

| Tool | Purpose |
|---|---|
| `query_assets` | Search assets by type, realm, parent, name, ids |
| `get_asset` | Read a single asset incl. attributes |
| `create_asset` | Create a new asset |
| `update_asset` | Partial update; merges attributes by default |
| `delete_assets` | Bulk delete by ids |
| `get_attribute` | Read one attribute (value + meta) |
| `write_attribute` | Write a single attribute value |
| `write_attributes` | Bulk write across assets |
| `get_attribute_history` | Time-series datapoints (`lttb`/`all`/`interval`/`nearest`) |
| `update_attribute_meta` | Partial-merge meta on one attribute |
| `get_asset_types` | List asset type descriptors |
| `get_value_descriptors` | List value type descriptors |
| `get_meta_item_descriptors` | List meta item descriptors |
| `query_users` | Query users with filters (realm, role, predicate) |
| `get_user` | Read a single user by ID within a realm |
| `create_user` | Create a user in a realm |
| `update_user` | Replace a user object (read first for partial updates) |
| `delete_user` | Delete a user from a realm |
| `request_password_reset` | Trigger Keycloak password-reset email for a user |
| `request_current_password_reset` | Trigger reset email for current user |
| `get_client_roles` | List role catalog for a client in a realm |
| `update_client_roles` | Replace client role catalog |
| `update_realm_roles` | Replace realm role catalog |
| `get_user_realm_roles` | List realm roles assigned to a user |
| `update_user_realm_roles` | Replace realm role assignments |
| `get_user_client_roles` | List client roles assigned to a user |
| `update_user_client_roles` | Replace client role assignments |
| `get_current_user_realm_roles` | List current user's realm roles |
| `get_current_user_client_roles` | List current user's client roles |
| `update_current_user` | Update the current user's profile |
| `update_current_user_locale` | Set the current user's locale code |
| `list_realms` | List ALL realms (admin) |
| `list_accessible_realms` | List realms accessible to current user |
| `get_realm` | Read a single realm by name |
| `create_realm` | Create a new realm |
| `update_realm` | Replace a realm object |
| `delete_realm` | Delete a realm (cascades to users/assets/rules) |
| `get_health_status` | System health (DB, gateway, …) |
| `get_system_info` | Version + build metadata |
| `query_syslog_events` | Filter syslog events (level, time, category) |
| `clear_syslog_events` | Delete all stored syslog events |
| `get_syslog_config` | Read syslog persistence config |
| `update_syslog_config` | Replace syslog persistence config |

### Resources (6)

| URI | What |
|---|---|
| `openremote://asset-model/types` | Catalog of asset types and their attribute descriptors |
| `openremote://asset-model/values` | Catalog of value types and constraints |
| `openremote://asset-model/meta` | Catalog of meta item descriptors |
| `openremote://realm/{name}` | A realm definition (templated; `list` enumerates accessible realms) |
| `openremote://status/health` | Live system health snapshot |
| `openremote://status/info` | Version + build metadata |

## Install

Run on demand with `npx`:

```bash
npx -y @openremote/mcp-server
```

Or install globally:

```bash
npm install -g @openremote/mcp-server
openremote-mcp
```

## Configuration

All configuration is via environment variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENREMOTE_HOST` | yes | — | Full URL, e.g. `https://demo.openremote.io` |
| `OPENREMOTE_CLIENT_ID` | yes | — | Service user client id |
| `OPENREMOTE_CLIENT_SECRET` | yes | — | Service user client secret |
| `OPENREMOTE_REALM` | no | `master` | Realm of the service user |

### Service user setup

1. Log into OpenRemote as a realm admin.
2. Create a **service user** in the relevant realm (`master` recommended for cross-realm access).
3. Grant roles: at minimum `read:assets`, `write:assets`. Add `read:admin`/`write:admin` for realm visibility.
4. Copy the generated client id and secret into the env vars above.

## Quickstart — Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your platform:

```json
{
  "mcpServers": {
    "openremote": {
      "command": "npx",
      "args": ["-y", "@openremote/mcp-server"],
      "env": {
        "OPENREMOTE_HOST": "https://your-instance.openremote.io",
        "OPENREMOTE_CLIENT_ID": "your-service-user",
        "OPENREMOTE_CLIENT_SECRET": "your-secret"
      }
    }
  }
}
```

Restart Claude Desktop. Try: *"list assets in master realm"* or *"attach the asset-types catalog as context"*.

## Quickstart — Claude Code

```bash
claude mcp add openremote -- npx -y @openremote/mcp-server
```

Set env vars in your shell profile or per-project `.env`.

## Local development

```bash
git clone https://github.com/openremote/mcp-server.git
cd mcp-server
npm install
cp .env.example .env   # then fill in values
npm run typecheck
npm test
npm run build
node dist/index.js     # starts on stdio
```

Use the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test interactively:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Roadmap

Deferred to v0.3.0+:

- HTTP / SSE transports
- Rule CRUD (`RulesResource`, `FlowResource`)
- Per-asset / per-attribute MCP resources, resource subscriptions
- `AlarmResource`, `NotificationResource`, `AppResource`, `ConsoleResource`, `AgentResource`, `DashboardResource`, `AssetPredictedDatapointResource`, `GatewayClientResource`, `GatewayServiceResource`, `ConfigurationResource`, `MapResource`, `ProvisioningResource`, `ExternalServiceResource`

## License

[AGPL-3.0-or-later](./LICENSE). Copyright OpenRemote contributors.
