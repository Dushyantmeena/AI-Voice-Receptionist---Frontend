import { useMemo } from "react";
import { cn } from "@/utils/cn";

/**
 * Icon set sourced from the SVG files in `src/assets`.
 *
 * The files are plain Lucide exports (24×24, stroke="currentColor"), so they
 * inherit the surrounding text colour and match the lucide-react icons used
 * elsewhere in the app. Vite inlines them as raw markup, which keeps them on
 * the same rendering path as the React icons — no extra network requests and
 * no CSS-mask workarounds for colour.
 */
const modules = import.meta.glob<string>("../../assets/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

function normaliseName(path: string): string {
  const file = path.split("/").pop() ?? "";
  return file
    .replace(/\.svg$/i, "")
    .replace(/\s*\(\d+\)$/, "")
    .trim();
}

const SPRITE: Record<string, string> = {};
for (const [path, markup] of Object.entries(modules)) {
  const name = normaliseName(path);
  if (!SPRITE[name]) SPRITE[name] = markup;
}

function renderable(markup: string, size: number): string {
  return markup
    .replace(/\sclass="[^"]*"/g, "")
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`)
    .replace("<svg", '<svg focusable="false" aria-hidden="true"');
}

export type IconName = keyof typeof SPRITE | (string & {});

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /** Adds a label for screen readers; omit for purely decorative icons. */
  title?: string;
}

export function Icon({ name, size = 18, className, title }: IconProps) {
  const markup = SPRITE[name];

  const html = useMemo(() => (markup ? renderable(markup, size) : ""), [markup, size]);

  if (!html) return null;

  return (
    <span
      className={cn("icon", className)}
      style={{ width: size, height: size }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
