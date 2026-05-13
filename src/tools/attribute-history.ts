import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

const TYPE_VALUES = ["all", "lttb", "interval", "nearest"] as const;
const FORMULA_VALUES = [
  "MIN",
  "AVG",
  "MAX",
  "DIFFERENCE",
  "COUNT",
  "SUM",
  "MODE",
  "MEDIAN",
] as const;

export function registerAttributeHistoryTool(server: McpServer) {
  server.registerTool(
    "get_attribute_history",
    {
      description: `Retrieve historical datapoints for an asset attribute.

Query types:
- "lttb" (default): downsampled to amountOfPoints (default 500). Use for charts on numeric/boolean attributes over wide ranges.
- "all": every raw datapoint in the range. May return huge payloads — prefer lttb or interval for wide ranges.
- "interval": aggregated buckets. Requires interval (e.g. "1 hour"), formula (MIN|AVG|MAX|DIFFERENCE|COUNT|SUM|MODE|MEDIAN); optional gapFill.
- "nearest": single nearest datapoint at or before fromTimestamp. Set fromTimestamp to your target time in ms; the backend handles unit conversion.

Requires the attribute to have datapoint storage enabled (STORE_DATA_POINTS meta).`,
      inputSchema: {
        assetId: z.string().describe("The asset ID"),
        attributeName: z.string().describe("The attribute name"),
        fromTimestamp: z
          .number()
          .int()
          .describe("Start of range, Unix ms"),
        toTimestamp: z
          .number()
          .int()
          .describe("End of range, Unix ms"),
        type: z
          .enum(TYPE_VALUES)
          .optional()
          .describe(
            'Query type. Defaults to "lttb" with amountOfPoints=500 for bounded payload.',
          ),
        amountOfPoints: z
          .number()
          .int()
          .min(2)
          .optional()
          .describe('Required for type="lttb". Default 500 if type omitted.'),
        interval: z
          .string()
          .optional()
          .describe('Required for type="interval". E.g. "1 hour", "15 min".'),
        gapFill: z
          .boolean()
          .optional()
          .describe('Optional for type="interval". Default false.'),
        formula: z
          .enum(FORMULA_VALUES)
          .optional()
          .describe('Required for type="interval".'),
      },
    },
    async (args) => {
      try {
        const type = args.type ?? "lttb";
        const base: Record<string, unknown> = {
          type,
          fromTimestamp: args.fromTimestamp,
          toTimestamp: args.toTimestamp,
        };
        let query: Record<string, unknown>;
        switch (type) {
          case "all":
          case "nearest":
            query = base;
            break;
          case "lttb":
            query = {
              ...base,
              amountOfPoints: args.amountOfPoints ?? 500,
            };
            break;
          case "interval":
            if (!args.interval || !args.formula) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `type="interval" requires both "interval" (e.g. "1 hour") and "formula" (${FORMULA_VALUES.join(
                      "|",
                    )}).`,
                  },
                ],
                isError: true as const,
              };
            }
            query = {
              ...base,
              interval: args.interval,
              gapFill: args.gapFill ?? false,
              formula: args.formula,
            };
            break;
        }

        const response = await (
          rest.api.AssetDatapointResource as any
        ).getDatapoints(args.assetId, args.attributeName, query);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
