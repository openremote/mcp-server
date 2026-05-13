import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAxiosError, resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  AssetResource: {
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    queryAssets: vi.fn(),
    writeAttributeValue$PUT$asset_assetId_attribute_attributeName: vi.fn(),
    writeAttributeValues: vi.fn(),
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

const { registerAssetTools } = await import("../../src/tools/assets.js");

function setup() {
  const captured = captureServer();
  registerAssetTools(captured.server);
  return captured;
}

describe("asset tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("create_asset returns created asset JSON", async () => {
    restMocks.AssetResource.create.mockResolvedValue({
      data: { id: "abc", name: "x", type: "ThingAsset" },
    });
    const { tools } = setup();
    const result = await tools.create_asset({ name: "x", type: "ThingAsset" });
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toMatchObject({ id: "abc" });
    expect(restMocks.AssetResource.create).toHaveBeenCalledOnce();
  });

  it("get_asset forwards id and returns data", async () => {
    restMocks.AssetResource.get.mockResolvedValue({ data: { id: "abc" } });
    const { tools } = setup();
    const result = await tools.get_asset({ assetId: "abc" });
    expect(restMocks.AssetResource.get).toHaveBeenCalledWith("abc");
    expect(JSON.parse(result.content[0].text).id).toBe("abc");
  });

  it("get_asset on REST error returns isError with status detail", async () => {
    restMocks.AssetResource.get.mockRejectedValue(
      makeAxiosError(404, { message: "Not found" }),
    );
    const { tools } = setup();
    const result = await tools.get_asset({ assetId: "missing" });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.status).toBe(404);
    expect(body.message).toBe("Not found");
  });

  it("delete_assets requires at least one id and reports count", async () => {
    restMocks.AssetResource.delete.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    const result = await tools.delete_assets({ assetIds: ["a", "b"] });
    expect(restMocks.AssetResource.delete).toHaveBeenCalledWith({
      assetId: ["a", "b"],
    });
    expect(result.content[0].text).toContain("Deleted 2");
  });

  it("query_assets defaults limit and translates filters", async () => {
    restMocks.AssetResource.queryAssets.mockResolvedValue({ data: [] });
    const { tools } = setup();
    await tools.query_assets({
      types: ["ThingAsset"],
      realm: "master",
      parentId: "p1",
      names: [{ value: "Sensor", match: "BEGIN" }],
    });
    const query = restMocks.AssetResource.queryAssets.mock.calls[0][0];
    expect(query.types).toEqual(["ThingAsset"]);
    expect(query.realm).toEqual({ name: "master" });
    expect(query.parents).toEqual([{ id: "p1" }]);
    expect(query.names[0]).toMatchObject({
      predicateType: "string",
      match: "BEGIN",
      value: "Sensor",
    });
    expect(query.limit).toBe(100);
  });
});
