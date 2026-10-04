import ReactMarkdown, { type Components, type Options } from "react-markdown";
import { GlossaryTerm } from "@/components/explain/GlossaryTerm";
import { rehypeGlossary, type GlossaryEntry } from "@/lib/glossary";
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
  // A fenced code block (V3 · Step 5): scrolls sideways on phones instead of widening the page.
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-3 font-mono text-sm leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ children, className }) =>
    className?.startsWith("language-") ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]">{children}</code>
    ),
};

/**
 * Renders lesson text: markdown plus KaTeX maths ($inline$, $$display$$).
 * Raw HTML is never rendered and images are dropped, so lesson text cannot
 * inject markup or load outside content.
 */
export function Markdown({
  children,
  className = "",
  glossary,
}: {
  children: string;
  className?: string;
  /** Key terms to mark with hover cards (their first appearance in this text). */
  glossary?: GlossaryEntry[];
}) {
  const withGlossary = glossary && glossary.length > 0;
  const plugins: NonNullable<Options["rehypePlugins"]> = [
    [rehypeKatex, { throwOnError: false, strict: "ignore" }],
  ];
  if (withGlossary) plugins.push([rehypeGlossary, { terms: glossary.map((g) => g.term) }]);
  return (
    <div className={`markdown flex flex-col gap-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={plugins}
        components={withGlossary ? glossaryComponents(glossary) : components}
        disallowedElements={["img"]}
      >
        {normalizeDisplayMath(children)}
      </ReactMarkdown>
    </div>
  );
}

/** The usual components, plus glossary terms (marked by rehypeGlossary) as hover cards. */
function glossaryComponents(glossary: GlossaryEntry[]): Components {
  const definitions = new Map(glossary.map((g) => [g.term, g.definition]));
  return {
    ...components,
    span: ({ node, children, ...props }) => {
      void node;
      const term = (props as { "data-glossary"?: string })["data-glossary"];
      const definition = term ? definitions.get(term) : undefined;
      return term && definition ? (
        <GlossaryTerm term={term} definition={definition}>
          {children}
        </GlossaryTerm>
      ) : (
        <span {...props}>{children}</span>
      );
    },
  };
}

/** A single formula given as bare LaTeX (no $ signs), shown in display style. */
export function Formula({ latex }: { latex: string }) {
  return <Markdown>{["$$", latex, "$$"].join("\n")}</Markdown>;
}
