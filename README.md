# @openremote/mcp-server

> ⚠️ **Beta — early work.** API may change before 1.0. Use in production at your own risk. Feedback welcome via [GitHub Issues](https://github.com/openremote/mcp-server/issues).

A [Model Context Protocol](https://modelcontextprotocol.io) server for the [OpenRemote](https://openremote.io) IoT platform. Exposes asset and attribute operations as tools and resources for AI assistants like Claude Desktop and Claude Code.

## Capabilities

### Tools (10)

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
| `update_attribute_meta` | Partial-merge meta on one attribute (`label`, `units`, `ruleState`, …) |
| `get_asset_types` | List asset type descriptors |
| `get_value_descriptors` | List value type descriptors |
| `get_meta_item_descriptors` | List meta item descriptors |

### Resources (4)

| URI | What |
|---|---|
| `openremote://asset-model/types` | Catalog of asset types and their attribute descriptors |
| `openremote://asset-model/values` | Catalog of value types and constraints |
| `openremote://asset-model/meta` | Catalog of meta item descriptors |
| `openremote://realm/{name}` | A realm definition (templated; `list` enumerates accessible realms) |

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

## Roadmap (post-1.0)

- Streamable HTTP transport
- Rule CRUD tools (`create_ruleset`, etc.) and rule-model resources
- Per-asset / per-attribute MCP resources
- Resource subscriptions
- Realm CRUD

## Listing on mcpservers.org

After publishing, submit (or update the existing OpenRemote entry on) [mcpservers.org](https://mcpservers.org) by opening a PR to its registry repo pointing at `@openremote/mcp-server` on npm. Provenance attestations from this repo's publish workflow give consumers a verifiable build.

## License

[AGPL-3.0-or-later](./LICENSE). Copyright OpenRemote contributors.
