"use client";

import { isStaticMode, withBasePath } from "@/lib/base-path";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";

export function AuthImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const staticMode = isStaticMode();
  const resolvedSrc = withBasePath(staticMode ? src.replace(/^\/api\/media/, "/media") : src);

  useEffect(() => {
    if (staticMode) return;
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
      .catch(() => setBlobUrl(null));

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [resolvedSrc, token, staticMode]);

  if (staticMode) {
    if (failed) {
      return <div className={`bg-gray-100 ${className}`} />;
    }
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  if (!blobUrl) {
    return <div className={`bg-gray-100 animate-pulse ${className}`} />;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
