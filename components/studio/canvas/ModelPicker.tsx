// ──────────────────────────────────────────────────────────────────────────
// Pixio · Canvas model picker
// A compact dropdown that lists models grouped by family, with the family color
// dot + badge. Used for both txt2img generation and the AI edit popover.
// ──────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TOKENS } from '../../../lib/studio/types';
import { familyColor } from '../../../lib/prodia/catalog';
import type { ProdiaModel } from '../../../lib/prodia/types';

export const ModelPicker: React.FC<{
  models: ProdiaModel[];
  value: string; // model id
  onChange: (id: string) => void;
  compact?: boolean;
}> = ({ models, value, onChange, compact }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.id === value) ?? models[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="mp" ref={ref}>
      <button type="button" className={`trigger${compact ? ' compact' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className="dot" style={{ background: familyColor(current?.family ?? 'FLUX') }} />
        <span className="name">{current?.label ?? 'Select model'}</span>
        {current?.badge && <span className="badge">{current.badge}</span>}
        <ChevronDown size={14} className="chev" />
      </button>

      {open && (
        <div className="menu">
          {models.map((m) => {
            const sel = m.id === value;
            return (
              <button
                type="button"
                key={m.id}
                className={`opt${sel ? ' sel' : ''}`}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                <span className="dot" style={{ background: familyColor(m.family) }} />
                <span className="ol">
                  <span className="oname">
                    {m.label}
                    {m.badge && <span className="badge sm">{m.badge}</span>}
                  </span>
                  <span className="odesc">{m.desc}</span>
                </span>
                <span className="ofam">{m.family}</span>
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .mp {
          position: relative;
          width: 100%;
        }
        .trigger {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          box-sizing: border-box;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid ${TOKENS.line};
          border-radius: ${TOKENS.radiusSm}px;
          padding: 9px 11px;
          color: ${TOKENS.text};
          font-family: ${TOKENS.font};
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .trigger.compact {
          padding: 7px 10px;
          font-size: 12px;
        }
        .trigger:hover {
          border-color: ${TOKENS.lineStrong};
        }
        .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex: 0 0 auto;
          box-shadow: 0 0 8px currentColor;
        }
        .name {
          flex: 1 1 auto;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .badge {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: ${TOKENS.text};
          background: color-mix(in srgb, var(--pink) 18%, transparent);
          border: 1px solid color-mix(in srgb, var(--pink) 40%, transparent);
          border-radius: 6px;
          padding: 2px 5px;
          flex: 0 0 auto;
        }
        .badge.sm {
          margin-left: 7px;
          font-size: 8.5px;
          padding: 1px 4px;
        }
        :global(.mp .chev) {
          color: ${TOKENS.faint};
          flex: 0 0 auto;
        }
        .menu {
          position: absolute;
          z-index: 60;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          max-height: 320px;
          overflow-y: auto;
          background: ${TOKENS.panel};
          border: 1px solid ${TOKENS.lineStrong};
          border-radius: ${TOKENS.radius}px;
          box-shadow: ${TOKENS.shadow};
          padding: 6px;
          backdrop-filter: blur(18px);
        }
        .opt {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
          background: transparent;
          border: none;
          border-radius: ${TOKENS.radiusSm}px;
          padding: 9px 10px;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s ease;
        }
        .opt:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .opt.sel {
          background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 16%, transparent), color-mix(in srgb, var(--violet) 16%, transparent));
        }
        .opt .dot {
          margin-top: 4px;
        }
        .ol {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1 1 auto;
          min-width: 0;
        }
        .oname {
          display: flex;
          align-items: center;
          font-size: 12.5px;
          font-weight: 700;
          color: ${TOKENS.text};
        }
        .odesc {
          font-size: 11px;
          color: ${TOKENS.faint};
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .ofam {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: ${TOKENS.faint};
          flex: 0 0 auto;
          margin-top: 3px;
        }
      `}</style>
    </div>
  );
};
