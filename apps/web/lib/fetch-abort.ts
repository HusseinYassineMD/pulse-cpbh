/**
 * Safari's AbortSignal.timeout() throws
 * "The string did not match the expected pattern."
 * Always use a timer instead.
 */
export function fetchAbortTimeout(ms: number): AbortSignal {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}
