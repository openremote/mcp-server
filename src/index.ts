import rest from "@openremote/rest";
import { getAuthConfig, initAuth } from "./auth.js";
import { startStdio } from "./transports/stdio.js";

const config = getAuthConfig();
rest.initialise(`${config.host}/api/${config.realm}/`);

async function main() {
  await initAuth(rest, config);
  await startStdio(config);
}

main().catch((err) => {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});
