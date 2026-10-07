import {
  BarChart3,
  BookOpen,
  Coffee,
  FileText,
  Feather,
  Flame,
  GraduationCap,
  Headphones,
  Layers,
  Lightbulb,
  Library,
  Lock,
  Map,
  MapPin,
  MessageSquare,
  PartyPopper,
  PenLine,
  Pin,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sprout,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

/*
 * The one icon set (Feature C): line icons that take the text colour, replacing emoji, which
 * look different on every device and read as decoration. Always decorative: the words next to
 * an icon carry the meaning, so icons are hidden from screen readers.
 */
const icons = {
  chart: BarChart3,
  book: BookOpen,
  break: Coffee,
  file: FileText,
  feather: Feather,
  flame: Flame,
  study: GraduationCap,
  audio: Headphones,
  idea: Lightbulb,
  cards: Layers,
  library: Library,
  lock: Lock,
  map: Map,
  pin: MapPin,
  comment: MessageSquare,
  done: PartyPopper,
  note: PenLine,
  bookmark: Pin,
  print: Printer,
  again: RefreshCw,
  verified: ShieldCheck,
  grow: Sprout,
  warn: TriangleAlert,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const Glyph = icons[name];
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      strokeWidth={1.75}
      className={`inline-block size-[1.1em] shrink-0 align-[-0.15em] ${className}`}
    />
  );
}
