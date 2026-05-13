import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAxiosError, resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  AssetResource: {
    get: vi.fn(),
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

const { registerAttributeTools } = await import(
  "../../src/tools/attributes.js"
);

function setup() {
  const captured = captureServer();
  registerAttributeTools(captured.server);
  return captured;
}

describe("attribute tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("get_attribute extracts a single attribute", async () => {
    restMocks.AssetResource.get.mockResolvedValue({
      data: { attributes: { temperature: { name: "temperature", value: 21 } } },
    });
    const { tools } = setup();
    const result = await tools.get_attribute({
      assetId: "a1",
      attributeName: "temperature",
    });
    expect(JSON.parse(result.content[0].text).value).toBe(21);
  });

  it("get_attribute returns isError when attribute is absent", async () => {
    restMocks.AssetResource.get.mockResolvedValue({
      data: { attributes: { other: {} } },
    });
    const { tools } = setup();
    const result = await tools.get_attribute({
      assetId: "a1",
      attributeName: "missing",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Available: other");
  });

  it("write_attribute reports backend failure as isError", async () => {
    restMocks.AssetResource.writeAttributeValue$PUT$asset_assetId_attribute_attributeName.mockResolvedValue(
      { data: { failure: "INVALID_VALUE" } },
    );
    const { tools } = setup();
    const result = await tools.write_attribute({
      assetId: "a1",
      attributeName: "x",
      value: 99,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("INVALID_VALUE");
  });

  it("write_attributes batches into AttributeState[]", async () => {
    restMocks.AssetResource.writeAttributeValues.mockResolvedValue({
      data: [{ ref: { id: "a1", name: "x" } }],
    });
    const { tools } = setup();
    await tools.write_attributes({
      writes: [
        { assetId: "a1", attributeName: "x", value: 1 },
        { assetId: "a2", attributeName: "y", value: true },
      ],
    });
    const states =
      restMocks.AssetResource.writeAttributeValues.mock.calls[0][0];
    expect(states).toHaveLength(2);
    expect(states[0]).toEqual({
      ref: { id: "a1", name: "x" },
      value: 1,
    });
  });

  it("get_attribute surfaces AxiosError via errorResult", async () => {
    restMocks.AssetResource.get.mockRejectedValue(
      makeAxiosError(401, "Unauthorized"),
    );
    const { tools } = setup();
    const result = await tools.get_attribute({
      assetId: "a1",
      attributeName: "x",
    });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).status).toBe(401);
  });
});
