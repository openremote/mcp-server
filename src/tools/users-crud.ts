import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

export function registerUserCrudTools(server: McpServer) {
  const stringPredicateSchema = z
    .object({
      predicateType: z.literal("string").default("string"),
      value: z.string().optional(),
      match: z.enum(["EXACT", "BEGIN", "END", "CONTAINS"]).optional(),
      caseSensitive: z.boolean().optional(),
      negate: z.boolean().optional(),
    })
    .describe("Keycloak StringPredicate; e.g. {value:'alice', match:'EXACT'}");

  server.registerTool(
    "query_users",
    {
      description:
        "Query users in OpenRemote with filters (realm, role, predicate). Returns the raw User[] array. Predicate fields (usernames/clientRoles/realmRoles) are StringPredicate[] — wrap plain strings as {value, match:'EXACT'}.",
      inputSchema: {
        realmPredicate: z
          .object({ name: z.string() })
          .optional()
          .describe("Restrict query to the named realm"),
        usernames: z.array(stringPredicateSchema).optional(),
        clientRoles: z.array(stringPredicateSchema).optional(),
        realmRoles: z.array(stringPredicateSchema).optional(),
        ids: z.array(z.string()).optional(),
        assets: z.array(z.string()).optional().describe("Restrict to users linked to these asset IDs"),
        serviceUsers: z.boolean().optional(),
        limit: z.number().int().min(1).max(1000).optional(),
        offset: z.number().int().min(0).optional(),
        select: z.record(z.string(), z.any()).optional(),
        orderBy: z
          .object({
            property: z.string().optional(),
            descending: z.boolean().optional(),
          })
          .optional(),
      },
    },
    async (args) => {
      try {
        const response = await rest.api.UserResource.query(args as any);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_user",
    {
      description: "Get a single user by ID within a realm.",
      inputSchema: {
        realm: z.string().describe("Realm name"),
        userId: z.string().describe("User ID (Keycloak UUID)"),
      },
    },
    async ({ realm, userId }) => {
      try {
        const response = await rest.api.UserResource.get(realm, userId);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  const userBodySchema = z
    .looseObject({
      id: z.string().optional(),
      username: z.string().optional(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      enabled: z.boolean().optional(),
      attributes: z.record(z.string(), z.any()).optional(),
    })
    .describe("User object (Keycloak user representation). Unknown keys are forwarded.");

  server.registerTool(
    "create_user",
    {
      description:
        "Create a new user in a realm. Requires `write:admin` role. Returns the created user including its Keycloak ID.",
      inputSchema: {
        realm: z.string().describe("Realm to create the user in"),
        user: userBodySchema,
      },
    },
    async ({ realm, user }) => {
      try {
        const response = await rest.api.UserResource.create(realm, user as any);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_user",
    {
      description:
        "Update a user in a realm. Requires `write:admin` role. Backend replaces the user with the supplied object — read with get_user first if doing a partial update.",
      inputSchema: {
        realm: z.string(),
        user: userBodySchema,
      },
    },
    async ({ realm, user }) => {
      try {
        const response = await rest.api.UserResource.update(realm, user as any);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "delete_user",
    {
      description: "Delete a user from a realm. Irreversible.",
      inputSchema: {
        realm: z.string(),
        userId: z.string(),
      },
    },
    async ({ realm, userId }) => {
      try {
        await rest.api.UserResource.delete(realm, userId);
        return {
          content: [
            { type: "text", text: `Deleted user ${userId} from realm ${realm}` },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
