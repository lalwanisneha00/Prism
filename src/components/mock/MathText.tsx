import "katex/dist/katex.min.css";
import { Markdown } from "@/components/lesson/Markdown";
import { safeMathText } from "@/lib/mock/mathClean";

/**
 * Mock-test text with its maths rendered by KaTeX: the AI's text is tidied first, and maths that
 * can't render is shown as readable text (√(x), (a)/(b), π…), never as raw code.
 */
export function MathText({ children, className = "" }: { children: string; className?: string }) {
  return <Markdown className={`mock-math ${className}`}>{safeMathText(children)}</Markdown>;
}
