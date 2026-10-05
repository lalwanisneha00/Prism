"use client";

import { Icon } from "@/components/Icon";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useAnnotations } from "@/components/annotations/AnnotationsProvider";
import { ColorSwatch } from "@/components/annotations/ColorSwatch";
import { highlightColors } from "@/lib/annotations/store";
import { ExplainAnswer } from "@/components/explain/ExplainAnswer";
import { SelectionCardEditor } from "@/components/flashcards/SelectionCardEditor";
import { useExplain, useLesson } from "@/components/explain/useExplain";
import { MAX_SELECTION } from "@/lib/explain/explain";

type Selected = { text: string; left: number; top: number };
type Asked = { action: "explain" | "define" | "card"; text: string };

/**
 * Select any text in the lesson → a small toolbar: highlight in one of four colours, comment,
 * Explain, Define or make a flashcard. Answers open in a card at the bottom of the screen.
 * Keyboard: select with Shift + arrows, then Alt+H moves focus into the toolbar.
 */
export function SelectionPopup({ container }: { container: RefObject<HTMLElement | null> }) {
  const lesson = useLesson();
  const { state, run, reset } = useExplain(lesson);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [asked, setAsked] = useState<Asked | null>(null);
  const anno = useAnnotations();
  const toolbar = useRef<HTMLDivElement>(null);

  // Alt+H: jump from a keyboard selection into the toolbar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === "h" && toolbar.current) {
        e.preventDefault();
        toolbar.current.querySelector("button")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(timer);
      // Wait until the student has finished dragging.
      timer = setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
        const root = container.current;
        if (!sel || sel.isCollapsed || !root || text.length < 2 || text.length > MAX_SELECTION) {
          setSelected(null);
          return;
        }
        const range = sel.getRangeAt(0);
        if (!root.contains(range.commonAncestorContainer)) return setSelected(null);
        const rect = range.getBoundingClientRect();
        // Below the selection, where phones don't put their own copy/paste menu.
        const below = rect.bottom + 56 < window.innerHeight;
        setSelected({
          text,
          left: Math.min(Math.max(12, rect.left + rect.width / 2 - 160), window.innerWidth - 332),
          top: below ? rect.bottom + 10 : Math.max(8, rect.top - 100),
        });
      }, 250);
    };
    const hide = () => setSelected(null);
    document.addEventListener("selectionchange", check);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", check);
      window.removeEventListener("scroll", hide);
    };
  }, [container]);

  if (!lesson) return null;

  function ask(action: Asked["action"], text: string) {
    setAsked({ action, text });
    setSelected(null);
    // A flashcard's back starts as a short definition of the selection.
    void run({ action: action === "card" ? "define" : action, selection: text });
  }

  return (
    <>
      {selected && (
        <div
          ref={toolbar}
          role="toolbar"
          aria-label="Highlight or ask about the selected text"
          style={{ left: selected.left, top: selected.top }}
          className="fixed z-50 flex w-[20rem] max-w-[calc(100vw-24px)] flex-col gap-1 rounded-2xl border border-border bg-surface p-1 shadow-lg"
          // Keep the selection while the student presses a button.
          onPointerDown={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected(null);
          }}
        >
          {anno && (
            <div className="flex items-center gap-1 border-b border-border px-1 pb-1">
              {highlightColors.map((c) => (
                <ColorSwatch
                  key={c.color}
                  color={c.color}
                  label={c.label}
                  onPick={() => {
                    setSelected(null);
                    void anno.highlightSelection(c.color);
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  void anno.commentOnSelection();
                }}
                className="ml-auto rounded-full px-2.5 py-1.5 text-sm font-semibold hover:bg-surface-2"
              >
                <Icon name="comment" /> Comment
              </button>
            </div>
          )}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => ask("explain", selected.text)}
              className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
            >
              <Icon name="idea" /> Explain
            </button>
            <button
              type="button"
              onClick={() => ask("define", selected.text)}
              className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
            >
              <Icon name="book" /> Define
            </button>
            <button
              type="button"
              onClick={() => ask("card", selected.text)}
              className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
            >
              ＋ Flashcard
            </button>
          </div>
        </div>
      )}

      {asked && state.status !== "idle" && (
        <aside
          aria-label={
            asked.action === "card"
              ? "New flashcard"
              : asked.action === "define"
                ? "Definition"
                : "Explanation"
          }
          className="fixed inset-x-3 bottom-3 z-50 max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem]"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-sm">
              <span className="font-semibold text-primary">
                {asked.action === "card" ? (
                  <>
                    <Icon name="library" /> New flashcard
                  </>
                ) : asked.action === "define" ? (
                  <>
                    <Icon name="book" /> Define
                  </>
                ) : (
                  <>
                    <Icon name="idea" /> Explain
                  </>
                )}
                :
              </span>{" "}
              <span className="text-muted">
                “{asked.text.length > 90 ? `${asked.text.slice(0, 90)}…` : asked.text}”
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                reset();
                setAsked(null);
              }}
              aria-label="Close"
              className="rounded-full px-2 text-muted hover:bg-surface-2"
            >
              ✕
            </button>
          </div>
          {asked.action === "card" ? (
            <SelectionCardEditor
              key={asked.text}
              selection={asked.text}
              lesson={lesson}
              definition={state}
              onRetry={() => ask("card", asked.text)}
            />
          ) : (
            <ExplainAnswer state={state} onRetry={() => ask(asked.action, asked.text)} />
          )}
        </aside>
      )}
    </>
  );
}
