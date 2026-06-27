// ──────────────────────────────────────────────────────────────────────────
// Pixio Studio · CompareView
// A full-screen A/B/grid comparison overlay. 1 item → centered; 2 → draggable
// before/after wipe slider; 3–4 → responsive grid. Reads the compare selection
// from the store; closes on Esc, backdrop click, the close button, or "Clear".
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStudio } from '../../lib/studio/store';
import { familyColor } from '../../lib/prodia/catalog';
import type { ModelFamily } from '../../lib/prodia/types';
import type { StudioAsset } from '../../lib/studio/types';

const cost = (p?: number | null): string => (p || p === 0 ? `$${Number(p).toFixed(4)}` : '—');

interface CompareViewProps {
  open: boolean;
  onClose: () => void;
}

/** Renders the actual media (image or video) filling its box. */
function Media({ asset }: { asset: StudioAsset }) {
  const common: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  };
  if (asset.isVideo) {
    return <video src={asset.url} autoPlay loop muted playsInline style={common} />;
  }
  return <img src={asset.url} alt={asset.prompt} style={common} />;
}

/** Caption strip: model label, family badge (family color), price + remove ✕. */
function Caption({
  asset,
  onRemove,
}: {
  asset: StudioAsset;
  onRemove: () => void;
}) {
  const color = familyColor(asset.family as ModelFamily);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 4px 0',
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: '0 1 auto',
        }}
        title={asset.modelLabel}
      >
        {asset.modelLabel}
      </span>
      <span
        className="badge"
        style={{ color, borderColor: color, flexShrink: 0 }}
      >
        {asset.family}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pink-soft)', flexShrink: 0 }}>
        {cost(asset.price)}
      </span>
      <button
        className="btn icon sm"
        onClick={onRemove}
        aria-label={`Remove ${asset.modelLabel} from compare`}
        style={{ marginLeft: 'auto', flexShrink: 0 }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

/** Card wrapper: a framed media box plus its caption. */
function Card({
  asset,
  onRemove,
  maxBox,
}: {
  asset: StudioAsset;
  onRemove: () => void;
  maxBox?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        maxWidth: maxBox ? maxBox : '100%',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          width: '100%',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          background: 'var(--bg-deep)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <Media asset={asset} />
      </div>
      <Caption asset={asset} onRemove={onRemove} />
    </div>
  );
}

/** Two-up before/after wipe: both items fill the same box; B is clipped to x%. */
function BeforeAfter({
  a,
  b,
  onRemove,
}: {
  a: StudioAsset;
  b: StudioAsset;
  onRemove: (id: string) => void;
}) {
  const [pos, setPos] = useState(50); // percent
  const boxRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      setFromClientX(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      if (e.touches[0]) setFromClientX(e.touches[0].clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const startDrag = () => {
    draggingRef.current = true;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4));
    else if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4));
  };

  return (
    <div style={{ width: '100%', maxWidth: 'min(92vw, 1100px)', margin: '0 auto' }}>
      <div
        ref={boxRef}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          background: 'var(--bg-deep)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow)',
          userSelect: 'none',
          touchAction: 'none',
          cursor: 'ew-resize',
        }}
        onMouseDown={(e) => {
          startDrag();
          setFromClientX(e.clientX);
        }}
        onTouchStart={(e) => {
          startDrag();
          if (e.touches[0]) setFromClientX(e.touches[0].clientX);
        }}
      >
        {/* Base layer: A (full) */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <Media asset={a} />
        </div>
        {/* Top layer: B, clipped from the left to `pos`% */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: `inset(0 ${100 - pos}% 0 0)`,
            WebkitClipPath: `inset(0 ${100 - pos}% 0 0)`,
          }}
        >
          <Media asset={b} />
        </div>

        {/* Corner labels */}
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontSize: 11,
            fontWeight: 800,
            padding: '4px 9px',
            borderRadius: 99,
            background: 'rgba(8,2,12,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: familyColor(b.family as ModelFamily),
            border: `1px solid ${familyColor(b.family as ModelFamily)}`,
            pointerEvents: 'none',
          }}
        >
          {b.modelLabel}
        </span>
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: 11,
            fontWeight: 800,
            padding: '4px 9px',
            borderRadius: 99,
            background: 'rgba(8,2,12,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: familyColor(a.family as ModelFamily),
            border: `1px solid ${familyColor(a.family as ModelFamily)}`,
            pointerEvents: 'none',
          }}
        >
          {a.modelLabel}
        </span>

        {/* Handle */}
        <div
          role="slider"
          aria-label="Before / after wipe"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseDown={(e) => {
            e.stopPropagation();
            startDrag();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            startDrag();
          }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${pos}%`,
            width: 2,
            background: 'var(--pink)',
            boxShadow: '0 0 14px var(--pink)',
            transform: 'translateX(-1px)',
            cursor: 'ew-resize',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--pink)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 14,
              fontWeight: 900,
              boxShadow: '0 4px 18px rgba(8,2,12,0.6)',
              border: '2px solid rgba(255,255,255,0.5)',
            }}
          >
            ⇄
          </span>
        </div>
      </div>

      {/* Captions for both sides */}
      <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Caption asset={b} onRemove={() => onRemove(b.id)} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Caption asset={a} onRemove={() => onRemove(a.id)} />
        </div>
      </div>
    </div>
  );
}

export default function CompareView({ open, onClose }: CompareViewProps) {
  const assets = useStudio((s) => s.assets);
  const compareIds = useStudio((s) => s.compareIds);
  const toggleCompare = useStudio((s) => s.toggleCompare);
  const clearCompare = useStudio((s) => s.clearCompare);

  // Resolve selected, finished (has url) assets, preserving selection order.
  const items: StudioAsset[] = compareIds
    .map((id) => assets.find((a) => a.id === id))
    .filter((a): a is StudioAsset => !!a && a.status === 'done' && !!a.url);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || items.length < 1) return null;

  const remove = (id: string) => {
    toggleCompare(id);
    // If that emptied the resolvable set, close.
    const remaining = items.filter((a) => a.id !== id);
    if (remaining.length === 0) onClose();
  };

  const count = items.length;

  let body: React.ReactNode;
  if (count === 1) {
    body = <Card asset={items[0]} onRemove={() => remove(items[0].id)} maxBox={680} />;
  } else if (count === 2) {
    // A = first selected, B = second; B is the clipped/top layer.
    body = <BeforeAfter a={items[0]} b={items[1]} onRemove={remove} />;
  } else {
    body = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 18,
          width: '100%',
          maxWidth: 'min(92vw, 1100px)',
          margin: '0 auto',
        }}
      >
        {items.map((a) => (
          <Card key={a.id} asset={a} onRemove={() => remove(a.id)} />
        ))}
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 130,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--scrim)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        animation: 'fade-up 0.2s var(--ease)',
      }}
    >
      {/* Top bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 99,
            background: 'var(--panel)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--line)',
            fontSize: 12.5,
            fontWeight: 800,
            letterSpacing: '0.02em',
          }}
        >
          Compare {count}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn sm"
            onClick={() => {
              clearCompare();
              onClose();
            }}
          >
            Clear
          </button>
          <button className="btn icon" onClick={onClose} aria-label="Close compare">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        onClick={onClose}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px 28px',
        }}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 1100 }}>
          {body}
        </div>
      </div>
    </div>
  );
}
