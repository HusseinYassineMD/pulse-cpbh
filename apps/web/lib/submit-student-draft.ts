import { ApiError } from "./api";
import { fetchAbortTimeout } from "./fetch-abort";
import { warmPulseApi } from "./warm-api";
import type { Post } from "./types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetrySubmit(error: unknown): boolean {
  if (error instanceof ApiError) {
    return (
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504 ||
      error.status === 408 ||
      error.status >= 500
    );
  }
  if (error instanceof Error) {
    const t = error.message.toLowerCase();
    return (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      t.includes("timeout") ||
      t.includes("network") ||
      t.includes("failed to fetch") ||
      t.includes("load failed")
    );
  }
  return false;
}

const UPLOAD_TIMEOUT_MS = 28_000;
const MAX_ATTEMPTS = 5;

/**
 * Send draft without blocking on warm first — Render free tier ~30s per HTTP request.
 * Retries after waking the API when cold start returns 502/timeout.
 */
export async function submitStudentDraftReliable(
  upload: (form: FormData) => Promise<Post>,
  form: FormData
): Promise<Post> {
  void warmPulseApi({ force: false });

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(800 * attempt);
      await warmPulseApi({ force: true, maxWaitMs: 55_000 });
    }

    try {
      return await uploadWithTimeout(upload, form);
    } catch (e) {
      lastError = e;
      if (!shouldRetrySubmit(e) || attempt === MAX_ATTEMPTS - 1) throw e;
    }
  }
  throw lastError;
}

async function uploadWithTimeout(
  upload: (form: FormData) => Promise<Post>,
  form: FormData
): Promise<Post> {
  const outer = fetchAbortTimeout(UPLOAD_TIMEOUT_MS);
  return new Promise<Post>((resolve, reject) => {
    const onAbort = () => {
      reject(new ApiError(504, "Request timed out — server may still be waking up. Try again in 30 seconds."));
    };
    outer.addEventListener("abort", onAbort, { once: true });
    upload(form)
      .then(resolve, reject)
      .finally(() => outer.removeEventListener("abort", onAbort));
  });
}
