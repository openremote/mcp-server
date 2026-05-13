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

const { registerAssetModelResources } = await import(
  "../../src/resources/asset-model.js"
);

function setup() {
  const captured = captureServer();
  registerAssetModelResources(captured.server);
  return captured;
}

describe("asset-model resources", () => {
  beforeEach(() => resetAll(restMocks));

  it("asset-types returns JSON from getAssetInfos", async () => {
    restMocks.AssetModelResource.getAssetInfos.mockResolvedValue({
      data: [{ name: "ThingAsset" }],
    });
    const { resources } = setup();
    const uri = new URL("openremote://asset-model/types");
    const result = await resources["asset-types"].read(uri);
    expect(result.contents[0].uri).toBe(uri.href);
    expect(result.contents[0].mimeType).toBe("application/json");
    expect(JSON.parse(result.contents[0].text)).toEqual([
      { name: "ThingAsset" },
    ]);
  });

  it("value-descriptors returns JSON from getValueDescriptors", async () => {
    restMocks.AssetModelResource.getValueDescriptors.mockResolvedValue({
      data: { number: {} },
    });
    const { resources } = setup();
    const uri = new URL("openremote://asset-model/values");
    const result = await resources["value-descriptors"].read(uri);
    expect(JSON.parse(result.contents[0].text)).toHaveProperty("number");
  });

  it("meta-item-descriptors returns JSON from getMetaItemDescriptors", async () => {
    restMocks.AssetModelResource.getMetaItemDescriptors.mockResolvedValue({
      data: { LABEL: {} },
    });
    const { resources } = setup();
    const uri = new URL("openremote://asset-model/meta");
    const result = await resources["meta-item-descriptors"].read(uri);
    expect(JSON.parse(result.contents[0].text)).toHaveProperty("LABEL");
  });
});
