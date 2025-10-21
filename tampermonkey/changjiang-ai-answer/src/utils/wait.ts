export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface WaitUntilOptions {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
}

export async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  options: WaitUntilOptions = {},
): Promise<boolean> {
  const { timeoutMs = 10000, intervalMs = 100, signal } = options;
  const start = Date.now();
  while (true) {
    if (signal?.aborted) return false;
    const ok = await predicate();
    if (ok) return true;
    if (Date.now() - start > timeoutMs) return false;
    await sleep(intervalMs);
  }
}

