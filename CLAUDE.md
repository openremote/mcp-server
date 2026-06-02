# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

```bash
npm run typecheck          # tsc --noEmit, must be 0 errors
npm test                   # vitest run (one shot)
npm run test:watch         # vitest in watch mode
npm run build              # tsup bundle → dist/index.js (with #!/usr/bin/env node shebang)
npm run dev                # tsup --watch
node dist/index.js         # run the built binary (stdio transport, reads env vars)
```

Run a single test file or test name:

```bash
npx vitest run tests/tools/attribute-meta.test.ts
npx vitest run -t "partial merge"
```

Smoke-test the running server with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

`npm run prepublishOnly` chains typecheck → test → build and runs on `npm publish`. CI (`.github/workflows/ci.yml`) runs the same chain on Node 24. Releases are tag-driven (`v*` push → `.github/workflows/publish.yml`).

## Required environment

Server fails to start without `OPENREMOTE_HOST`, `OPENREMOTE_CLIENT_ID`, `OPENREMOTE_CLIENT_SECRET`. `OPENREMOTE_REALM` defaults to `master`. The client credentials must belong to a **service user** in OpenRemote with at least `read:assets`/`write:assets` roles (add `read:admin`/`write:admin` for realm resource access). Copy `.env.example` → `.env` for local dev.

## Architecture

This is a **stdio-only** MCP server that wraps the OpenRemote REST API. The runtime shape is:

1. `src/index.ts` reads env → calls `rest.initialise(${host}/api/${realm}/)` from `@openremote/rest` → `initAuth(rest, config)` → `startStdio(config)`.
2. `src/auth.ts` performs OAuth2 client-credentials against `${host}/auth/realms/${realm}/protocol/openid-connect/token`, stores the token in a closure, schedules a self-timer to refresh ~60s before `expires_in`, and registers a `rest.addRequestInterceptor` that stamps `Authorization: Bearer …` on every outbound call. **The initial token fetch must succeed or the process exits**; subsequent refresh failures retry every 30s without crashing.
3. `src/transports/stdio.ts` wires `createServer(config)` (from `src/server.ts`) to `StdioServerTransport`. Stdout is the MCP channel — **never `console.log` from tool handlers**; status lines go to `console.error` only.
4. `src/server.ts` is the single registration point. It constructs `McpServer`, declares `capabilities` (`tools` and `resources`, `listChanged: false`), sets the `instructions` string the LLM sees, then calls `registerXxx(server)` for each tool/resource module. Adding a new tool or resource means writing a `registerXxx` function and importing it here.

Tool/resource modules under `src/tools/` and `src/resources/` follow a strict convention:

- Each exports a `registerXxx(server: McpServer)` that calls `server.registerTool(name, { description, inputSchema }, handler)` or `server.registerResource(name, uri|template, metadata, handler)`.
- `inputSchema` is a **plain object of Zod schemas** (not a `z.object`). The SDK wraps it.
- Handlers `await rest.api.SomeResource.method(...)`, return `{ content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] }`, and wrap everything in `try/catch` whose `catch` returns `errorResult(err)`.
- `src/error.ts::errorResult` is the single error formatter — it special-cases `isAxiosError` from `@openremote/rest` to extract status + server message and returns `{ content: [...], isError: true }`. Any new handler must use it instead of throwing or hand-rolling error JSON.

### Two non-trivial tools to be careful with

