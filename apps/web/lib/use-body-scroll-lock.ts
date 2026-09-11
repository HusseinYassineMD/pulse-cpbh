"use client";

import { useEffect } from "react";

const MAIN_ID = "main-content";

let lockCount = 0;
let previousBodyOverflow: string | null = null;
let previousMainOverflow: string | null = null;

function lockBodyScroll() {
  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const main = document.getElementById(MAIN_ID);
    if (main) {
      previousMainOverflow = main.style.overflow;
      main.style.overflow = "hidden";
    }
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousBodyOverflow ?? "";
    previousBodyOverflow = null;

    const main = document.getElementById(MAIN_ID);
    if (main) {
      main.style.overflow = previousMainOverflow ?? "";
      previousMainOverflow = null;
    }
  }
}

/** Ref-counted scroll lock for body + main scroll surface — safe when modals stack. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}
