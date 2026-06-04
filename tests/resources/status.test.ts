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

const { registerStatusResources } = await import(
  "../../src/resources/status.js"
);

function setup() {
  const captured = captureServer();
  registerStatusResources(captured.server);
  return captured;
}

describe("status resources", () => {
  beforeEach(() => resetAll(restMocks));

  it("openremote://status/health resolves via getHealthStatus", async () => {
    restMocks.StatusResource.getHealthStatus.mockResolvedValue({ data: { status: "UP" } });
    const { resources } = setup();
    const uri = new URL("openremote://status/health");
    const res = await resources["status-health"].read(uri);
    expect(restMocks.StatusResource.getHealthStatus).toHaveBeenCalled();
    expect(res.contents[0].mimeType).toBe("application/json");
    expect(JSON.parse(res.contents[0].text).status).toBe("UP");
  });

  it("openremote://status/info resolves via getInfo", async () => {
    restMocks.StatusResource.getInfo.mockResolvedValue({ data: { version: "1.22.0" } });
    const { resources } = setup();
    const uri = new URL("openremote://status/info");
    const res = await resources["status-info"].read(uri);
    expect(JSON.parse(res.contents[0].text).version).toBe("1.22.0");
  });
});
