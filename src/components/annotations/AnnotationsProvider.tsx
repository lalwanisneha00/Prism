"use client";

import { ensureHighlightStyles } from "@/components/annotations/highlightStyles";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { makeAnchor, resolveAnchor } from "@/lib/annotations/anchor";
import {
  blockText,
  canHighlight,
  caretAt,
  offsetOf,
  offsetsToRange,
  rangeToOffsets,
} from "@/lib/annotations/domText";
import {
  addBlockNote,
  addHighlight,
  listForLesson,
  removeAnnotation,
  saveAnnotation,
} from "@/lib/annotations/store";
import type { Lesson } from "@/lib/schema";
import type { Annotation, HighlightColor } from "@/lib/storage/db";
import { lessonId } from "@/lib/storage/library";

/** Where each annotation is on the page right now (null range = not found: "unanchored"). */
export type Placed = { annotation: Annotation; range: Range | null; blockEl: Element | null };

type AnnotationsApi = {
  annotations: Annotation[];
  placed: Placed[];
  supported: boolean;
  onlyMine: boolean;
  setOnlyMine: (v: boolean) => void;
  editing: Annotation | null;
  openEditor: (a: Annotation | null) => void;
  highlightSelection: (color: HighlightColor) => Promise<Annotation | null>;
  commentOnSelection: () => Promise<Annotation | null>;
  addNote: (block: string, sectionId?: string) => Promise<Annotation>;
  update: (a: Annotation) => Promise<void>;
  remove: (a: Annotation) => Promise<void>;
  scrollTo: (a: Annotation) => void;
};

const Ctx = createContext<AnnotationsApi | null>(null);
export const useAnnotations = () => useContext(Ctx);

const BLOCK = "[data-anno-block]";

/** The text block and character range of the current selection, if it is inside one block. */
function selectionTarget(root: Element) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const startBlock = (range.startContainer.parentElement ?? null)?.closest(BLOCK);
  const endBlock = (range.endContainer.parentElement ?? null)?.closest(BLOCK);
  if (!startBlock || startBlock !== endBlock || !root.contains(startBlock)) return null;
  const bt = blockText(startBlock);
  const { start, end } = rangeToOffsets(bt, range);
  if (end <= start || !bt.text.slice(start, end).trim()) return null;
  return {
    block: startBlock.getAttribute("data-anno-block")!,
    sectionId: startBlock.getAttribute("data-section-id") ?? undefined,
    text: bt.text,
    anchor: makeAnchor(bt.text, start, end),
  };
}

