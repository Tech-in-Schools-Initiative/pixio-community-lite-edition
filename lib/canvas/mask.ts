// ──────────────────────────────────────────────────────────────────────────
// Pixio · Inpaint mask builder + bitmap utilities
// Strokes are captured in the image element's LOCAL space (0..elementWidth,
// 0..elementHeight). To build the mask we scale those coordinates up to the
// source bitmap's natural pixel size and rasterise white strokes on black.
// White = repaint region (standard Prodia/SD inpaint convention).
// Everything is guarded for the browser (offscreen <canvas>).
// ──────────────────────────────────────────────────────────────────────────

import type { MaskStroke } from './types';
import { loadImageSize } from './useImage';

interface BuildMaskArgs {
  /** the source image src (data/http URL) — used to learn natural size */
  src: string;
  /** element box size in stage px (the un-rotated width/height of the node) */
  elementWidth: number;
  elementHeight: number;
  strokes: MaskStroke[];
  /** optional explicit output size; defaults to natural bitmap size */
  outWidth?: number;
  outHeight?: number;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/**
 * Rasterise the freehand strokes to a black/white mask PNG at the source's
 * natural pixel size. Returns a data URL, or null if nothing was painted.
 */
export async function buildMaskDataUrl(args: BuildMaskArgs): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const painted = args.strokes.filter((s) => s.paint && s.points.length >= 2);
  if (!painted.length) return null;

  let outW = args.outWidth ?? 0;
  let outH = args.outHeight ?? 0;
  if (!outW || !outH) {
    try {
      const { width, height } = await loadImageSize(args.src);
      outW = width;
      outH = height;
    } catch {
      outW = Math.round(args.elementWidth);
      outH = Math.round(args.elementHeight);
    }
  }

  const sx = outW / args.elementWidth;
  const sy = outH / args.elementHeight;

  const canvas = makeCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Black background = keep.
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, outW, outH);

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const stroke of args.strokes) {
    const pts = stroke.points;
    if (pts.length < 2) continue;
    const color = stroke.paint ? '#ffffff' : '#000000';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    // average scale for a circular brush
    ctx.lineWidth = Math.max(1, stroke.size * ((sx + sy) / 2));

    ctx.beginPath();
    ctx.moveTo(pts[0] * sx, pts[1] * sy);
    if (pts.length === 2) {
      // a single tap — draw a dot
      ctx.lineTo(pts[0] * sx + 0.01, pts[1] * sy + 0.01);
    } else {
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i] * sx, pts[i + 1] * sy);
      }
    }
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Composite a source bitmap onto a solid-color background and return a JPEG/PNG
 * data URL. Used to flatten transparency before edit models that dislike alpha.
 * (Not always needed, but handy.)
 */
export async function flattenOnBackground(src: string, bg = '#ffffff'): Promise<string> {
  if (typeof document === 'undefined') return src;
  const { image, width, height } = await loadImageSize(src);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}
