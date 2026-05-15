import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAll } from "../helpers/mock-rest.js";
import { captureServer } from "../helpers/capture.js";

const restMocks = vi.hoisted(() => ({
  UserResource: {
    updateCurrent: vi.fn(),
    updateCurrentUserLocale: vi.fn(),
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

const { registerUserSelfTools } = await import(
  "../../src/tools/users-self.js"
);

function setup() {
  const captured = captureServer();
  registerUserSelfTools(captured.server);
  return captured;
}

describe("users-self tools", () => {
  beforeEach(() => resetAll(restMocks));

  it("update_current_user forwards user object", async () => {
    restMocks.UserResource.updateCurrent.mockResolvedValue({
      data: { id: "self", firstName: "X" },
    });
    const { tools } = setup();
    await tools.update_current_user({ user: { firstName: "X" } });
    expect(restMocks.UserResource.updateCurrent).toHaveBeenCalledWith({ firstName: "X" });
  });

  it("update_current_user_locale passes locale string", async () => {
    restMocks.UserResource.updateCurrentUserLocale.mockResolvedValue({ data: undefined });
    const { tools } = setup();
    const res = await tools.update_current_user_locale({ locale: "nl_NL" });
    expect(restMocks.UserResource.updateCurrentUserLocale).toHaveBeenCalledWith("nl_NL");
    expect(res.content[0].text).toMatch(/Locale updated/);
  });
});
