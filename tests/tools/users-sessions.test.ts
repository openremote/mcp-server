import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  UserResource: {
    getUserSessions: vi.fn(),
    disconnectUserSession: vi.fn(),
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

const { registerUserSessionTools } = await import(
  "../../src/tools/users-sessions.js"
);

function setup() {
  const captured = captureServer();
  registerUserSessionTools(captured.server);
  return captured;
}

describe("users-sessions tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("get_user_sessions passes (realm, userId)", async () => {
    restMocks.UserResource.getUserSessions.mockResolvedValue({
      data: [{ id: "sess1", startTime: 1700000000000 }],
    });
    const { tools } = setup();
    const res = await tools.get_user_sessions({ realm: "master", userId: "u1" });
    expect(restMocks.UserResource.getUserSessions).toHaveBeenCalledWith("master", "u1");
    expect(JSON.parse(res.content[0].text)[0].id).toBe("sess1");
  });

  it("disconnect_user_session passes (realm, sessionId)", async () => {
    restMocks.UserResource.disconnectUserSession.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    const res = await tools.disconnect_user_session({ realm: "master", sessionId: "sess1" });
    expect(restMocks.UserResource.disconnectUserSession).toHaveBeenCalledWith("master", "sess1");
    expect(res.content[0].text).toMatch(/Disconnected session sess1/);
  });
});
