import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

export function registerAttributeTools(server: McpServer) {
  server.registerTool(
    "get_attribute",
    {
      description:
        "Get the current value and metadata of a specific attribute on an asset",
      inputSchema: {
        assetId: z.string().describe("The asset ID"),
        attributeName: z.string().describe("The attribute name"),
      },
    },
    async ({ assetId, attributeName }) => {
      try {
        const response = await rest.api.AssetResource.get(assetId);
        const attr = response.data.attributes?.[attributeName];
        if (!attr) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Attribute "${attributeName}" not found on asset ${assetId}. Available: ${Object.keys(response.data.attributes || {}).join(", ") || "(none)"}`,
              },
            ],
            isError: true as const,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(attr, null, 2) }],
        };
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "write_attribute",
    {
      description:
        "Write a value to a single asset attribute. Primary way to control devices or update data points.",
      inputSchema: {
        assetId: z.string().describe("The asset ID"),
        attributeName: z.string().describe("The attribute name"),
        value: z
          .any()
          .describe("The value to write (must match attribute type)"),
      },
    },
    async ({ assetId, attributeName, value }) => {
      try {
        // The generated method name includes the full path pattern
        const resource = rest.api.AssetResource as any;
        const response =
          await resource.writeAttributeValue$PUT$asset_assetId_attribute_attributeName(
            assetId,
            attributeName,
            value
          );
        if (response.data?.failure) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Write failed for ${assetId}/${attributeName}: ${response.data.failure}`,
              },
            ],
            isError: true as const,
          };
        }
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
    "write_attributes",
    {
      description:
        "Write values to multiple attributes across one or more assets in a single operation",
      inputSchema: {
        writes: z
          .array(
            z.object({
              assetId: z.string().describe("The asset ID"),
              attributeName: z.string().describe("The attribute name"),
              value: z.any().describe("The value to write"),
            })
          )
          .min(1)
          .describe("Array of attribute writes"),
      },
    },
    async ({ writes }) => {
      try {
        const states = writes.map((w) => ({
          ref: { id: w.assetId, name: w.attributeName },
          value: w.value,
        }));
        const response =
          await rest.api.AssetResource.writeAttributeValues(states);
        const failures = (response.data || []).filter(
          (r: any) => r.failure
        );
        if (failures.length > 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `${failures.length} of ${writes.length} write(s) failed:\n${JSON.stringify(failures, null, 2)}`,
              },
            ],
            isError: true as const,
          };
        }
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
