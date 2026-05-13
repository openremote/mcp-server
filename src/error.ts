import { isAxiosError } from "@openremote/rest";

export function errorResult(err: unknown) {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const detail = err.response?.data;
    const message =
      typeof detail === "string" ? detail : (detail?.message ?? err.message);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: true,
              status,
              message,
              ...(typeof detail === "object" &&
                detail !== null && { detail }),
            },
            null,
            2
          ),
        },
      ],
      isError: true as const,
    };
  }
  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
      },
    ],
    isError: true as const,
  };
}
