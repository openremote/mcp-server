import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAxiosError, resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  UserResource: {
    requestPasswordReset: vi.fn(),
    requestPasswordResetCurrent: vi.fn(),
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

const { registerUserPasswordTools } = await import(
  "../../src/tools/users-passwords.js"
);

function setup() {
  const captured = captureServer();
  registerUserPasswordTools(captured.server);
  return captured;
}

describe("users-passwords tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("request_password_reset passes realm + userId", async () => {
    restMocks.UserResource.requestPasswordReset.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    const res = await tools.request_password_reset({ realm: "master", userId: "u1" });
    expect(restMocks.UserResource.requestPasswordReset).toHaveBeenCalledWith("master", "u1");
    expect(res.content[0].text).toMatch(/Password reset requested/);
  });

  it("request_current_password_reset takes no args", async () => {
    restMocks.UserResource.requestPasswordResetCurrent.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    const res = await tools.request_current_password_reset({});
    expect(restMocks.UserResource.requestPasswordResetCurrent).toHaveBeenCalledWith();
    expect(res.content[0].text).toMatch(/requested/i);
  });

  it("error path uses errorResult", async () => {
    restMocks.UserResource.requestPasswordReset.mockRejectedValue(
      makeAxiosError(404, { message: "User not found" }),
    );
    const { tools } = setup();
    const res = await tools.request_password_reset({ realm: "master", userId: "missing" });
    expect(res.isError).toBe(true);
    expect(JSON.parse(res.content[0].text).status).toBe(404);
  });
});
