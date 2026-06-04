import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  SyslogResource: {
    getEvents: vi.fn(),
    clearEvents: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
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

const { registerSyslogTools } = await import("../../src/tools/syslog.js");

function setup() {
  const captured = captureServer();
  registerSyslogTools(captured.server);
  return captured;
}

describe("syslog tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("query_syslog_events forwards filters", async () => {
    restMocks.SyslogResource.getEvents.mockResolvedValue({
      data: [{ timestamp: 1700000000000, level: "ERROR", message: "x" }],
    });
    const { tools } = setup();
    await tools.query_syslog_events({
      level: "ERROR",
      per_page: 20,
      page: 0,
      from: 1700000000000,
      to: 1700100000000,
      category: ["RULES"],
      subCategory: ["sub1"],
    });
    expect(restMocks.SyslogResource.getEvents).toHaveBeenCalledWith({
      level: "ERROR",
      per_page: 20,
      page: 0,
      from: 1700000000000,
      to: 1700100000000,
      category: ["RULES"],
      subCategory: ["sub1"],
    });
  });

  it("query_syslog_events with no args calls with empty query", async () => {
    restMocks.SyslogResource.getEvents.mockResolvedValue({ data: [] });
    const { tools } = setup();
    await tools.query_syslog_events({});
    expect(restMocks.SyslogResource.getEvents).toHaveBeenCalledWith({});
  });

  it("clear_syslog_events takes no args", async () => {
    restMocks.SyslogResource.clearEvents.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    const res = await tools.clear_syslog_events({});
    expect(restMocks.SyslogResource.clearEvents).toHaveBeenCalledWith();
    expect(res.content[0].text).toMatch(/Cleared syslog/);
  });

  it("get_syslog_config", async () => {
    restMocks.SyslogResource.getConfig.mockResolvedValue({ data: { storedLevel: "INFO" } });
    const { tools } = setup();
    const res = await tools.get_syslog_config({});
    expect(restMocks.SyslogResource.getConfig).toHaveBeenCalledWith();
    expect(JSON.parse(res.content[0].text).storedLevel).toBe("INFO");
  });

  it("update_syslog_config forwards config body", async () => {
    restMocks.SyslogResource.updateConfig.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_syslog_config({
      config: { storedLevel: "WARN", storedMaxAgeMinutes: 60 },
    });
    expect(restMocks.SyslogResource.updateConfig).toHaveBeenCalledWith({
      storedLevel: "WARN", storedMaxAgeMinutes: 60,
    });
  });
});
