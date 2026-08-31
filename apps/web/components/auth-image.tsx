"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { assetPath } from "@/lib/base-path";

export function AuthImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const resolvedSrc = src.startsWith("/") ? assetPath(src) : src;
  const isPublicAsset = src.startsWith("/demo/");

  useEffect(() => {
    if (isPublicAsset) return;

    let revoked: string | null = null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(resolvedSrc, { headers })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      })
      .catch(() => setBlobUrl(null));

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [resolvedSrc, token, isPublicAsset]);

  if (isPublicAsset) {
    return <img src={resolvedSrc} alt={alt} className={className} />;
  }

  if (!blobUrl) {
    return <div className={`bg-gray-100 animate-pulse ${className}`} />;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
