import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import rest from "@openremote/rest";

type Loader = () => Promise<unknown>;

async function jsonResource(uri: URL, load: Loader) {
  const data = await load();
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function registerAssetModelResources(server: McpServer) {
  server.registerResource(
    "asset-types",
    "openremote://asset-model/types",
    {
      title: "OpenRemote asset types",
      description:
        "Catalog of asset types and their attribute descriptors. Use as context when creating or updating assets.",
      mimeType: "application/json",
    },
    (uri) =>
      jsonResource(
        uri,
        async () =>
          (await rest.api.AssetModelResource.getAssetInfos()).data,
      ),
  );

  server.registerResource(
    "value-descriptors",
    "openremote://asset-model/values",
    {
      title: "OpenRemote value descriptors",
      description:
        "Catalog of value types (number, text, boolean, …) and their constraints.",
      mimeType: "application/json",
    },
    (uri) =>
      jsonResource(
        uri,
        async () =>
          (await rest.api.AssetModelResource.getValueDescriptors()).data,
      ),
  );

  server.registerResource(
    "meta-item-descriptors",
    "openremote://asset-model/meta",
    {
      title: "OpenRemote meta item descriptors",
      description:
        "Catalog of available meta items (LABEL, UNITS, READ_ONLY, RULE_STATE, …).",
      mimeType: "application/json",
    },
    (uri) =>
      jsonResource(
        uri,
        async () =>
          (await rest.api.AssetModelResource.getMetaItemDescriptors()).data,
      ),
  );
}
