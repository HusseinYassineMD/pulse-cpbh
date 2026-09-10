"use client";

import { isStaticMode, withBasePath } from "@/lib/base-path";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";

function isLocalDev(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

export function AuthImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const staticMode = isStaticMode();
  const directLoad = staticMode || isLocalDev();
  const resolvedSrc = withBasePath(staticMode ? src.replace(/^\/api\/media/, "/media") : src);

  useEffect(() => {
    if (directLoad) return;
    setFailed(false);

    let revoked: string | null = null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(resolvedSrc, { headers })
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      })
      .catch(() => {
        setBlobUrl(null);
        setFailed(true);
      });

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [resolvedSrc, token, directLoad]);

  if (failed) {
    return (
      <div
        className={`bg-muted flex items-center justify-center text-xs text-muted-foreground ${className ?? ""}`}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        No preview
      </div>
    );
  }

  if (directLoad) {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  if (!blobUrl) {
    return (
      <div
        className={`bg-gray-100 animate-pulse ${className ?? ""}`}
        role="status"
        aria-label={`Loading ${alt}`}
      />
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}
