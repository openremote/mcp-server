import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

const roleObjectSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    composite: z.boolean().optional(),
    clientRole: z.boolean().optional(),
    containerId: z.string().optional(),
  })
  .passthrough()
  .describe("Keycloak Role representation");

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerUserRoleTools(server: McpServer) {
  server.registerTool(
    "get_client_roles",
    {
      description:
        "List all roles defined on a client within a realm (the catalog of roles, not a user's assignments).",
      inputSchema: { realm: z.string(), clientId: z.string() },
    },
    async ({ realm, clientId }) => {
      try {
        const r = await rest.api.UserResource.getClientRoles(realm, clientId);
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_client_roles",
    {
      description:
        "Replace the set of roles defined on a client within a realm. Pass the full desired role catalog (existing roles not present in the array will be removed).",
      inputSchema: {
        realm: z.string(),
        clientId: z.string(),
        roles: z.array(roleObjectSchema),
      },
    },
    async ({ realm, clientId, roles }) => {
      try {
        await rest.api.UserResource.updateClientRoles(realm, clientId, roles as any);
        return { content: [{ type: "text", text: `Updated ${roles.length} client role(s)` }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_realm_roles",
    {
      description:
        "Replace the set of realm-level roles defined in a realm. Same all-or-nothing semantics as update_client_roles.",
      inputSchema: { realm: z.string(), roles: z.array(roleObjectSchema) },
    },
    async ({ realm, roles }) => {
      try {
        await rest.api.UserResource.updateRoles(realm, roles as any);
        return { content: [{ type: "text", text: `Updated ${roles.length} realm role(s)` }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_user_realm_roles",
    {
      description: "List realm-level role names assigned to a user.",
      inputSchema: { realm: z.string(), userId: z.string() },
    },
    async ({ realm, userId }) => {
      try {
        const r = await rest.api.UserResource.getUserRealmRoles(realm, userId);
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_user_realm_roles",
    {
      description:
        "Replace the realm-level roles assigned to a user. Pass the full desired set (existing assignments not in the array are removed).",
      inputSchema: {
        realm: z.string(),
        userId: z.string(),
        roles: z.array(z.string()).describe("Role names"),
      },
    },
    async ({ realm, userId, roles }) => {
      try {
        await rest.api.UserResource.updateUserRealmRoles(realm, userId, roles);
        return { content: [{ type: "text", text: `Updated realm roles for user ${userId}` }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_user_client_roles",
    {
      description: "List the client-role names assigned to a user for a specific client.",
      inputSchema: { realm: z.string(), userId: z.string(), clientId: z.string() },
    },
    async ({ realm, userId, clientId }) => {
      try {
        const r = await rest.api.UserResource.getUserClientRoles(realm, userId, clientId);
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_user_client_roles",
    {
      description: "Replace the client-role assignments for a user on a specific client.",
      inputSchema: {
        realm: z.string(),
        userId: z.string(),
        clientId: z.string(),
        roles: z.array(z.string()),
      },
    },
    async ({ realm, userId, clientId, roles }) => {
      try {
        await rest.api.UserResource.updateUserClientRoles(realm, userId, clientId, roles);
        return {
          content: [{ type: "text", text: `Updated ${clientId} roles for user ${userId}` }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_current_user_realm_roles",
    {
      description: "List realm-level role names assigned to the current user.",
      inputSchema: {},
    },
    async () => {
      try {
        const r = await rest.api.UserResource.getCurrentUserRealmRoles();
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_current_user_client_roles",
    {
      description: "List client-role names assigned to the current user for a specific client.",
      inputSchema: { clientId: z.string() },
    },
    async ({ clientId }) => {
      try {
        const r = await rest.api.UserResource.getCurrentUserClientRoles(clientId);
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
