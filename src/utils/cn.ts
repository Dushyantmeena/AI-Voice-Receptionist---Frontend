/** Joins conditional class names, skipping falsey entries. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Builds a BEM class name, e.g. `bem("card", "header")` → `card__header`. */
export function bem(block: string, element?: string, modifier?: string): string {
  const base = element ? `${block}__${element}` : block;
  return modifier ? `${base} ${base}--${modifier}` : base;
}
