import type { ReactElement } from "react";
import { prerender } from "react-dom/static";

/**
 * Renders an element to HTML and waits for lazily loaded parts (widgets load on demand), so tests
 * see the finished widget and not its loading placeholder.
 */
export async function renderSettled(element: ReactElement): Promise<string> {
  const { prelude } = await prerender(element);
  return await new Response(prelude).text();
}

/** A stand-in for next/dynamic in tests: loads the component with React.lazy inside Suspense. */
export async function suspendingDynamic() {
  const React = await import("react");
  return {
    default: function dynamic(load: () => Promise<React.ComponentType<object>>) {
      const Lazy = React.lazy(async () => ({ default: await load() }));
      return function Loaded(props: object) {
        return (
          <React.Suspense fallback={null}>
            <Lazy {...props} />
          </React.Suspense>
        );
      };
    },
  };
}
