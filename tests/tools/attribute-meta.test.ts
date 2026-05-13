import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAxiosError, resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  AssetResource: {
    get: vi.fn(),
    update: vi.fn(),
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

const { registerAttributeMetaTool } = await import(
  "../../src/tools/attribute-meta.js"
);

function setup() {
  const captured = captureServer();
  registerAttributeMetaTool(captured.server);
  return captured;
}

function asset(meta: Record<string, unknown>) {
  return {
    id: "a1",
    attributes: {
      temperature: { name: "temperature", type: "number", meta },
    },
  };
}

describe("update_attribute_meta", () => {
  beforeEach(() => resetAll(restMocks));

  it("merges incoming keys, keeps existing, drops nulls", async () => {
    restMocks.AssetResource.get.mockResolvedValue({
      data: asset({ label: "Old", readOnly: true }),
    });
    restMocks.AssetResource.update.mockImplementation(
      async (_id: string, a: any) => ({ data: a }),
    );
    const { tools } = setup();
    await tools.update_attribute_meta({
      assetId: "a1",
      attributeName: "temperature",
      meta: { label: "New", units: ["DEGREE_CELSIUS"], readOnly: null },
    });
    const putAsset = restMocks.AssetResource.update.mock.calls[0][1];
    const meta = putAsset.attributes.temperature.meta;
    expect(meta).toEqual({ label: "New", units: ["DEGREE_CELSIUS"] });
    expect(meta).not.toHaveProperty("readOnly");
  });

  it("returns isError when attribute is missing", async () => {
    restMocks.AssetResource.get.mockResolvedValue({
      data: { id: "a1", attributes: { other: {} } },
    });
    const { tools } = setup();
    const result = await tools.update_attribute_meta({
      assetId: "a1",
      attributeName: "missing",
      meta: { label: "x" },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
    expect(restMocks.AssetResource.update).not.toHaveBeenCalled();
  });

  it("retries once on 409 then succeeds", async () => {
    restMocks.AssetResource.get
      .mockResolvedValueOnce({ data: asset({ label: "Old" }) })
      .mockResolvedValueOnce({ data: asset({ label: "Old2" }) });
    restMocks.AssetResource.update
      .mockRejectedValueOnce(makeAxiosError(409, { message: "Conflict" }))
      .mockResolvedValueOnce({ data: asset({ label: "New" }) });
    const { tools } = setup();
    const result = await tools.update_attribute_meta({
      assetId: "a1",
      attributeName: "temperature",
      meta: { label: "New" },
    });
    expect(result.isError).toBeUndefined();
    expect(restMocks.AssetResource.get).toHaveBeenCalledTimes(2);
    expect(restMocks.AssetResource.update).toHaveBeenCalledTimes(2);
  });

  it("gives up after second 409", async () => {
    restMocks.AssetResource.get.mockResolvedValue({
      data: asset({ label: "Old" }),
    });
    restMocks.AssetResource.update.mockRejectedValue(
      makeAxiosError(409, { message: "Conflict" }),
    );
    const { tools } = setup();
    const result = await tools.update_attribute_meta({
      assetId: "a1",
      attributeName: "temperature",
      meta: { label: "New" },
    });
    expect(result.isError).toBe(true);
    expect(restMocks.AssetResource.update).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-conflict errors", async () => {
    restMocks.AssetResource.get.mockResolvedValue({
      data: asset({ label: "Old" }),
    });
    restMocks.AssetResource.update.mockRejectedValue(
      makeAxiosError(500, { message: "Server error" }),
    );
    const { tools } = setup();
    const result = await tools.update_attribute_meta({
      assetId: "a1",
      attributeName: "temperature",
      meta: { label: "New" },
    });
    expect(result.isError).toBe(true);
    expect(restMocks.AssetResource.update).toHaveBeenCalledTimes(1);
  });
});
