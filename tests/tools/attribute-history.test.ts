import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAxiosError, resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  AssetDatapointResource: {
    getDatapoints: vi.fn(),
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

const { registerAttributeHistoryTool } = await import(
  "../../src/tools/attribute-history.js"
);

function setup() {
  const captured = captureServer();
  registerAttributeHistoryTool(captured.server);
  return captured;
}

const baseArgs = {
  assetId: "a1",
  attributeName: "temperature",
  fromTimestamp: 1_700_000_000_000,
  toTimestamp: 1_700_003_600_000,
};

describe("get_attribute_history", () => {
  beforeEach(() => {
    resetAll(restMocks);
    restMocks.AssetDatapointResource.getDatapoints.mockResolvedValue({
      data: [{ x: 1, y: 1.0 }],
    });
  });

  it('defaults to type="lttb" with amountOfPoints=500', async () => {
    const { tools } = setup();
    await tools.get_attribute_history(baseArgs);
    const [, , query] =
      restMocks.AssetDatapointResource.getDatapoints.mock.calls[0];
    expect(query).toMatchObject({
      type: "lttb",
      amountOfPoints: 500,
      fromTimestamp: baseArgs.fromTimestamp,
      toTimestamp: baseArgs.toTimestamp,
    });
  });

  it('respects explicit type="all"', async () => {
    const { tools } = setup();
    await tools.get_attribute_history({ ...baseArgs, type: "all" });
    const [, , query] =
      restMocks.AssetDatapointResource.getDatapoints.mock.calls[0];
    expect(query.type).toBe("all");
    expect(query).not.toHaveProperty("amountOfPoints");
  });

  it("builds interval query with formula and gapFill default", async () => {
    const { tools } = setup();
    await tools.get_attribute_history({
      ...baseArgs,
      type: "interval",
      interval: "1 hour",
      formula: "AVG",
    });
    const [, , query] =
      restMocks.AssetDatapointResource.getDatapoints.mock.calls[0];
    expect(query).toMatchObject({
      type: "interval",
      interval: "1 hour",
      formula: "AVG",
      gapFill: false,
    });
  });

  it('rejects type="interval" without formula and interval', async () => {
    const { tools } = setup();
    const result = await tools.get_attribute_history({
      ...baseArgs,
      type: "interval",
    });
    expect(result.isError).toBe(true);
    expect(
      restMocks.AssetDatapointResource.getDatapoints,
    ).not.toHaveBeenCalled();
  });

  it("surfaces backend AxiosError as isError", async () => {
    restMocks.AssetDatapointResource.getDatapoints.mockRejectedValueOnce(
      makeAxiosError(400, { message: "Datapoints disabled" }),
    );
    const { tools } = setup();
    const result = await tools.get_attribute_history(baseArgs);
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toBe(
      "Datapoints disabled",
    );
  });
});
