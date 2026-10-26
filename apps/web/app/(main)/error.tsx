"use client";

import { useEffect, useState } from "react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [onLocalhost, setOnLocalhost] = useState(false);

  useEffect(() => {
    console.error(error);
    setOnLocalhost(/localhost|127\.0\.0\.1/.test(window.location.hostname));
  }, [error]);

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {error.message || "The page hit an unexpected error."} Tap Try again, or reload this tab.
      </p>
      {onLocalhost && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you are running this on your computer, stop the server and run{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">./start.sh dev</code>, then open{" "}
          <a href="http://localhost:3010/ideate" className="text-teal font-medium underline">
            http://localhost:3010/ideate
          </a>
          .
        </p>
      )}
      <button type="button" onClick={() => reset()} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">
        Try again
      </button>
    </div>
  );
}
