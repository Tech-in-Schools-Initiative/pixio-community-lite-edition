// ──────────────────────────────────────────────────────────────────────────
// Pixio · Konva node renderers
// One component per element type. Each node is draggable / transformable and
// reports geometry changes back up. Image nodes also render an inline loading
// veil while an AI op is replacing their bitmap, and (in mask mode) the painted
// mask strokes clipped to the image box.
// ──────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Group, Rect, Ellipse, Text as KText, Image as KImage, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import { useCanvasImage } from '../../../lib/canvas/useImage';
import type { CanvasElement, ImageElement, MaskStroke, ShapeElement, TextElement } from '../../../lib/canvas/types';

interface NodeProps {
  el: CanvasElement;
  selected: boolean;
  draggable: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  registerRef: (id: string, node: Konva.Node | null) => void;
  onDblClick?: () => void;
  accentColor?: string;
}

/* Shared drag/transform commit handlers ----------------------------------- */
function commitDrag(onChange: NodeProps['onChange']) {
  return (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({ x: e.target.x(), y: e.target.y() });
  };
}

function rgbaFromHex(hex: string | undefined, alpha: number) {
  const raw = (hex || '#ff5fb7').trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.slice(0, 6);
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return `rgba(255, 95, 183, ${alpha})`;
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/* ── Image node ──────────────────────────────────────────────────────────── */
const ImageNode: React.FC<NodeProps & {
  el: ImageElement;
  maskMode: boolean;
  maskStrokes: MaskStroke[];
}> = ({ el, selected, draggable, onSelect, onChange, registerRef, maskMode, maskStrokes, accentColor = '#ff5fb7' }) => {
  const [image, status] = useCanvasImage(el.src);
  const placeholderFill = rgbaFromHex(accentColor, 0.16);
  const placeholderStroke = rgbaFromHex(accentColor, 0.36);
  const maskFill = rgbaFromHex(accentColor, 0.22);

  return (
    <Group
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.hidden ? 0 : el.opacity}
      listening={!el.locked && !el.hidden}
      draggable={draggable}
      onMouseDown={onSelect}
      onTap={onSelect as any}
      onDragEnd={commitDrag(onChange)}
      onTransformEnd={makeTransformEnd(onChange)}
      ref={(node) => registerRef(el.id, node)}
    >
      {/* checker / placeholder while loading or failed */}
      {status !== 'loaded' && (
        <Rect
          width={el.width}
          height={el.height}
          cornerRadius={el.cornerRadius}
          fill={placeholderFill}
          stroke={placeholderStroke}
          strokeWidth={1}
        />
      )}
      {image && status === 'loaded' && (
        <KImage
          image={image}
          width={el.width}
          height={el.height}
          cornerRadius={el.cornerRadius}
          shadowColor="rgba(0,0,0,0.5)"
          shadowBlur={selected ? 28 : 14}
          shadowOpacity={selected ? 0.5 : 0.28}
          shadowOffsetY={8}
        />
      )}

      {/* mask strokes overlay (only the element being masked) */}
      {maskMode && (
        <Group clipFunc={(ctx) => clipRoundRect(ctx, el.width, el.height, el.cornerRadius)}>
          <Rect width={el.width} height={el.height} fill={maskFill} />
          {maskStrokes.map((s, i) => (
            <Line
              key={i}
              points={s.points}
              stroke={s.paint ? accentColor : 'rgba(0,0,0,1)'}
              strokeWidth={s.size}
              lineCap="round"
              lineJoin="round"
              tension={0.2}
              globalCompositeOperation={s.paint ? 'source-over' : 'destination-out'}
              listening={false}
            />
          ))}
        </Group>
      )}

      {/* loading veil during AI op */}
      {el.loading && <LoadingVeil width={el.width} height={el.height} radius={el.cornerRadius} label={el.loadingLabel} accentColor={accentColor} />}
    </Group>
  );
};

/* ── Text node ───────────────────────────────────────────────────────────── */
const TextNode: React.FC<NodeProps & { el: TextElement }> = ({
  el,
  selected,
  draggable,
  onSelect,
  onChange,
  registerRef,
  onDblClick,
}) => (
  <KText
    id={el.id}
    text={el.text}
    x={el.x}
    y={el.y}
    width={el.width}
    rotation={el.rotation}
    fontSize={el.fontSize}
    fontFamily={el.fontFamily}
    fontStyle={el.fontStyle}
    align={el.align}
    fill={el.fill}
    lineHeight={el.lineHeight}
    letterSpacing={el.letterSpacing}
    opacity={el.hidden ? 0 : el.opacity}
    listening={!el.locked && !el.hidden}
    draggable={draggable}
    onMouseDown={onSelect}
    onTap={onSelect as any}
    onDblClick={onDblClick}
    onDblTap={onDblClick}
    onDragEnd={commitDrag(onChange)}
    onTransformEnd={(e) => {
      const node = e.target as Konva.Text;
      const scaleX = node.scaleX();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(20, node.width() * scaleX),
        // scale font with vertical drag of a corner handle
        fontSize: Math.max(6, el.fontSize * node.scaleY()),
      } as Partial<CanvasElement>);
    }}
    ref={(node) => registerRef(el.id, node)}
  />
);

