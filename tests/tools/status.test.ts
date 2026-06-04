import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  StatusResource: {
    getHealthStatus: vi.fn(),
    getInfo: vi.fn(),
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

const { registerStatusTools } = await import("../../src/tools/status.js");

function setup() {
  const captured = captureServer();
  registerStatusTools(captured.server);
  return captured;
}

describe("status tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("get_health_status returns map", async () => {
    restMocks.StatusResource.getHealthStatus.mockResolvedValue({
      data: { status: "UP", components: { db: { status: "UP" } } },
    });
    const { tools } = setup();
    const res = await tools.get_health_status({});
    expect(restMocks.StatusResource.getHealthStatus).toHaveBeenCalledWith();
    expect(JSON.parse(res.content[0].text).status).toBe("UP");
  });

  it("get_system_info returns version/info map", async () => {
    restMocks.StatusResource.getInfo.mockResolvedValue({
      data: { version: "1.22.0", buildTime: "2025-01-01" },
    });
    const { tools } = setup();
    const res = await tools.get_system_info({});
    expect(restMocks.StatusResource.getInfo).toHaveBeenCalledWith();
    expect(JSON.parse(res.content[0].text).version).toBe("1.22.0");
  });
});