- **`update_attribute_meta`** (`src/tools/attribute-meta.ts`): OpenRemote has no per-attribute meta endpoint, so this is a GET → in-memory merge → PUT of the entire asset. Merge semantics are **partial**: existing meta keys are preserved, mentioned keys overwrite, and `value === null` removes the key. On 409/412 the operation retries **once** (single fresh GET, single re-PUT); after that it surfaces `isError: true`. Concurrent edits to *other* attributes between the GET and PUT may be silently lost if the backend doesn't emit a conflict — document any new behavior here in the tool description, not in comments.
- **`get_attribute_history`** (`src/tools/attribute-history.ts`): Zod schema is a flat object with optional fields, then the handler dispatches on `type` ("all" | "lttb" | "interval" | "nearest") to build the polymorphic `AssetDatapointQuery` body. Default is `lttb` with `amountOfPoints: 500` (chosen to bound payload size; the backend's own default is `all`, which is dangerous on wide ranges). The `nearest` variant: the backend constructor divides `fromTimestamp` by 1000 internally, so the tool passes Unix **ms** as-is — do not pre-convert.

### Test harness

Tests do **not** instantiate a real `McpServer`. `tests/helpers/capture.ts::captureServer()` returns a stub that records every `registerTool`/`registerResource` call into `tools[name]` / `resources[name]`, then tests invoke handlers directly with raw args. `tests/helpers/mock-rest.ts::makeAxiosError(status, data)` builds an object that `isAxiosError` accepts, so error-path tests can simulate any HTTP status. `@openremote/rest` is mocked per-test with `vi.mock("@openremote/rest", ...)`. When adding a new tool, follow this same pattern — don't try to spin up a real MCP transport in tests.

### Build details

`tsup.config.ts` bundles `@openremote/rest` and `@openremote/model` **into** the output (`noExternal`) so consumers don't need transitive peers, but keeps `axios` and `qs` external (they're in `dependencies`). Target is `node24`, format is ESM only, output is a single `dist/index.js` with `#!/usr/bin/env node` banner that maps to the `openremote-mcp` bin. The package is ESM (`"type": "module"`) and Node 24 is required at runtime — relative imports in `src/` must use the `.js` extension even though the source files are `.ts`.

## Scope boundaries (beta)

The v0.x line covers: stdio transport only; assets + attributes + asset-model; realms (read in v0.1.0, full CRUD in v0.2.0); users (Keycloak-backed: CRUD + roles + password-reset email flow, v0.2.0; sessions, direct-credential mutation, and self-service profile/locale writes excluded. Sessions/credentials are destructive footguns with LLM-context credential leakage; self-service writes (`update_current_user`, `update_current_user_locale`) are useless under service-account auth: the former 405s because the body's `isServiceAccount` defaults to false while the stored record is a service account, the latter is a no-op with no UI session); system status (health + info, v0.2.0); syslog (events + config, v0.2.0).

**Out of scope and should not be added without an explicit ask**: HTTP/SSE transports, rule CRUD or rule-model tools (`RulesResource`, `FlowResource`), per-asset/per-attribute MCP resources, resource subscriptions, Docker artifacts, and the following Resource interfaces (deferred to v0.3.0+): `AlarmResource`, `NotificationResource`, `AppResource`, `ConsoleResource`, `AgentResource`, `DashboardResource`, `AssetPredictedDatapointResource`, `GatewayClientResource`, `GatewayServiceResource`, `ConfigurationResource`, `MapResource`, `ProvisioningResource`, `ExternalServiceResource`.

The README's "beta" banner is load-bearing — any breaking change is allowed before 1.0 but should be reflected there.

### Conventions for new tool files (v0.2.0 onward)

When a Resource interface has many endpoints (e.g. `UserResource`), split into themed sub-files (`users-crud.ts`, `users-passwords.ts`, `users-roles.ts`) rather than one monolithic file. Each sub-file gets its own `registerXxx` exporter and matching test file. Cohesion guideline: keep each file under ~250 lines and centred on a single concern.

For endpoints where the backend replaces the entire object on PUT (`update_user`, `update_realm`, `update_syslog_config`), the tool description must say so explicitly — LLM-driven partial updates require a read-modify-write performed by the caller, not the tool. Only `update_attribute_meta` and `update_asset` do the read-modify-write internally; new tools must not silently introduce this pattern.

## Things that look like nits but aren't

- Memory rule: **never add Claude/AI co-author footers, "Generated with" lines, or similar attribution to commits, PR descriptions, or tags.**
- Don't `npm install` random deps to add error handling or retries — the existing `errorResult` + the single 409/412 retry in `attribute-meta.ts` are the only sanctioned patterns.
- Don't import from `dist/` anywhere in `src/` or `tests/`. The `outDir` is build output, not a module source.
