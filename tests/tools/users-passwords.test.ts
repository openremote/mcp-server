import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  UserResource: {
    requestPasswordReset: vi.fn(),
    requestPasswordResetCurrent: vi.fn(),
    updatePassword: vi.fn(),
    updatePasswordCurrent: vi.fn(),
    resetSecret: vi.fn(),
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

  it("update_password wraps credential (default temporary=false)", async () => {
    restMocks.UserResource.updatePassword.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_password({ realm: "master", userId: "u1", password: "newP@ss" });
    expect(restMocks.UserResource.updatePassword).toHaveBeenCalledWith("master", "u1", {
      type: "password",
      value: "newP@ss",
      temporary: false,
    });
  });

  it("update_password supports temporary flag", async () => {
    restMocks.UserResource.updatePassword.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_password({
      realm: "master", userId: "u1", password: "x", temporary: true,
    });
    expect(restMocks.UserResource.updatePassword).toHaveBeenCalledWith(
      "master", "u1", { type: "password", value: "x", temporary: true },
    );
  });

  it("update_current_password wraps credential", async () => {
    restMocks.UserResource.updatePasswordCurrent.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    await tools.update_current_password({ password: "x" });
    expect(restMocks.UserResource.updatePasswordCurrent).toHaveBeenCalledWith({
      type: "password", value: "x", temporary: false,
    });
  });

  it("reset_user_secret returns the new secret string", async () => {
    restMocks.UserResource.resetSecret.mockResolvedValue({ data: "new-secret" });
    const { tools } = setup();
    const res = await tools.reset_user_secret({ realm: "master", userId: "u1" });
    expect(restMocks.UserResource.resetSecret).toHaveBeenCalledWith("master", "u1");
    expect(JSON.parse(res.content[0].text)).toBe("new-secret");
  });
});
