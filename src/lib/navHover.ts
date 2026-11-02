/*
 * The icon-only top menu: one item at a time opens to show its name.
 *
 * Opening an item widens it and pushes its neighbours. If the icon you are pointing at slid
 * away when it opened, the cursor would land on another item, which would open and push again:
 * a jittery loop. Two rules stop that, so no icon ever moves under a still cursor:
 *   1. Every open name gets the same width (the longest name in the current theme).
 *   2. The name opens on the side the cursor came from. Moving right, it appears to the left of
 *      the new icon, exactly in the space the previous name gives up; moving left, to the right.
 * Like one sliding window handed from icon to icon: the window stays put, the name changes.
 */
export type LabelSide = "left" | "right";

/** Which side the name of `next` opens on, given the item open before (null = none). */
export function nextSide(prev: number | null, next: number): LabelSide {
  return prev !== null && prev < next ? "left" : "right";
}

export type NavLayout = {
  /** Width of each item with its name hidden (icon + padding). */
  closed: number[];
  /** Width of an open name (the same for every item). */
  label: number;
  gap: number;
};

/** Where item i's icon starts, with `open` showing its name on `side` (pure geometry). */
export function iconLeft(g: NavLayout, open: number | null, side: LabelSide, i: number): number {
  let x = 0;
  for (let j = 0; j < i; j++) x += g.closed[j] + g.gap + (j === open ? g.label : 0);
  if (i === open && side === "left") x += g.label;
  return x;
}

/** Width to reserve so opening a name never changes the menu's width (no re-centring). */
export function reservedWidth(g: NavLayout): number {
  const n = g.closed.length;
  if (n === 0) return 0;
  return g.closed.reduce((a, b) => a + b, 0) + g.gap * (n - 1) + g.label;
}
