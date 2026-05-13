import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  AssetModelResource: {
    getAssetInfos: vi.fn(),
    getValueDescriptors: vi.fn(),
    getMetaItemDescriptors: vi.fn(),
  },
}));

vi.mock("@openremote/rest", () => ({
  default: {
    api: restMocks,
    initialise: vi.fn(),
    addRequestInterceptor: vi.fn(),
  },
  isAxiosError: (err: unknown) => Boolean((err as any)?.isAxiosError),
}));

const { registerAssetModelTools } = await import(
  "../../src/tools/asset-model.js"
);

function setup() {
  const captured = captureServer();
  registerAssetModelTools(captured.server);
  return captured;
}

describe("asset-model tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("get_asset_types returns asset infos", async () => {
    restMocks.AssetModelResource.getAssetInfos.mockResolvedValue({
      data: [{ assetDescriptor: { name: "ThingAsset" } }],
    });
    const { tools } = setup();
    const result = await tools.get_asset_types({});
    expect(JSON.parse(result.content[0].text)).toHaveLength(1);
  });

  it("get_value_descriptors returns value descriptors", async () => {
    restMocks.AssetModelResource.getValueDescriptors.mockResolvedValue({
      data: { number: {}, text: {} },
    });
    const { tools } = setup();
    const result = await tools.get_value_descriptors({});
    expect(JSON.parse(result.content[0].text)).toHaveProperty("number");
  });

  it("get_meta_item_descriptors returns meta descriptors", async () => {
    restMocks.AssetModelResource.getMetaItemDescriptors.mockResolvedValue({
      data: { LABEL: {}, UNITS: {} },
    });
    const { tools } = setup();
    const result = await tools.get_meta_item_descriptors({});
    expect(JSON.parse(result.content[0].text)).toHaveProperty("LABEL");
  });
});
