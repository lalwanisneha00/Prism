"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * "Back" on every page except the home page: goes one step back to where the student just was
 * (with their choices kept in the address), or to the home page when there is nothing to go back to.
 */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 lg:max-w-7xl lg:px-10">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push("/");
        }}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        data-testid="back-button"
      >
        <span aria-hidden="true">←</span> Back
      </button>
    </div>
  );
}
