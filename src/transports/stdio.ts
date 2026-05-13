import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AuthConfig } from "../auth.js";
import { createServer } from "../server.js";

export async function startStdio(config: AuthConfig): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenRemote MCP server running on stdio");
}
