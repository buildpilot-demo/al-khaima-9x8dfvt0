import type { SitePalette } from "./types/site-config";

// Applies site.config.ts's palette as CSS custom properties on the root
// element, overriding styles.css's defaults. Called once at startup
// (main.tsx) so every customer site gets its own colors from config alone —
// no per-customer CSS edits required.
export function applyTheme(palette: SitePalette): void {
  const root = document.documentElement.style;
  root.setProperty("--color-background", palette.background);
  root.setProperty("--color-surface", palette.surface);
  root.setProperty("--color-text", palette.text);
  root.setProperty("--color-muted", palette.muted);
  root.setProperty("--color-accent", palette.accent);
  root.setProperty("--color-accent-hover", palette.accentHover);
}
