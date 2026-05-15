import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

const realmBodySchema = z
  .object({
    name: z.string().optional(),
    displayName: z.string().optional(),
    enabled: z.boolean().optional(),
    notBefore: z.number().optional(),
    resetPasswordAllowed: z.boolean().optional(),
    duplicateEmailsAllowed: z.boolean().optional(),
    rememberMe: z.boolean().optional(),
    registrationAllowed: z.boolean().optional(),
    registrationEmailAsUsername: z.boolean().optional(),
    verifyEmail: z.boolean().optional(),
    loginWithEmailAllowed: z.boolean().optional(),
    accountTheme: z.string().optional(),
    adminTheme: z.string().optional(),
    emailTheme: z.string().optional(),
    loginTheme: z.string().optional(),
  })
  .passthrough()
  .describe("OpenRemote Realm representation (Keycloak realm subset). Unknown keys are forwarded.");

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerRealmTools(server: McpServer) {
  server.registerTool(
    "list_realms",
    {
      description:
        "List ALL realms in the deployment. Admin-only (`read:admin`). Use list_accessible_realms for the non-admin variant.",
      inputSchema: {},
    },
    async () => {
      try {
        const r = await rest.api.RealmResource.getAll();
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "list_accessible_realms",
    {
      description:
        "List realms accessible to the currently authenticated user. Returns name + displayName only (configuration redacted).",
      inputSchema: {},
    },
    async () => {
      try {
        const r = await rest.api.RealmResource.getAccessible();
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_realm",
    {
      description:
        "Get a single realm by name. Mirrors the openremote://realm/{name} MCP resource for LLM-initiated reads.",
      inputSchema: { name: z.string() },
    },
    async ({ name }) => {
      try {
        const r = await rest.api.RealmResource.get(name);
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "create_realm",
    {
      description: "Create a new realm. Requires `write:admin`.",
      inputSchema: { realm: realmBodySchema },
    },
    async ({ realm }) => {
      try {
        await rest.api.RealmResource.create(realm as any);
        return {
          content: [{ type: "text", text: `Created realm ${realm.name ?? "(unnamed)"}` }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_realm",
    {
      description:
        "Update a realm by name. Backend replaces the realm with the supplied object — read with get_realm first if doing a partial update.",
      inputSchema: { name: z.string(), realm: realmBodySchema },
    },
    async ({ name, realm }) => {
      try {
        await rest.api.RealmResource.update(name, realm as any);
        return { content: [{ type: "text", text: `Updated realm ${name}` }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "delete_realm",
    {
      description:
        "Delete a realm by name. Irreversible — also deletes all users, assets, and rules in that realm.",
      inputSchema: { name: z.string() },
    },
    async ({ name }) => {
      try {
        await rest.api.RealmResource.delete(name);
        return { content: [{ type: "text", text: `Deleted realm ${name}` }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
