import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import type { Asset } from "@openremote/model";
import { errorResult } from "../error.js";

export function registerAssetTools(server: McpServer) {
  server.registerTool(
    "create_asset",
    {
      description: "Create a new asset in OpenRemote",
      inputSchema: {
        name: z.string().describe("Display name for the asset"),
        type: z
          .string()
          .describe(
            'Asset type, e.g. "ThingAsset", "BuildingAsset", "WeatherAsset". Use the get_asset_types tool to see available types.'
          ),
        realm: z
          .string()
          .optional()
          .describe("Realm to create in (defaults to auth realm)"),
        parentId: z
          .string()
          .optional()
          .describe("Parent asset ID for hierarchy"),
        accessPublicRead: z
          .boolean()
          .optional()
          .describe("Whether the asset is publicly readable"),
        attributes: z
          .record(
            z.string(),
            z.object({
              type: z
                .string()
                .optional()
                .describe('Value type, e.g. "number", "text", "boolean"'),
              value: z.any().optional().describe("Initial value"),
              meta: z.record(z.string(), z.any()).optional().describe("Metadata items"),
            })
          )
          .optional()
          .describe("Map of attribute name to attribute definition"),
      },
    },
    async (args) => {
      try {
        const asset: Partial<Asset> = {
          name: args.name,
          type: args.type,
        };
        if (args.realm) asset.realm = args.realm;
        if (args.parentId) asset.parentId = args.parentId;
        if (args.accessPublicRead !== undefined)
          asset.accessPublicRead = args.accessPublicRead;
        if (args.attributes) {
          asset.attributes = {};
          for (const [name, def] of Object.entries(args.attributes)) {
            asset.attributes[name] = {
              name,
              ...(def.type && { type: def.type }),
              ...(def.value !== undefined && { value: def.value }),
              ...(def.meta && { meta: def.meta }),
            } as any;
          }
        }
        const response = await rest.api.AssetResource.create(asset as Asset);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "get_asset",
    {
      description: "Get a single asset by ID, including all attributes",
      inputSchema: {
        assetId: z.string().describe("The 22-character asset ID"),
      },
    },
    async ({ assetId }) => {
      try {
        const response = await rest.api.AssetResource.get(assetId);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "update_asset",
    {
      description:
        "Update an existing asset. Fetches current state, merges changes, saves. Attributes are merged by default.",
      inputSchema: {
        assetId: z.string().describe("The asset ID to update"),
        name: z.string().optional().describe("New name"),
        parentId: z
          .string()
          .nullable()
          .optional()
          .describe("New parent ID, or null to remove parent"),
        accessPublicRead: z
          .boolean()
          .optional()
          .describe("Public read access"),
        attributes: z
          .record(
            z.string(),
            z.object({
              type: z.string().optional(),
              value: z.any().optional(),
              meta: z.record(z.string(), z.any()).optional(),
            })
          )
          .optional()
          .describe("Attributes to add or update (merged with existing)"),
        replaceAllAttributes: z
          .boolean()
          .optional()
          .describe(
            "If true, provided attributes replace all existing attributes entirely"
          ),
      },
    },
    async (args) => {
      try {
        const current = (await rest.api.AssetResource.get(args.assetId)).data;

        if (args.name !== undefined) current.name = args.name;
        if (args.parentId !== undefined)
          current.parentId = args.parentId ?? undefined;
        if (args.accessPublicRead !== undefined)
          current.accessPublicRead = args.accessPublicRead;

        if (args.attributes) {
          if (args.replaceAllAttributes) {
            current.attributes = {};
          }
          if (!current.attributes) current.attributes = {};
          for (const [name, def] of Object.entries(args.attributes)) {
            const existing = current.attributes[name] || {};
            current.attributes[name] = {
              ...existing,
              name,
              ...(def.type && { type: def.type }),
              ...(def.value !== undefined && { value: def.value }),
              ...(def.meta && {
                meta: { ...(existing as any).meta, ...def.meta },
              }),
            } as any;
          }
        }

        const response = await rest.api.AssetResource.update(
          args.assetId,
          current
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "delete_assets",
    {
      description: "Delete one or more assets by their IDs. This is irreversible.",
      inputSchema: {
        assetIds: z
          .array(z.string())
          .min(1)
          .describe("Array of asset IDs to delete"),
      },
    },
    async ({ assetIds }) => {
      try {
        await rest.api.AssetResource.delete({ assetId: assetIds });
        return {
          content: [
            { type: "text", text: `Deleted ${assetIds.length} asset(s): ${assetIds.join(", ")}` },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "query_assets",
    {
      description: "Query assets with filters. Returns matching assets with attributes.",
      inputSchema: {
        types: z
          .array(z.string())
          .optional()
          .describe('Asset types, e.g. ["ThingAsset", "BuildingAsset"]'),
        names: z
          .array(
            z.object({
              value: z.string(),
              match: z
                .enum(["EXACT", "BEGIN", "END", "CONTAINS"])
                .optional()
                .describe("Match mode (default: CONTAINS)"),
            })
          )
          .optional()
          .describe("Name filters"),
        parentId: z
          .string()
          .optional()
          .describe("Filter by parent asset ID"),
        realm: z.string().optional().describe("Filter by realm"),
        ids: z.array(z.string()).optional().describe("Filter by specific IDs"),
        recursive: z
          .boolean()
          .optional()
          .describe("Include descendants of matched parents"),
        limit: z.number().optional().describe("Max results (default: 100)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const query: any = {};
        if (args.types) query.types = args.types;
        if (args.ids) query.ids = args.ids;
        if (args.realm) query.realm = { name: args.realm };
        if (args.parentId) query.parents = [{ id: args.parentId }];
        if (args.recursive !== undefined) query.recursive = args.recursive;
        if (args.names)
          query.names = args.names.map((n) => ({
            predicateType: "string",
            match: n.match || "CONTAINS",
            value: n.value,
          }));
        query.limit = args.limit ?? 100;
        if (args.offset) query.offset = args.offset;

        const response = await rest.api.AssetResource.queryAssets(query);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
