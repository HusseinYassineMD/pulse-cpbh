"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PostIdProvider } from "@/lib/post-id-context";
import { withBasePath } from "@/lib/base-path";
import PostDetailClient from "@/components/posts/post-detail-client";

function PostByQuery() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-3">
        <p className="font-medium">Post not found</p>
        <p className="text-sm text-muted-foreground">Open a draft from the review list.</p>
        <Link href={withBasePath("/review")} className="text-teal font-medium hover:underline text-sm">
          Go to review
        </Link>
      </div>
    );
  }

  return (
    <PostIdProvider id={id}>
      <PostDetailClient />
    </PostIdProvider>
  );
}

export default function PostQueryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground p-6">Loading post…</p>}>
      <PostByQuery />
    </Suspense>
  );
}
