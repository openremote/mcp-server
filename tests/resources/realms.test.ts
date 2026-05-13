import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  RealmResource: {
    get: vi.fn(),
    getAccessible: vi.fn(),
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

const { registerRealmResources } = await import(
  "../../src/resources/realms.js"
);

function setup() {
  const captured = captureServer();
  registerRealmResources(captured.server);
  return captured;
}

describe("realm resource", () => {
  beforeEach(() => resetAll(restMocks));

  it("list enumerates accessible realms as resource entries", async () => {
    restMocks.RealmResource.getAccessible.mockResolvedValue({
      data: [
        { name: "master", displayName: "Master" },
        { name: "tenant1", displayName: null },
      ],
    });
    const { resources } = setup();
    const list = resources.realm.list;
    expect(list).toBeDefined();
    const result = await list!();
    expect(result.resources).toEqual([
      {
        uri: "openremote://realm/master",
        name: "Master",
        mimeType: "application/json",
      },
      {
        uri: "openremote://realm/tenant1",
        name: "tenant1",
        mimeType: "application/json",
      },
    ]);
  });

  it("read fetches realm by templated name", async () => {
    restMocks.RealmResource.get.mockResolvedValue({
      data: { name: "master", displayName: "Master" },
    });
    const { resources } = setup();
    const uri = new URL("openremote://realm/master");
    const result = await resources.realm.read(uri, { name: "master" });
    expect(restMocks.RealmResource.get).toHaveBeenCalledWith("master");
    expect(JSON.parse(result.contents[0].text).name).toBe("master");
  });
});
