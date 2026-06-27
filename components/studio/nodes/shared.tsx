// ──────────────────────────────────────────────────────────────────────────
// Pixio · Node chrome — shared visual primitives for every node component.
// Typed colour-coded handles, the glassy node frame, status pill, model
// picker, and a tiny theme resolver. All styling is inline / styled-jsx so we
// never import a .css file.
// ──────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  Play,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { TOKENS, type Theme } from '../../../lib/studio/types';
import {
  DATA_TYPE_COLORS,
  type HandlePort,
  type NodeSpec,
} from '../../../lib/graph/registry';
import type { NodeStatus } from '../../../lib/graph/store';
import type { ProdiaModel } from '../../../lib/prodia/types';

// ── theme palette (dark default, light variant) ─────────────────────────────
export interface Palette {
  bg: string;
  panel: string;
  panel2: string;
  line: string;
  lineStrong: string;
  text: string;
  muted: string;
  faint: string;
  field: string;
  fieldLine: string;
  nodeBg: string;
  nodeHeaderTint: string;
}

export const paletteFor = (_theme: Theme): Palette => ({
  bg: TOKENS.bg,
  panel: 'color-mix(in srgb, var(--panel) 88%, transparent)',
  panel2: 'color-mix(in srgb, var(--panel-2) 94%, transparent)',
  line: TOKENS.line,
  lineStrong: TOKENS.lineStrong,
  text: TOKENS.text,
  muted: TOKENS.muted,
  faint: TOKENS.faint,
  field: 'color-mix(in srgb, var(--pink) 8%, transparent)',
  fieldLine: 'color-mix(in srgb, var(--pink) 22%, transparent)',
  nodeBg: 'color-mix(in srgb, var(--panel) 90%, transparent)',
  nodeHeaderTint: 'color-mix(in srgb, var(--pink) 7%, transparent)',
});

// ── typed handle ─────────────────────────────────────────────────────────────
interface PortHandleProps {
  port: HandlePort;
  type: 'source' | 'target';
  /** vertical offset within the node body, in px */
  top: number;
  pal: Palette;
}

