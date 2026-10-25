"use client";

import { useEffect } from "react";
import { startPulseApiKeepWarm } from "@/lib/warm-api";

/** Keeps the team API warm while students stay on Ideate / Send. */
export function WarmPulseOnMount() {
  useEffect(() => startPulseApiKeepWarm(), []);
  return null;
}
