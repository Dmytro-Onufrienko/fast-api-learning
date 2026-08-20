export const UNREACHABLE_MESSAGE =
  "Service did not respond. Check that the container is running and your code has no syntax errors.";

/** True for network-level failures (connection refused, DNS, timeout) as opposed to HTTP error statuses. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof TypeError) return true; // fetch's generic "Failed to fetch" / "fetch failed"
  if (err instanceof Error && /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|network/i.test(err.message)) return true;
  return false;
}
