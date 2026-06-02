import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rest from "@openremote/rest";
import { errorResult } from "../error.js";

const syslogLevelSchema = z.enum(["DEBUG", "INFO", "WARN", "ERROR"]);
const syslogCategorySchema = z.enum([
  "MANAGER",
  "AGENT",
  "ASSET",
  "RULES",
  "MODEL_AND_VALUES",
  "PROTOCOL",
  "GATEWAY",
  "DATA",
  "API",
  "NOTIFICATION",
]);

const syslogConfigSchema = z
  .looseObject({
    storedLevel: syslogLevelSchema.optional(),
    storedMaxAgeMinutes: z.number().int().optional(),
    storedCategories: z.array(syslogCategorySchema).optional(),
  })
  .describe("OpenRemote SyslogConfig object");

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerSyslogTools(server: McpServer) {
  server.registerTool(
    "query_syslog_events",
    {
      description:
        "Query OpenRemote syslog events with filters. Requires `read:rules`. Default ordering is newest-first.",
      inputSchema: {
        level: syslogLevelSchema.optional().describe("Minimum level filter"),
        per_page: z.number().int().min(1).max(1000).optional(),
        page: z.number().int().min(0).optional(),
        from: z.number().int().optional().describe("Lower bound timestamp (epoch ms)"),
        to: z.number().int().optional().describe("Upper bound timestamp (epoch ms)"),
        category: z.array(syslogCategorySchema).optional(),
        subCategory: z.array(z.string()).optional(),
      },
    },
    async (args) => {
      try {
        const r = await rest.api.SyslogResource.getEvents(args as any);
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "clear_syslog_events",
    {
      description:
        "Delete ALL stored syslog events. Requires `write:admin`. Irreversible.",
      inputSchema: {},
    },
    async () => {
      try {
        await rest.api.SyslogResource.clearEvents();
        return { content: [{ type: "text", text: "Cleared syslog events" }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_syslog_config",
    {
      description:
        "Get the syslog persistence configuration (level, max age, categories). Requires `read:admin`.",
      inputSchema: {},
    },
    async () => {
      try {
        const r = await rest.api.SyslogResource.getConfig();
        return json(r.data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "update_syslog_config",
    {
      description:
        "Update the syslog persistence configuration. Requires `write:admin`. Backend replaces the config with the supplied object — read with get_syslog_config first if doing a partial update.",
      inputSchema: { config: syslogConfigSchema },
    },
    async ({ config }) => {
      try {
        await rest.api.SyslogResource.updateConfig(config as any);
        return { content: [{ type: "text", text: "Syslog config updated" }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
