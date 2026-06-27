// ──────────────────────────────────────────────────────────────────────────
// Pixio · Right-hand inspector
// Two stacked sections: Layers (reorderable list w/ visibility + select) and
// Properties of the current selection (opacity, geometry, type-specific style,
// z-order). Purely controlled — every change flows up through callbacks.
// ──────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Type,
  Square,
  Circle as CircleIcon,
  Layers,
} from 'lucide-react';
import { TOKENS } from '../../../lib/studio/types';
import type { CanvasElement } from '../../../lib/canvas/types';
import { isImage, isShape, isText } from '../../../lib/canvas/types';
import { ColorField, IconButton, PanelLabel, Slider, TextField } from './ui';

const typeIcon = (t: CanvasElement['type']) => {
  if (t === 'image') return <ImageIcon size={13} />;
  if (t === 'text') return <Type size={13} />;
  if (t === 'rect') return <Square size={13} />;
  return <CircleIcon size={13} />;
};

export const PropertiesPanel: React.FC<{
  elements: CanvasElement[]; // already in render order (bottom→top)
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
  onPatch: (id: string, patch: Partial<CanvasElement>) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, to: 'front' | 'back' | 'forward' | 'backward') => void;
  onToggleHidden: (id: string) => void;
  onToggleLock: (id: string) => void;
}> = ({ elements, selectedIds, onSelect, onPatch, onDelete, onReorder, onToggleHidden, onToggleLock }) => {
  const selId = selectedIds.length === 1 ? selectedIds[0] : null;
  const sel = selId ? elements.find((e) => e.id === selId) ?? null : null;

  // Layers list: top layer first (reverse of render order).
  const layers = [...elements].reverse();

  return (
    <div className="panel">
      <div className="scroll">
        {/* Layers */}
        <section className="sec">
          <PanelLabel
            right={
              <span className="count">
                <Layers size={11} /> {elements.length}
              </span>
            }
          >
            Layers
          </PanelLabel>
          <div className="layers">
            {layers.length === 0 && <p className="empty">Your board is empty. Add or generate something.</p>}
            {layers.map((el) => {
              const active = selectedIds.includes(el.id);
              return (
                <div
                  key={el.id}
                  className={`layer${active ? ' active' : ''}${el.hidden ? ' dim' : ''}`}
                  onMouseDown={(e) => onSelect(el.id, e.shiftKey)}
                >
                  <span className="ico">{typeIcon(el.type)}</span>
                  <span className="lname">{layerName(el)}</span>
                  <button
                    type="button"
                    className="mini"
                    title={el.locked ? 'Unlock' : 'Lock'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock(el.id);
                    }}
                  >
                    {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <button
                    type="button"
                    className="mini"
                    title={el.hidden ? 'Show' : 'Hide'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHidden(el.id);
                    }}
                  >
                    {el.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Properties */}
        {sel && (
          <section className="sec">
            <PanelLabel>{layerName(sel)}</PanelLabel>

            {/* z-order */}
            <div className="zrow">
              <IconButton title="To front" size={32} onClick={() => onReorder(sel.id, 'front')}>
                <ChevronsUp size={15} />
              </IconButton>
              <IconButton title="Forward" size={32} onClick={() => onReorder(sel.id, 'forward')}>
                <ChevronUp size={15} />
              </IconButton>
              <IconButton title="Backward" size={32} onClick={() => onReorder(sel.id, 'backward')}>
                <ChevronDown size={15} />
              </IconButton>
              <IconButton title="To back" size={32} onClick={() => onReorder(sel.id, 'back')}>
                <ChevronsDown size={15} />
              </IconButton>
              <span className="spacer" />
              <IconButton title="Delete" size={32} danger onClick={() => onDelete(sel.id)}>
                <Trash2 size={15} />
              </IconButton>
            </div>

            <div className="field">
              <Slider
                label="Opacity"
                value={Math.round(sel.opacity * 100)}
                min={0}
                max={100}
                suffix="%"
                onChange={(v) => onPatch(sel.id, { opacity: v / 100 })}
              />
            </div>

            <div className="field">
              <Slider
                label="Rotation"
                value={Math.round(sel.rotation)}
                min={-180}
                max={180}
                suffix="°"
                onChange={(v) => onPatch(sel.id, { rotation: v })}
              />
            </div>

            {/* geometry */}
            <div className="dims">
              <NumField label="W" value={Math.round(sel.width)} onChange={(v) => onPatch(sel.id, { width: Math.max(8, v) })} />
              <NumField label="H" value={Math.round(sel.height)} onChange={(v) => onPatch(sel.id, { height: Math.max(8, v) })} />
              <NumField label="X" value={Math.round(sel.x)} onChange={(v) => onPatch(sel.id, { x: v })} />
              <NumField label="Y" value={Math.round(sel.y)} onChange={(v) => onPatch(sel.id, { y: v })} />
            </div>

            {/* image-specific */}
            {isImage(sel) && (
              <div className="field">
                <Slider
                  label="Corner radius"
                  value={Math.round(sel.cornerRadius)}
                  min={0}
                  max={Math.round(Math.min(sel.width, sel.height) / 2)}
                  suffix="px"
                  onChange={(v) => onPatch(sel.id, { cornerRadius: v })}
                />
              </div>
            )}

            {/* text-specific */}
            {isText(sel) && (
              <>
                <div className="field">
                  <TextField
                    value={sel.text}
                    multiline
                    rows={2}
                    placeholder="Text…"
                    onChange={(v) => onPatch(sel.id, { text: v })}
                  />
                </div>
                <div className="field">
                  <Slider
                    label="Font size"
                    value={Math.round(sel.fontSize)}
                    min={8}
                    max={240}
                    suffix="px"
                    onChange={(v) => onPatch(sel.id, { fontSize: v })}
                  />
                </div>
                <div className="seg">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={`segbtn${sel.align === a ? ' on' : ''}`}
                      onClick={() => onPatch(sel.id, { align: a })}
                    >
                      {a[0].toUpperCase() + a.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="seg">
                  {(
                    [
                      ['normal', 'Regular'],
                      ['bold', 'Bold'],
                      ['italic', 'Italic'],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      className={`segbtn${sel.fontStyle === v ? ' on' : ''}`}
                      onClick={() => onPatch(sel.id, { fontStyle: v })}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="field">
                  <ColorField label="Color" value={sel.fill} onChange={(v) => onPatch(sel.id, { fill: v })} />
                </div>
              </>
            )}

            {/* shape-specific */}
            {isShape(sel) && (
              <>
                <div className="field">
                  <ColorField label="Fill" value={sel.fill} onChange={(v) => onPatch(sel.id, { fill: v })} />
                </div>
                <div className="field">
                  <ColorField label="Stroke" value={sel.stroke} onChange={(v) => onPatch(sel.id, { stroke: v })} />
                </div>
                <div className="field">
                  <Slider
                    label="Stroke width"
                    value={sel.strokeWidth}
                    min={0}
                    max={40}
                    onChange={(v) => onPatch(sel.id, { strokeWidth: v })}
                  />
                </div>
                {sel.type === 'rect' && (
                  <div className="field">
                    <Slider
                      label="Corner radius"
                      value={sel.cornerRadius}
                      min={0}
                      max={Math.round(Math.min(sel.width, sel.height) / 2)}
                      onChange={(v) => onPatch(sel.id, { cornerRadius: v })}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {selectedIds.length > 1 && (
          <section className="sec">
            <PanelLabel>{selectedIds.length} selected</PanelLabel>
            <p className="empty">Multiple elements selected. Drag on the board to move them together.</p>
          </section>
        )}
      </div>

      <style jsx>{`
        .panel {
          width: 280px;
          flex: 0 0 280px;
          height: 100%;
          background: linear-gradient(180deg, ${TOKENS.panel}, ${TOKENS.bg});
          border-left: 1px solid ${TOKENS.line};
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (max-width: 1024px) { .panel { width: 230px; flex-basis: 230px; } }
        @media (max-width: 820px) { .panel { display: none; } }
        .scroll {
          flex: 1 1 auto;
          overflow-y: auto;
          padding: 16px 14px 28px;
        }
        .sec {
          margin-bottom: 22px;
        }
        .count {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .layers {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .empty {
          font-size: 12px;
          color: ${TOKENS.faint};
          line-height: 1.5;
          margin: 2px 0 0;
        }
        .layer {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 8px;
          border-radius: ${TOKENS.radiusSm}px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 0.12s ease, border-color 0.12s ease;
        }
        .layer:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .layer.active {
          background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 16%, transparent), color-mix(in srgb, var(--violet) 16%, transparent));
          border-color: color-mix(in srgb, var(--pink) 40%, transparent);
        }
        .layer.dim {
          opacity: 0.5;
        }
        .ico {
          color: ${TOKENS.pinkSoft};
          display: inline-flex;
          flex: 0 0 auto;
        }
        .lname {
          flex: 1 1 auto;
          font-size: 12.5px;
          color: ${TOKENS.text};
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mini {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: ${TOKENS.faint};
          cursor: pointer;
          flex: 0 0 auto;
          transition: color 0.12s ease, background 0.12s ease;
        }
        .mini:hover {
          color: ${TOKENS.text};
          background: rgba(255, 255, 255, 0.08);
        }
        .zrow {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
        }
        .spacer {
          flex: 1 1 auto;
        }
        .field {
          margin-bottom: 13px;
        }
        .dims {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 13px;
        }
        .seg {
          display: flex;
          gap: 4px;
          margin-bottom: 10px;
        }
        .segbtn {
          flex: 1 1 0;
          padding: 7px 4px;
          border-radius: 8px;
          border: 1px solid ${TOKENS.line};
          background: rgba(255, 255, 255, 0.02);
          color: ${TOKENS.muted};
          font-family: ${TOKENS.font};
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .segbtn:hover {
          color: ${TOKENS.text};
          border-color: ${TOKENS.lineStrong};
        }
        .segbtn.on {
          color: ${TOKENS.text};
          background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 20%, transparent), color-mix(in srgb, var(--violet) 20%, transparent));
          border-color: ${TOKENS.pink};
        }
      `}</style>
    </div>
  );
};

const NumField: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <label className="nf">
    <span>{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
    <style jsx>{`
      .nf {
        display: flex;
        align-items: center;
        gap: 7px;
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid ${TOKENS.line};
        border-radius: 9px;
        padding: 0 9px;
      }
      .nf span {
        font-size: 11px;
        font-weight: 700;
        color: ${TOKENS.faint};
        flex: 0 0 auto;
      }
      .nf input {
        width: 100%;
        background: transparent;
        border: none;
        outline: none;
        color: ${TOKENS.text};
        font-family: ${TOKENS.font};
        font-size: 12.5px;
        font-weight: 600;
        padding: 8px 0;
        font-variant-numeric: tabular-nums;
      }
      .nf input::-webkit-outer-spin-button,
      .nf input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    `}</style>
  </label>
);

function layerName(el: CanvasElement): string {
  if (isText(el)) return el.text.slice(0, 28) || 'Text';
  return el.name;
}
