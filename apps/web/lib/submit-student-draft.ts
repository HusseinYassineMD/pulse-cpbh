import { ApiError } from "./api";
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

const HARD_TIMEOUT_MS = 95_000;
const MAX_ATTEMPTS = 2;

/**
 * One long attempt so a sleeping Render API can wake and return the ticket.
 * A second attempt runs only if the first one fails.
 */
export async function submitStudentDraftReliable(
  upload: (form: FormData) => Promise<Post>,
  form: FormData
): Promise<Post> {
  void warmPulseApi({ force: true, maxWaitMs: 20_000 });

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(1000);
      await warmPulseApi({ force: true, maxWaitMs: 55_000 });
    }

    try {
      return await withHardTimeout(upload(form), HARD_TIMEOUT_MS);
    } catch (e) {
      lastError = e;
      if (!shouldRetrySubmit(e) || attempt === MAX_ATTEMPTS - 1) throw e;
    }
  }
  throw lastError;
}

function withHardTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ApiError(504, "Request timed out — server may still be waking up. Try again in 30 seconds."));
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
