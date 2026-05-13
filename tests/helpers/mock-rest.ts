export function makeAxiosError(status: number, data?: unknown) {
  const err = new Error(`HTTP ${status}`) as any;
  err.isAxiosError = true;
  err.response = { status, data };
  return err;
}

export function resetAll(group: Record<string, any>) {
  for (const sub of Object.values(group)) {
    for (const fn of Object.values(sub as Record<string, any>)) {
      (fn as any).mockReset?.();
    }
  }
}
