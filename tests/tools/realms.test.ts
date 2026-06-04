import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  RealmResource: {
    getAll: vi.fn(),
    getAccessible: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

const { registerRealmTools } = await import("../../src/tools/realms.js");

function setup() {
  const captured = captureServer();
  registerRealmTools(captured.server);
  return captured;
}

describe("realms tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("list_realms (admin) returns all realms", async () => {
    restMocks.RealmResource.getAll.mockResolvedValue({
      data: [{ name: "master" }, { name: "smartcity" }],
    });
    const { tools } = setup();
    const res = await tools.list_realms({});
    expect(restMocks.RealmResource.getAll).toHaveBeenCalledWith();
    expect(JSON.parse(res.content[0].text)).toHaveLength(2);
  });

  it("list_accessible_realms", async () => {
    restMocks.RealmResource.getAccessible.mockResolvedValue({ data: [{ name: "master" }] });
    const { tools } = setup();
    await tools.list_accessible_realms({});
    expect(restMocks.RealmResource.getAccessible).toHaveBeenCalledWith();
  });

  it("get_realm passes name", async () => {
    restMocks.RealmResource.get.mockResolvedValue({ data: { name: "master" } });
    const { tools } = setup();
    await tools.get_realm({ name: "master" });
    expect(restMocks.RealmResource.get).toHaveBeenCalledWith("master");
  });

  it("create_realm forwards body", async () => {
    restMocks.RealmResource.create.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.create_realm({
      realm: { name: "new", displayName: "New", enabled: true },
    });
    expect(restMocks.RealmResource.create).toHaveBeenCalledWith({
      name: "new", displayName: "New", enabled: true,
    });
  });

  it("update_realm passes (name, body) including required id", async () => {
    restMocks.RealmResource.update.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_realm({
      name: "smartcity",
      realm: { id: "realm-uuid", displayName: "Smart City" },
    });
    expect(restMocks.RealmResource.update).toHaveBeenCalledWith("smartcity", {
      id: "realm-uuid",
      displayName: "Smart City",
    });
  });

  it("delete_realm passes name", async () => {
    restMocks.RealmResource.delete.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    const res = await tools.delete_realm({ name: "old" });
    expect(restMocks.RealmResource.delete).toHaveBeenCalledWith("old");
    expect(res.content[0].text).toMatch(/Deleted realm old/);
  });
});