/* ── Shape node (rect / ellipse) ─────────────────────────────────────────── */
const ShapeNode: React.FC<NodeProps & { el: ShapeElement }> = ({
  el,
  selected,
  draggable,
  onSelect,
  onChange,
  registerRef,
}) => {
  const common = {
    id: el.id,
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    opacity: el.hidden ? 0 : el.opacity,
    listening: !el.locked && !el.hidden,
    draggable,
    onMouseDown: onSelect,
    onTap: onSelect as any,
    onDragEnd: commitDrag(onChange),
    onTransformEnd: makeTransformEnd(onChange),
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: selected ? 24 : 10,
    shadowOpacity: 0.3,
    shadowOffsetY: 6,
  };
  if (el.type === 'ellipse') {
    return (
      <Ellipse
        {...common}
        x={el.x + el.width / 2}
        y={el.y + el.height / 2}
        radiusX={el.width / 2}
        radiusY={el.height / 2}
        offsetX={0}
        ref={(node) => registerRef(el.id, node)}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Ellipse;
          const sx = node.scaleX();
          const sy = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          const w = Math.max(8, node.radiusX() * 2 * sx);
          const h = Math.max(8, node.radiusY() * 2 * sy);
          onChange({
            width: w,
            height: h,
            x: node.x() - w / 2,
            y: node.y() - h / 2,
            rotation: node.rotation(),
          } as Partial<CanvasElement>);
        }}
      />
    );
  }
  return (
    <Rect
      {...common}
      width={el.width}
      height={el.height}
      cornerRadius={el.cornerRadius}
      ref={(node) => registerRef(el.id, node)}
    />
  );
};

/* ── Loading veil drawn over an image while an AI op runs ─────────────────── */
const LoadingVeil: React.FC<{ width: number; height: number; radius: number; label?: string; accentColor?: string }> = ({
  width,
  height,
  radius,
  label,
  accentColor = '#ff5fb7',
}) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(10, Math.min(width, height) * 0.12);
  const veilFill = rgbaFromHex(accentColor, 0.32);
  return (
    <Group listening={false}>
      <Rect width={width} height={height} cornerRadius={radius} fill={veilFill} />
      <SpinnerArc x={cx} y={cy} radius={r} accentColor={accentColor} />
      {label && (
        <KText
          text={label}
          x={0}
          y={cy + r + 10}
          width={width}
          align="center"
          fontSize={Math.max(11, Math.min(width, height) * 0.05)}
          fontFamily="Inter, sans-serif"
          fontStyle="bold"
          fill="#fff"
        />
      )}
    </Group>
  );
};

/** A rotating arc used as a Konva spinner. Animated by Stage's batchDraw loop
 *  via the `rotation` ticking from the parent — but to be self-contained we use
 *  a Konva animation in an effect. */
const SpinnerArc: React.FC<{ x: number; y: number; radius: number; accentColor?: string }> = ({ x, y, radius, accentColor = '#ff5fb7' }) => {
  const ref = React.useRef<Konva.Circle>(null);
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      node.rotation(((t - start) / 3) % 360);
      node.getLayer()?.batchDraw();
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);
  return (
    <Circle
      ref={ref}
      x={x}
      y={y}
      radius={radius}
      stroke={accentColor}
      strokeWidth={Math.max(3, radius * 0.18)}
      dash={[radius * 2.0, radius * 1.4]}
      lineCap="round"
      shadowColor={accentColor}
      shadowBlur={16}
    />
  );
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function makeTransformEnd(onChange: NodeProps['onChange']) {
  return (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target as Konva.Node & { width(): number; height(): number };
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(8, node.width() * scaleX),
      height: Math.max(8, node.height() * scaleY),
    } as Partial<CanvasElement>);
  };
}

/** Clip path for a rounded rect (used to confine the mask overlay). */
function clipRoundRect(ctx: Konva.Context | CanvasRenderingContext2D, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(w - radius, 0);
  ctx.arcTo(w, 0, w, radius, radius);
  ctx.lineTo(w, h - radius);
  ctx.arcTo(w, h, w - radius, h, radius);
  ctx.lineTo(radius, h);
  ctx.arcTo(0, h, 0, h - radius, radius);
  ctx.lineTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  ctx.closePath();
}

/* ── Dispatcher ──────────────────────────────────────────────────────────── */
export const CanvasNode: React.FC<NodeProps & { maskMode: boolean; maskStrokes: MaskStroke[] }> = (props) => {
  const { el } = props;
  if (el.type === 'image') {
    return <ImageNode {...(props as any)} el={el} />;
  }
  if (el.type === 'text') {
    return <TextNode {...(props as any)} el={el} />;
  }
  return <ShapeNode {...(props as any)} el={el} />;
};
