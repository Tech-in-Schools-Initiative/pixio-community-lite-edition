// ──────────────────────────────────────────────────────────────────────────
// Pixio · Canvas geometry helpers
// Pure math: sizing dropped images to the viewport, computing rotated bounding
// boxes for the contextual toolbar, and converting between screen / stage space.
// ──────────────────────────────────────────────────────────────────────────

import type { CanvasElement, Viewport } from './types';
import { MAX_SCALE, MIN_SCALE } from './types';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Fit (w,h) inside a max box, preserving aspect ratio. Never upscales. */
export function fitInto(w: number, h: number, maxW: number, maxH: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: maxW, height: maxH };
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/** Scale (w,h) so the LONGER side equals `target`. Used to size new media nicely. */
export function scaleLongSide(w: number, h: number, target: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: target, height: target };
  const ratio = target / Math.max(w, h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const clampScale = (s: number) => clamp(s, MIN_SCALE, MAX_SCALE);

/** Convert a stage-space point to screen (container) pixels. */
export function stageToScreen(pt: { x: number; y: number }, vp: Viewport): { x: number; y: number } {
  return { x: pt.x * vp.scale + vp.x, y: pt.y * vp.scale + vp.y };
}

/** Convert a screen (container) point to stage space. */
export function screenToStage(pt: { x: number; y: number }, vp: Viewport): { x: number; y: number } {
  return { x: (pt.x - vp.x) / vp.scale, y: (pt.y - vp.y) / vp.scale };
}

const deg2rad = (d: number) => (d * Math.PI) / 180;

/**
 * Konva rotates a node about its top-left origin (x,y). Return the four
 * corners of an element in stage space, accounting for rotation.
 */
export function elementCorners(el: CanvasElement): { x: number; y: number }[] {
  const r = deg2rad(el.rotation);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const pts = [
    { x: 0, y: 0 },
    { x: el.width, y: 0 },
    { x: el.width, y: el.height },
    { x: 0, y: el.height },
  ];
  return pts.map((p) => ({
    x: el.x + p.x * cos - p.y * sin,
    y: el.y + p.x * sin + p.y * cos,
  }));
}

/** Axis-aligned bounding box of one element in stage space. */
export function elementAABB(el: CanvasElement): Box {
  const c = elementCorners(el);
  const xs = c.map((p) => p.x);
  const ys = c.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** Combined AABB of several elements in stage space. */
export function elementsAABB(els: CanvasElement[]): Box | null {
  if (!els.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of els) {
    const b = elementAABB(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Compute a viewport that centres `box` (stage space) inside a container of
 * (cw, ch) px with padding, capped scale.
 */
export function fitViewport(box: Box, cw: number, ch: number, pad = 80): Viewport {
  if (box.width <= 0 || box.height <= 0) {
    return { scale: 1, x: cw / 2, y: ch / 2 };
  }
  const scale = clampScale(Math.min((cw - pad * 2) / box.width, (ch - pad * 2) / box.height));
  const x = cw / 2 - (box.x + box.width / 2) * scale;
  const y = ch / 2 - (box.y + box.height / 2) * scale;
  return { scale, x, y };
}

/** Where to drop a new element so it lands centred in the current viewport. */
export function centerOfViewport(vp: Viewport, cw: number, ch: number): { x: number; y: number } {
  return screenToStage({ x: cw / 2, y: ch / 2 }, vp);
}
