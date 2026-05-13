import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type ToolHandler = (args: any) => Promise<any>;
export type ResourceHandler = (
  uri: URL,
  variables?: Record<string, string | string[]>,
) => Promise<any>;
export type ResourceListHandler = () => Promise<{
  resources: Array<{ uri: string; name?: string; mimeType?: string }>;
}>;

export interface CapturedServer {
  server: McpServer;
  tools: Record<string, ToolHandler>;
  resources: Record<
    string,
    {
      read: ResourceHandler;
      list?: ResourceListHandler;
      uri?: string;
      template?: string;
    }
  >;
}

export function captureServer(): CapturedServer {
  const tools: Record<string, ToolHandler> = {};
  const resources: CapturedServer["resources"] = {};

  const server = {
    registerTool: (name: string, _schema: any, handler: ToolHandler) => {
      tools[name] = handler;
    },
    registerResource: (
      name: string,
      uriOrTemplate: any,
      _metadata: any,
      handler: ResourceHandler,
    ) => {
      const entry: CapturedServer["resources"][string] = { read: handler };
      if (typeof uriOrTemplate === "string") {
        entry.uri = uriOrTemplate;
      } else if (uriOrTemplate && typeof uriOrTemplate === "object") {
        entry.template = uriOrTemplate.uriTemplate ?? uriOrTemplate._uriTemplate;
        const listCb = uriOrTemplate.listCallback ?? uriOrTemplate._listCallback;
        if (typeof listCb === "function") entry.list = listCb;
      }
      resources[name] = entry;
    },
  } as unknown as McpServer;

  return { server, tools, resources };
}
