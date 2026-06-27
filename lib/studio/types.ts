// ──────────────────────────────────────────────────────────────────────────
// Pixio · Shared studio types + design tokens
// Used across the classic studio, the node graph and the canvas editor.
// ──────────────────────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light';
export type Surface = 'studio' | 'canvas' | 'nodes';

/** A finished (or in-flight) generation, shareable across surfaces. */
export interface StudioAsset {
  id: string;
  status: 'running' | 'done' | 'error';
  url?: string;
  isVideo?: boolean;
  outputs?: string[];
  metadata?: Record<string, unknown> | null;
  mimeType?: string;
  prompt: string;
  modelType: string;
  modelLabel: string;
  family: string;
  source: Surface;
  createdAt: number;
  price?: number | null;
  error?: string;
}

/** Canonical design tokens. Colors reference the CSS custom properties defined
 *  in index.css (and overridden by [data-theme] + the accent system), so every
 *  surface that styles via HTML/styled-jsx recolors live with theme + accent.
 *  NOTE: these resolve via CSS — do NOT feed them to Konva fill/stroke (canvas
 *  2D can't parse var()); compute real colors there instead. */
export const TOKENS = {
  bg: 'var(--bg)',
  panel: 'var(--panel)',
  panel2: 'var(--panel-2)',
  line: 'var(--line)',
  lineStrong: 'var(--line-strong)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  faint: 'var(--faint)',
  pink: 'var(--pink)',
  pinkSoft: 'var(--pink-soft)',
  violet: 'var(--violet)',
  magenta: 'var(--magenta)',
  cyan: 'var(--cyan)',
  mint: 'var(--mint)',
  danger: 'var(--danger)',
  accent: 'var(--accent)',
  radius: 14,
  radiusSm: 10,
  shadow: 'var(--shadow)',
  font: 'var(--font)',
} as const;
