import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { normalizeDisplayMath } from "@/lib/mathText";

const components: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]">{children}</code>
  ),
};

/**
 * Renders lesson text: markdown plus KaTeX maths ($inline$, $$display$$).
 * Raw HTML is never rendered and images are dropped, so lesson text cannot
 * inject markup or load outside content.
 */
export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`markdown flex flex-col gap-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={components}
        disallowedElements={["img"]}
      >
        {normalizeDisplayMath(children)}
      </ReactMarkdown>
    </div>
  );
}

/** A single formula given as bare LaTeX (no $ signs), shown in display style. */
export function Formula({ latex }: { latex: string }) {
  return <Markdown>{["$$", latex, "$$"].join("\n")}</Markdown>;
}
