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

/** Wake API (bounded wait), then submit — one retry on transient failures. */
export async function submitStudentDraftReliable(
  upload: (form: FormData) => Promise<Post>,
  form: FormData
): Promise<Post> {
  await Promise.race([warmPulseApi({ force: true, maxWaitMs: 45_000 }), sleep(12_000)]);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await upload(form);
    } catch (e) {
      lastError = e;
      if (!shouldRetrySubmit(e) || attempt === 1) throw e;
      await sleep(1500);
      await Promise.race([warmPulseApi({ force: true, maxWaitMs: 30_000 }), sleep(8_000)]);
    }
  }
  throw lastError;
}
