import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAxiosError, resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  UserResource: {
    query: vi.fn(),
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

const { registerUserCrudTools } = await import("../../src/tools/users-crud.js");

function setup() {
  const captured = captureServer();
  registerUserCrudTools(captured.server);
  return captured;
}

describe("users-crud tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("query_users → POST /user/query with body", async () => {
    restMocks.UserResource.query.mockResolvedValue({ data: [{ id: "u1" }] });
    const { tools } = setup();
    const res = await tools.query_users({
      realmPredicate: { name: "master" },
      usernames: [{ predicateType: "string", value: "alice", match: "EXACT" }],
      limit: 50,
    });
    expect(restMocks.UserResource.query).toHaveBeenCalledWith({
      realmPredicate: { name: "master" },
      usernames: [{ predicateType: "string", value: "alice", match: "EXACT" }],
      limit: 50,
    });
    expect(JSON.parse(res.content[0].text)).toEqual([{ id: "u1" }]);
  });

  it("get_user passes realm + userId positionally", async () => {
    restMocks.UserResource.get.mockResolvedValue({ data: { id: "u1" } });
    const { tools } = setup();
    await tools.get_user({ realm: "master", userId: "u1" });
    expect(restMocks.UserResource.get).toHaveBeenCalledWith("master", "u1");
  });

  it("create_user wraps user object", async () => {
    restMocks.UserResource.create.mockResolvedValue({ data: { id: "new" } });
    const { tools } = setup();
    await tools.create_user({
      realm: "master",
      user: { username: "alice", email: "alice@example.com", enabled: true },
    });
    expect(restMocks.UserResource.create).toHaveBeenCalledWith("master", {
      username: "alice",
      email: "alice@example.com",
      enabled: true,
    });
  });

  it("update_user passes realm and user body", async () => {
    restMocks.UserResource.update.mockResolvedValue({ data: { id: "u1" } });
    const { tools } = setup();
    await tools.update_user({
      realm: "master",
      user: { id: "u1", firstName: "Alice" },
    });
    expect(restMocks.UserResource.update).toHaveBeenCalledWith("master", {
      id: "u1",
      firstName: "Alice",
    });
  });

  it("delete_user passes realm + userId", async () => {
    restMocks.UserResource.delete.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    const res = await tools.delete_user({ realm: "master", userId: "u1" });
    expect(restMocks.UserResource.delete).toHaveBeenCalledWith("master", "u1");
    expect(res.content[0].text).toMatch(/Deleted user u1/);
  });

  it("error path uses errorResult", async () => {
    restMocks.UserResource.get.mockRejectedValue(
      makeAxiosError(404, { message: "User not found" }),
    );
    const { tools } = setup();
    const res = await tools.get_user({ realm: "master", userId: "missing" });
    expect(res.isError).toBe(true);
    expect(JSON.parse(res.content[0].text).status).toBe(404);
  });
});
