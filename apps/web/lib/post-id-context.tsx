"use client";

import { createContext, useContext } from "react";

const PostIdContext = createContext<string | null>(null);

export function PostIdProvider({ id, children }: { id: string; children: React.ReactNode }) {
  return <PostIdContext.Provider value={id}>{children}</PostIdContext.Provider>;
}

export function usePostIdContext(): string | null {
  return useContext(PostIdContext);
}
