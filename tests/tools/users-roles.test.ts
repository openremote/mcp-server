import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  UserResource: {
    getClientRoles: vi.fn(),
    updateClientRoles: vi.fn(),
    updateRoles: vi.fn(),
    getUserRealmRoles: vi.fn(),
    updateUserRealmRoles: vi.fn(),
    getUserClientRoles: vi.fn(),
    updateUserClientRoles: vi.fn(),
    getCurrentUserRealmRoles: vi.fn(),
    getCurrentUserClientRoles: vi.fn(),
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

const { registerUserRoleTools } = await import(
  "../../src/tools/users-roles.js"
);

function setup() {
  const captured = captureServer();
  registerUserRoleTools(captured.server);
  return captured;
}

describe("users-roles tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("get_client_roles passes realm + clientId", async () => {
    restMocks.UserResource.getClientRoles.mockResolvedValue({ data: [{ name: "r1" }] });
    const { tools } = setup();
    await tools.get_client_roles({ realm: "master", clientId: "openremote" });
    expect(restMocks.UserResource.getClientRoles).toHaveBeenCalledWith("master", "openremote");
  });

  it("update_client_roles passes (realm, clientId, roles)", async () => {
    restMocks.UserResource.updateClientRoles.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_client_roles({
      realm: "master",
      clientId: "openremote",
      roles: [{ name: "read:assets" }],
    });
    expect(restMocks.UserResource.updateClientRoles).toHaveBeenCalledWith(
      "master", "openremote", [{ name: "read:assets" }],
    );
  });

  it("update_realm_roles passes (realm, roles)", async () => {
    restMocks.UserResource.updateRoles.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_realm_roles({ realm: "master", roles: [{ name: "admin" }] });
    expect(restMocks.UserResource.updateRoles).toHaveBeenCalledWith(
      "master", [{ name: "admin" }],
    );
  });

  it("get_user_realm_roles → string[]", async () => {
    restMocks.UserResource.getUserRealmRoles.mockResolvedValue({ data: ["admin"] });
    const { tools } = setup();
    const res = await tools.get_user_realm_roles({ realm: "master", userId: "u1" });
    expect(restMocks.UserResource.getUserRealmRoles).toHaveBeenCalledWith("master", "u1");
    expect(JSON.parse(res.content[0].text)).toEqual(["admin"]);
  });

  it("update_user_realm_roles passes (realm, userId, roles)", async () => {
    restMocks.UserResource.updateUserRealmRoles.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_user_realm_roles({
      realm: "master", userId: "u1", roles: ["admin", "user"],
    });
    expect(restMocks.UserResource.updateUserRealmRoles).toHaveBeenCalledWith(
      "master", "u1", ["admin", "user"],
    );
  });

  it("get_user_client_roles passes (realm, userId, clientId)", async () => {
    restMocks.UserResource.getUserClientRoles.mockResolvedValue({ data: ["read:assets"] });
    const { tools } = setup();
    await tools.get_user_client_roles({
      realm: "master", userId: "u1", clientId: "openremote",
    });
    expect(restMocks.UserResource.getUserClientRoles).toHaveBeenCalledWith(
      "master", "u1", "openremote",
    );
  });

  it("update_user_client_roles passes (realm, userId, clientId, roles)", async () => {
    restMocks.UserResource.updateUserClientRoles.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_user_client_roles({
      realm: "master", userId: "u1", clientId: "openremote", roles: ["read:assets"],
    });
    expect(restMocks.UserResource.updateUserClientRoles).toHaveBeenCalledWith(
      "master", "u1", "openremote", ["read:assets"],
    );
  });

  it("get_current_user_realm_roles takes no args", async () => {
    restMocks.UserResource.getCurrentUserRealmRoles.mockResolvedValue({ data: ["x"] });
    const { tools } = setup();
    await tools.get_current_user_realm_roles({});
    expect(restMocks.UserResource.getCurrentUserRealmRoles).toHaveBeenCalledWith();
  });

  it("get_current_user_client_roles passes clientId only", async () => {
    restMocks.UserResource.getCurrentUserClientRoles.mockResolvedValue({ data: ["x"] });
    const { tools } = setup();
    await tools.get_current_user_client_roles({ clientId: "openremote" });
    expect(restMocks.UserResource.getCurrentUserClientRoles).toHaveBeenCalledWith("openremote");
  });
});