/** Highlights and comments for one lesson: loading, placing, painting and editing them. */
export function AnnotationsProvider({
  lesson,
  container,
  children,
}: {
  lesson: Lesson;
  container: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const id = lessonId(lesson.meta);
  const dataVersion = useDataVersion();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [editing, setEditing] = useState<Annotation | null>(null);
  const [supported] = useState(() => typeof window !== "undefined" && canHighlight());
  const [layoutTick, setLayoutTick] = useState(0);

  const reload = useCallback(
    () =>
      listForLesson(id)
        .then(setAnnotations)
        .catch(() => setAnnotations([])),
    [id],
  );
  useEffect(() => {
    void reload();
  }, [reload, dataVersion]);

  // Re-place highlights whenever the lesson's DOM changes (e.g. a section expands).
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setLayoutTick((t) => t + 1), 200);
    };
    // Changes inside our own note UI (markers, note lists) don't move the lesson text.
    const observer = new MutationObserver((records) => {
      const own = (n: Node) =>
        (n instanceof Element ? n : n.parentElement)?.closest("[data-anno-skip]") !== null;
      if (records.every((r) => own(r.target))) return;
      bump();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", bump);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", bump);
    };
  }, [container]);

  // Anchor every annotation (offsets, then quote search) and paint highlights. Done in an
  // animation frame: it reads the laid-out page, which is what effects are for.
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const names: (HighlightColor | "comment")[] = [
      "important",
      "confused",
      "formula",
      "exam",
      "comment",
    ];
    const frame = requestAnimationFrame(() => {
      const cache = new Map<Element, ReturnType<typeof blockText>>();
      const next: Placed[] = annotations.map((a) => {
        const blockEl = root.querySelector(`[data-anno-block="${CSS.escape(a.block)}"]`);
        if (!a.anchor) return { annotation: a, range: null, blockEl };
        if (!blockEl) return { annotation: a, range: null, blockEl: null };
        const bt = cache.get(blockEl) ?? blockText(blockEl);
        cache.set(blockEl, bt);
        const at = resolveAnchor(bt.text, a.anchor);
        return { annotation: a, range: at ? offsetsToRange(bt, at.start, at.end) : null, blockEl };
      });

      // Mark what has notes, for "show only my highlights".
      root.querySelectorAll("[data-has-anno]").forEach((el) => el.removeAttribute("data-has-anno"));
      for (const p of next) {
        if (!p.blockEl) continue;
        p.blockEl.setAttribute("data-has-anno", "");
        p.blockEl.closest("[data-lesson-block]")?.setAttribute("data-has-anno", "");
        const card = p.blockEl.closest("[data-section-card]");
        card?.setAttribute("data-has-anno", "");
        // The paragraph (or list, formula…) that holds the highlight.
        // Section text is <block><div class="markdown"><p>…: mark the paragraph itself.
        const parent = p.blockEl.querySelector(":scope > .markdown") ?? p.blockEl;
        const node = p.range?.startContainer;
        let el = node instanceof Element ? node : (node?.parentElement ?? null);
        while (el && el.parentElement && el.parentElement !== parent) el = el.parentElement;
        if (el && el.parentElement === parent) el.setAttribute("data-has-anno", "");
      }
      setPlaced(next);
      if (!supported) return;
      ensureHighlightStyles();
      for (const name of names) {
        const ranges = next
          .filter((p) => p.range && (p.annotation.color ?? "comment") === name)
          .map((p) => p.range!);
        CSS.highlights.set(`prism-${name}`, new Highlight(...ranges));
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (supported) for (const name of names) CSS.highlights.delete(`prism-${name}`);
    };
  }, [annotations, container, supported, layoutTick]);

  // Tapping highlighted text opens that highlight (when nothing is being selected).
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    function onClick(e: MouseEvent) {
      if (!window.getSelection()?.isCollapsed) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("button, a, input, textarea, select, [data-anno-skip]")) return;
      const blockEl = target?.closest(BLOCK);
      const caret = caretAt(e.clientX, e.clientY);
      if (!blockEl || !caret) return;
      const pos = offsetOf(blockText(blockEl), caret.node, caret.offset);
      const hits = placed.filter((p) => {
        if (p.blockEl !== blockEl || !p.range || !p.annotation.anchor) return false;
        const bt = blockText(blockEl);
        const { start, end } = rangeToOffsets(bt, p.range);
        return pos >= start && pos <= end;
      });
      if (hits.length === 0) return;
      // The smallest highlight under the finger is the one meant.
      hits.sort((a, b) => a.range!.toString().length - b.range!.toString().length);
      setEditing(hits[0].annotation);
    }
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [container, placed]);

  // Opening /lesson?…#anno-<id> (from My Notes) scrolls to that note.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || placed.length === 0) return;
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("anno-")) return;
    const p = placed.find((x) => x.annotation.id === hash.slice(5));
    if (!p) return;
    opened.current = true;
    const target = p.range?.getBoundingClientRect() ?? p.blockEl?.getBoundingClientRect();
    if (target) window.scrollTo({ top: window.scrollY + target.top - 120, behavior: "smooth" });
    setTimeout(() => setEditing(p.annotation), 400);
  }, [placed]);

  const replace = (a: Annotation) =>
    setAnnotations((list) => [...list.filter((x) => x.id !== a.id), a]);
  const api: AnnotationsApi = {
    annotations,
    placed,
    supported,
    onlyMine,
    setOnlyMine,
    editing,
    openEditor: setEditing,
    async highlightSelection(color) {
      const root = container.current;
      const target = root && selectionTarget(root);
      if (!target) return null;
      const added = await addHighlight(lesson, target, color, annotations);
      window.getSelection()?.removeAllRanges();
      await reload();
      return added;
    },
    async commentOnSelection() {
      const root = container.current;
      const target = root && selectionTarget(root);
      if (!target) return null;
      // A comment on selected text is a highlight with no colour: shown underlined.
      const added = await saveAnnotation({
        ...(await addHighlight(lesson, target, "important", [])),
        color: undefined,
      });
      window.getSelection()?.removeAllRanges();
      await reload();
      setEditing(added);
      return added;
    },
    async addNote(block, sectionId) {
      const added = await addBlockNote(lesson, block, sectionId, "");
      replace(added);
      setEditing(added);
      return added;
    },
    async update(a) {
      replace(await saveAnnotation(a));
    },
    async remove(a) {
      await removeAnnotation(a);
      setAnnotations((list) => list.filter((x) => x.id !== a.id));
      setEditing(null);
    },
    scrollTo(a) {
      const p = placed.find((x) => x.annotation.id === a.id);
      const rect = p?.range?.getBoundingClientRect() ?? p?.blockEl?.getBoundingClientRect();
      if (rect) window.scrollTo({ top: window.scrollY + rect.top - 120, behavior: "smooth" });
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
