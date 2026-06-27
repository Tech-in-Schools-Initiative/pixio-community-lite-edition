// ──────────────────────────────────────────────────────────────────────────
// Pixio · Canvas element model
// The freeform board is an ordered array of CanvasElement. Array order is the
// z-order (last element renders on top). Every element shares a common box
// (x, y, width, height, rotation, opacity, locked) plus type-specific props.
// ──────────────────────────────────────────────────────────────────────────

export type ElementType = 'image' | 'text' | 'rect' | 'ellipse';

/** Fields every element on the board shares. */
export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  name: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  /** data URL (or http URL) of the bitmap */
  src: string;
  /** original prompt / instruction that produced it, if any */
  prompt?: string;
  /** model type string that produced it, if any */
  modelType?: string;
  /** corner radius in element px (visual rounding) */
  cornerRadius: number;
  /** true while an AI op is replacing this element's bitmap */
  loading?: boolean;
  /** transient status label shown over the element while loading */
  loadingLabel?: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string; // 'normal' | 'bold' | 'italic' | 'italic bold'
  align: 'left' | 'center' | 'right';
  fill: string;
  lineHeight: number;
  letterSpacing: number;
}

export interface ShapeElement extends BaseElement {
  type: 'rect' | 'ellipse';
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export type CanvasElement = ImageElement | TextElement | ShapeElement;

export const isImage = (el: CanvasElement | undefined): el is ImageElement =>
  !!el && el.type === 'image';
export const isText = (el: CanvasElement | undefined): el is TextElement =>
  !!el && el.type === 'text';
export const isShape = (el: CanvasElement | undefined): el is ShapeElement =>
  !!el && (el.type === 'rect' || el.type === 'ellipse');

/** Tool currently armed in the left rail. */
export type ToolId =
  | 'select'
  | 'hand'
  | 'image'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'generate'
  | 'mask';

/** A single freehand stroke painted while in mask mode. */
export interface MaskStroke {
  /** flat [x1,y1,x2,y2,...] in the element's LOCAL (un-rotated) pixel space */
  points: number[];
  /** brush diameter in element-local px */
  size: number;
  /** false = erase (paint background/keep), true = paint repaint region */
  paint: boolean;
}

/** Viewport transform of the infinite stage. */
export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

let counter = 0;
/** Monotonic id generator — stable across SSR because it's call-time only. */
export const uid = (prefix = 'el'): string => {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
};

export const MIN_SCALE = 0.04;
export const MAX_SCALE = 8;

/** Sensible defaults shared by element factories. */
const baseDefaults = (over: Partial<BaseElement>): Omit<BaseElement, 'type'> => ({
  id: uid(),
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  name: 'Element',
  ...over,
});

export const makeImageElement = (
  src: string,
  width: number,
  height: number,
  over: Partial<ImageElement> = {},
): ImageElement => ({
  ...baseDefaults({ width, height, name: 'Image', ...over }),
  type: 'image',
  src,
  cornerRadius: 0,
  ...over,
});

export const makeTextElement = (over: Partial<TextElement> = {}): TextElement => ({
  ...baseDefaults({ width: 360, height: 80, name: 'Text', ...over }),
  type: 'text',
  text: 'Double-click to edit',
  fontSize: 48,
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontStyle: 'bold',
  align: 'left',
  fill: '#fff4fb',
  lineHeight: 1.15,
  letterSpacing: 0,
  ...over,
});

export const makeShapeElement = (
  type: 'rect' | 'ellipse',
  over: Partial<ShapeElement> = {},
): ShapeElement => ({
  ...baseDefaults({ width: 280, height: 200, name: type === 'rect' ? 'Rectangle' : 'Ellipse', ...over }),
  type,
  fill: type === 'rect' ? '#ff5fb7' : '#a855f7',
  stroke: 'rgba(255,255,255,0)',
  strokeWidth: 0,
  cornerRadius: type === 'rect' ? 18 : 0,
  ...over,
});
