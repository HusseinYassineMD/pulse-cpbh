import { ApiError } from "./api";
import { warmPulseApi } from "./warm-api";
import type { Post } from "./types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetrySubmit(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 502 || error.status === 503 || error.status === 504 || error.status >= 500;
  }
  if (error instanceof Error) {
    const t = error.message.toLowerCase();
    return error.name === "TimeoutError" || t.includes("timeout") || t.includes("network");
  }
  return false;
}

/** Connect in the background, then submit — retries once if the first attempt fails transiently. */
export async function submitStudentDraftReliable(
  upload: (form: FormData) => Promise<Post>,
  form: FormData
): Promise<Post> {
  await warmPulseApi({ force: true, maxWaitMs: 55_000 });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await upload(form);
    } catch (e) {
      lastError = e;
      if (!shouldRetrySubmit(e) || attempt === 1) throw e;
      await sleep(2000);
      await warmPulseApi({ force: true, maxWaitMs: 55_000 });
    }
  }
  throw lastError;
}
