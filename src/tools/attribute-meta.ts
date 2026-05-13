import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { isAxiosError } from "@openremote/rest";
import type { Asset } from "@openremote/model";
import { errorResult } from "../error.js";

function mergeMeta(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

async function applyMetaMerge(
  assetId: string,
  attributeName: string,
  incoming: Record<string, unknown>,
): Promise<Asset> {
  const current = (await rest.api.AssetResource.get(assetId)).data;
  const attr = current.attributes?.[attributeName];
  if (!attr) {
    throw new AttributeNotFoundError(
      assetId,
      attributeName,
      Object.keys(current.attributes ?? {}),
    );
  }
  const merged = mergeMeta(
    (attr as any).meta as Record<string, unknown> | undefined,
    incoming,
  );
  (current.attributes as any)[attributeName] = {
    ...attr,
    meta: merged,
  };
  await rest.api.AssetResource.update(assetId, current);
  return current;
}

class AttributeNotFoundError extends Error {
  constructor(
    public assetId: string,
    public attributeName: string,
    public available: string[],
  ) {
    super(
      `Attribute "${attributeName}" not found on asset ${assetId}. Available: ${available.join(", ") || "(none)"}`,
    );
  }
}

function isRetryableConflict(err: unknown): boolean {
  if (!isAxiosError(err)) return false;
  const status = err.response?.status;
  return status === 409 || status === 412;
}

export function registerAttributeMetaTool(server: McpServer) {
  server.registerTool(
    "update_attribute_meta",
    {
      description: `Partial-merge metadata onto a single attribute. Existing meta keys not mentioned are preserved; mentioned keys are overwritten; values set to null are removed.

Implementation: read-modify-write of the full asset (no per-attribute meta endpoint exists). On 409/412 conflict the operation retries once with a fresh GET. Concurrent edits to OTHER attributes between GET and PUT may be lost if the backend does not emit a conflict response.

Common meta keys: "label", "units", "readOnly", "ruleState", "storeDataPoints", "accessPublicRead", "accessRestrictedRead".`,
      inputSchema: {
        assetId: z.string().describe("The asset ID"),
        attributeName: z.string().describe("The attribute name"),
        meta: z
          .record(z.string(), z.any())
          .describe(
            "Meta items to merge. Keys not present are preserved; null values remove the key.",
          ),
      },
    },
    async ({ assetId, attributeName, meta }) => {
      try {
        let updated: Asset;
        try {
          updated = await applyMetaMerge(assetId, attributeName, meta);
        } catch (err) {
          if (isRetryableConflict(err)) {
            updated = await applyMetaMerge(assetId, attributeName, meta);
          } else {
            throw err;
          }
        }
        const attr = updated.attributes?.[attributeName];
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(attr, null, 2),
            },
          ],
        };
      } catch (err) {
        if (err instanceof AttributeNotFoundError) {
          return {
            content: [{ type: "text" as const, text: err.message }],
            isError: true as const,
          };
        }
        return errorResult(err);
      }
    },
  );
}
