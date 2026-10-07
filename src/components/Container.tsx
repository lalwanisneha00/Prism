import type { ReactNode } from "react";

/** Centres content and keeps a comfortable side gutter at every screen width. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 lg:max-w-7xl lg:px-10 ${className}`}>
      {children}
    </div>
  );
}