export const PortHandle: React.FC<PortHandleProps> = ({ port, type, top, pal }) => {
  const color = DATA_TYPE_COLORS[port.dataType];
  const side = type === 'source' ? Position.Right : Position.Left;
  return (
    <div className="px-port" style={{ top, [type === 'source' ? 'right' : 'left']: 0 } as React.CSSProperties}>
      <span
        className={`px-port-label ${type}`}
        style={{ color: pal.muted }}
      >
        {port.label}
      </span>
      <Handle
        id={port.id}
        type={type}
        position={side}
        className="px-handle"
        style={{
          background: color,
          borderColor: pal.nodeBg,
          boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 34%, transparent), 0 0 10px color-mix(in srgb, ${color} 42%, transparent)`,
        }}
      />
      <style jsx>{`
        .px-port {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 6px;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .px-port-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .px-port-label.target {
          padding-left: 14px;
        }
        .px-port-label.source {
          order: -1;
          padding-right: 14px;
        }
      `}</style>
    </div>
  );
};

// ── status pill ──────────────────────────────────────────────────────────────
export const StatusPill: React.FC<{ status: NodeStatus; pal: Palette; error?: string }> = ({
  status,
  pal,
  error,
}) => {
  if (status === 'running') {
    return (
      <span className="px-status running">
        <LoaderCircle size={11} className="px-spin" /> Running
        <style dangerouslySetInnerHTML={{ __html: statusCss(pal) }} />
      </span>
    );
  }
  if (status === 'queued') {
    return (
      <span className="px-status queued">
        Queued
        <style dangerouslySetInnerHTML={{ __html: statusCss(pal) }} />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="px-status error" title={error}>
        <CircleAlert size={11} /> Error
        <style dangerouslySetInnerHTML={{ __html: statusCss(pal) }} />
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="px-status done">
        <Check size={11} /> Done
        <style dangerouslySetInnerHTML={{ __html: statusCss(pal) }} />
      </span>
    );
  }
  return null;
};

const statusCss = (pal: Palette) => `
  .px-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }
  .px-status.running { color: ${TOKENS.cyan}; background: ${TOKENS.cyan}1f; }
  .px-status.queued { color: ${pal.muted}; background: ${pal.line}; }
  .px-status.error { color: ${TOKENS.danger}; background: ${TOKENS.danger}22; }
  .px-status.done { color: ${TOKENS.mint}; background: ${TOKENS.mint}1f; }
  :global(.px-spin) { animation: px-rotate 0.8s linear infinite; }
  @keyframes px-rotate { to { transform: rotate(360deg); } }
`;

// ── node frame ───────────────────────────────────────────────────────────────
interface NodeFrameProps {
  spec: NodeSpec;
  pal: Palette;
  selected?: boolean;
  status: NodeStatus;
  error?: string;
  title: string;
  badge?: string;
  /** body height in px used to lay out handles; default auto */
  onRun?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  runDisabled?: boolean;
  children: React.ReactNode;
  /** total handle rows above content — controls top padding for handle labels */
}

const ROW = 26;
const HEADER = 46;

export const NodeFrame: React.FC<NodeFrameProps> = ({
  spec,
  pal,
  selected,
  status,
  error,
  title,
  badge,
  onRun,
  onDuplicate,
  onRemove,
  runDisabled,
  children,
}) => {
  const accent = spec.accent;
  const inputs = spec.inputs;
  const outputs = spec.outputs;

  return (
    <div
      className={`px-node ${selected ? 'sel' : ''} ${status}`}
      style={{
        background: pal.nodeBg,
        borderColor: selected ? accent : pal.line,
        boxShadow: selected
          ? `var(--shadow), 0 0 0 1px ${accent}, 0 0 30px color-mix(in srgb, ${accent} 36%, transparent)`
          : status === 'running'
            ? `var(--shadow), 0 0 0 1px color-mix(in srgb, ${TOKENS.cyan} 55%, transparent)`
            : TOKENS.shadow,
      }}
    >
      {/* accent rail */}
      <div className="px-rail" style={{ background: `linear-gradient(180deg, ${accent}, ${accent}00)` }} />

      {/* header */}
      <div className="px-head" style={{ borderColor: pal.line }}>
        <span className="px-dot" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
        <div className="px-titles">
          <span className="px-title" style={{ color: pal.text }}>{title}</span>
          {badge ? <span className="px-badge" style={{ color: accent, background: `${accent}1f` }}>{badge}</span> : null}
        </div>
        <div className="px-head-actions">
          <StatusPill status={status} pal={pal} error={error} />
          {onRun ? (
            <button
              className="px-icon"
              title="Run this node"
              onClick={onRun}
              disabled={runDisabled || status === 'running'}
              style={{ color: accent, borderColor: pal.line }}
            >
              <Play size={13} />
            </button>
          ) : null}
          {onDuplicate ? (
            <button className="px-icon" title="Duplicate" onClick={onDuplicate} style={{ color: pal.muted, borderColor: pal.line }}>
              <Copy size={13} />
            </button>
          ) : null}
          {onRemove ? (
            <button className="px-icon danger" title="Delete" onClick={onRemove} style={{ color: TOKENS.danger, borderColor: pal.line }}>
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      </div>

      {/* body */}
      <div className="px-body">{children}</div>

      {/* input handles (left) */}
      {inputs.map((port, i) => (
        <PortHandle
          key={`in-${port.id}`}
          port={port}
          type="target"
          top={HEADER + ROW * i + ROW / 2}
          pal={pal}
        />
      ))}
      {/* output handles (right) */}
      {outputs.map((port, i) => (
        <PortHandle
          key={`out-${port.id}`}
          port={port}
          type="source"
          top={HEADER + ROW * i + ROW / 2}
          pal={pal}
        />
      ))}

      {error && status === 'error' ? (
        <div className="px-err" style={{ color: TOKENS.danger, borderColor: `${TOKENS.danger}33`, background: `${TOKENS.danger}14` }}>
          {error}
        </div>
      ) : null}

      <style jsx>{`
        .px-node {
          position: relative;
          width: 260px;
          border: 1px solid;
          border-radius: 16px;
          backdrop-filter: blur(18px) saturate(1.2);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
          font-family: ${TOKENS.font};
          overflow: visible;
          transition: box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }
        .px-node:hover { transform: translateY(-1px); }
        .px-rail {
          position: absolute;
          left: 0;
          top: 10px;
          bottom: 10px;
          width: 3px;
          border-radius: 3px;
          opacity: 0.9;
        }
        .px-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 12px 10px 16px;
          border-bottom: 1px solid;
        }
        .px-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
        .px-titles { display: flex; align-items: center; gap: 7px; min-width: 0; flex: 1; }
        .px-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .px-badge {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 2px 6px;
          border-radius: 6px;
          flex: none;
        }
        .px-head-actions { display: flex; align-items: center; gap: 5px; flex: none; }
        .px-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 8px;
          border: 1px solid;
          background: transparent;
          cursor: pointer;
          transition: background 0.14s ease, transform 0.1s ease, opacity 0.14s ease;
        }
        .px-icon:hover:not(:disabled) { background: rgba(255,255,255,0.07); }
        .px-icon:active:not(:disabled) { transform: scale(0.92); }
        .px-icon:disabled { opacity: 0.4; cursor: default; }
        .px-icon.danger:hover:not(:disabled) { background: ${TOKENS.danger}1c; }
        .px-body { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
        .px-err {
          margin: 0 12px 12px;
          padding: 8px 10px;
          font-size: 11px;
          line-height: 1.4;
          border: 1px solid;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

// ── model picker ─────────────────────────────────────────────────────────────
interface ModelPickerProps {
  models: ProdiaModel[];
  value?: string;
  onChange: (id: string) => void;
  pal: Palette;
  accent: string;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ models, value, onChange, pal, accent }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = useMemo(() => models.find((m) => m.id === value) ?? models[0], [models, value]);

  // Group models by family for a scannable menu.
  const groups = useMemo(() => {
    const map = new Map<string, ProdiaModel[]>();
    for (const m of models) {
      const arr = map.get(m.family) ?? [];
      arr.push(m);
      map.set(m.family, arr);
    }
    return Array.from(map.entries());
  }, [models]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!current) return null;

  return (
    <div className="px-mp" ref={ref}>
      <button
        type="button"
        className="px-mp-btn nodrag"
        onClick={() => setOpen((o) => !o)}
        style={{ background: pal.field, borderColor: open ? accent : pal.fieldLine, color: pal.text }}
      >
        <span className="px-mp-cur">
          <span className="px-mp-label">{current.label}</span>
          {current.badge ? <span className="px-mp-badge" style={{ color: accent, background: `${accent}22` }}>{current.badge}</span> : null}
        </span>
        <ChevronDown size={14} style={{ color: pal.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.16s' }} />
      </button>

      {open ? (
        <div className="px-mp-menu nodrag nowheel" style={{ background: pal.panel2, borderColor: pal.lineStrong }}>
          {groups.map(([family, list]) => (
            <div key={family} className="px-mp-group">
              <div className="px-mp-grouphead" style={{ color: pal.faint }}>{family}</div>
              {list.map((m) => {
                const active = m.id === current.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`px-mp-item ${active ? 'active' : ''}`}
                    onClick={() => { onChange(m.id); setOpen(false); }}
                    style={{ color: pal.text, background: active ? `${accent}1c` : 'transparent' }}
                  >
                    <span className="px-mp-itemlabel">
                      {m.label}
                      {m.badge ? <span className="px-mp-badge" style={{ color: accent, background: `${accent}22` }}>{m.badge}</span> : null}
                    </span>
                    <span className="px-mp-desc" style={{ color: pal.muted }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}

      <style jsx>{`
        .px-mp { position: relative; width: 100%; }
        .px-mp-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 10px;
          border: 1px solid;
          border-radius: 10px;
          cursor: pointer;
          font-family: ${TOKENS.font};
          font-size: 12px;
          font-weight: 600;
          transition: border-color 0.16s ease, background 0.16s ease;
        }
        .px-mp-cur { display: flex; align-items: center; gap: 6px; min-width: 0; }
        .px-mp-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .px-mp-badge {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 1px 5px;
          border-radius: 5px;
          flex: none;
        }
        .px-mp-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 40;
          max-height: 280px;
          overflow-y: auto;
          border: 1px solid;
          border-radius: 12px;
          padding: 6px;
          box-shadow: ${TOKENS.shadow};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .px-mp-group { margin-bottom: 4px; }
        .px-mp-grouphead {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 6px 8px 3px;
        }
        .px-mp-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 100%;
          text-align: left;
          padding: 7px 8px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: ${TOKENS.font};
          transition: background 0.12s ease;
        }
        .px-mp-item:hover { background: rgba(255,255,255,0.06) !important; }
        .px-mp-itemlabel { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
        .px-mp-desc { font-size: 10px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  );
};

// ── output preview (image / video) ──────────────────────────────────────────
export const OutputPreview: React.FC<{
  url?: string;
  isVideo?: boolean;
  status: NodeStatus;
  pal: Palette;
  accent: string;
  placeholder?: string;
}> = ({ url, isVideo, status, pal, accent, placeholder }) => {
  return (
    <div
      className="px-preview"
      style={{ background: pal.field, borderColor: pal.fieldLine }}
    >
      {url ? (
        isVideo ? (
          <video src={url} className="px-media" controls loop muted playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="output" className="px-media" />
        )
      ) : (
        <div className="px-ph" style={{ color: pal.faint }}>
          {status === 'running' ? (
            <span className="px-ph-run" style={{ color: accent }}>
              <LoaderCircle size={20} className="px-spin" />
              <span>Generating…</span>
            </span>
          ) : (
            <span>{placeholder ?? 'No output yet'}</span>
          )}
        </div>
      )}
      <style jsx>{`
        .px-preview {
          width: 100%;
          aspect-ratio: 1 / 1;
          border: 1px solid;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .px-media { width: 100%; height: 100%; object-fit: cover; display: block; }
        .px-ph { display: flex; align-items: center; justify-content: center; font-size: 11px; padding: 16px; text-align: center; }
        .px-ph-run { display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; }
        :global(.px-spin) { animation: px-rotate 0.8s linear infinite; }
        @keyframes px-rotate { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
