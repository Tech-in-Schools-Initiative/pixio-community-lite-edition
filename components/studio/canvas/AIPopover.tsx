// ──────────────────────────────────────────────────────────────────────────
// Pixio · Floating AI edit popover
// Appears anchored above a selected IMAGE element. Hosts the flagship AI flows:
// instruction edit, remove-bg, upscale, variation, describe→prompt, and the
// entry point for mask-inpaint mode. The heavy lifting (runJob) lives in the
// parent via the `actions` prop so this stays presentational + local state.
// ──────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Eraser,
  Maximize2,
  CopyPlus,
  ScanEye,
  Brush,
  ReplaceAll,
  Plus,
  Scissors,
  UserCheck,
  FileCode2,
} from 'lucide-react';
import { TOKENS } from '../../../lib/studio/types';
import { editModels } from '../../../lib/prodia/catalog';
import { ModelPicker } from './ModelPicker';
import { Spinner } from './ui';

export type AIActionKind =
  | 'edit-replace'
  | 'edit-new'
  | 'removebg'
  | 'upscale'
  | 'variation'
  | 'describe'
  | 'mask'
  | 'segment'
  | 'classify'
  | 'facerestore'
  | 'vectorize';

export interface AIActionState {
  busy: boolean;
  label: string;
}

const EDIT_MODELS = editModels();
const DEFAULT_EDIT_MODEL =
  EDIT_MODELS.find((m) => m.id === 'inference-flux-fast-dev-kontext-img2img-v1')?.id ??
  EDIT_MODELS.find((m) => m.family === 'FLUX Kontext')?.id ??
  EDIT_MODELS[0]?.id ??
  '';

export const AIPopover: React.FC<{
  screen: { x: number; y: number }; // anchor in container px (top-center of element)
  containerWidth: number;
  state: AIActionState;
  onAction: (kind: AIActionKind, payload: { instruction: string; modelId: string }) => void;
}> = ({ screen, containerWidth, state, onAction }) => {
  const [instruction, setInstruction] = useState('');
  const [modelId, setModelId] = useState(DEFAULT_EDIT_MODEL);
  const [expanded, setExpanded] = useState(true);

  // keep the popover on-screen horizontally
  const W = 348;
  const half = W / 2;
  const left = Math.max(half + 8, Math.min(containerWidth - half - 8, screen.x));
  const top = Math.max(12, screen.y);

  const run = (kind: AIActionKind) => onAction(kind, { instruction: instruction.trim(), modelId });

  return (
    <div
      className="pop"
      style={{ left, top, width: W }}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="head">
        <span className="title">
          <Sparkles size={14} /> AI Edit
        </span>
        <button type="button" className="collapse" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <>
          <div className="instr">
            <textarea
              value={instruction}
              placeholder='Describe the change — e.g. "make it a snowy night, neon signs"'
              rows={2}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (instruction.trim() && !state.busy) run('edit-replace');
                }
              }}
            />
          </div>

          <div className="modelrow">
            <ModelPicker models={EDIT_MODELS} value={modelId} onChange={setModelId} compact />
          </div>

          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={state.busy || !instruction.trim()}
              onClick={() => run('edit-replace')}
              title="Apply the edit, replacing this image"
            >
              {state.busy && state.label === 'Editing' ? <Spinner size={14} color="#fff" /> : <Wand2 size={15} />}
              Apply edit
            </button>
            <button
              type="button"
              className="secondary"
              disabled={state.busy || !instruction.trim()}
              onClick={() => run('edit-new')}
              title="Apply the edit as a new image beside this one"
            >
              <Plus size={14} /> As new
            </button>
          </div>

          <div className="grid">
            <Quick icon={<Brush size={15} />} label="Mask edit" busy={false} onClick={() => run('mask')} />
            <Quick
              icon={<Eraser size={15} />}
              label="Remove BG"
              busy={state.busy && state.label === 'Removing BG'}
              onClick={() => run('removebg')}
              disabled={state.busy}
            />
            <Quick
              icon={<Maximize2 size={15} />}
              label="Upscale"
              busy={state.busy && state.label === 'Upscaling'}
              onClick={() => run('upscale')}
              disabled={state.busy}
            />
            <Quick
              icon={<CopyPlus size={15} />}
              label="Variation"
              busy={state.busy && state.label === 'Varying'}
              onClick={() => run('variation')}
              disabled={state.busy}
            />
            <Quick
              icon={<ScanEye size={15} />}
              label="Describe"
              busy={state.busy && state.label === 'Describing'}
              onClick={() => run('describe')}
              disabled={state.busy}
            />
            <Quick
              icon={<Scissors size={15} />}
              label="Segment"
              busy={state.busy && state.label === 'Segmenting'}
              onClick={() => run('segment')}
              disabled={state.busy}
            />
            <Quick
              icon={<ScanEye size={15} />}
              label="Labels"
              busy={state.busy && state.label === 'Classifying'}
              onClick={() => run('classify')}
              disabled={state.busy}
            />
            <Quick
              icon={<UserCheck size={15} />}
              label="Restore"
              busy={state.busy && state.label === 'Restoring'}
              onClick={() => run('facerestore')}
              disabled={state.busy}
            />
            <Quick
              icon={<FileCode2 size={15} />}
              label="Vector"
              busy={state.busy && state.label === 'Vectorizing'}
              onClick={() => run('vectorize')}
              disabled={state.busy}
            />
            <Quick
              icon={<ReplaceAll size={15} />}
              label="Restyle"
              busy={state.busy && state.label === 'Editing'}
              onClick={() => run('edit-replace')}
              disabled={state.busy || !instruction.trim()}
            />
          </div>
        </>
      )}

      <span className="beak" />

      <style jsx>{`
        .pop {
          position: absolute;
          transform: translate(-50%, calc(-100% - 16px));
          z-index: 55;
          background: ${TOKENS.panel};
          border: 1px solid ${TOKENS.lineStrong};
          border-radius: ${TOKENS.radius}px;
          box-shadow: ${TOKENS.shadow};
          padding: 12px;
          backdrop-filter: blur(20px);
          animation: pop 0.16s ease-out;
        }
        @keyframes pop {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-100% - 8px)) scale(0.97);
          }
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .title {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: ${TOKENS.text};
        }
        :global(.pop .title svg) {
          color: ${TOKENS.pink};
        }
        .collapse {
          background: transparent;
          border: none;
          color: ${TOKENS.faint};
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .collapse:hover {
          color: ${TOKENS.text};
        }
        .instr textarea {
          width: 100%;
          box-sizing: border-box;
          font-family: ${TOKENS.font};
          font-size: 12.5px;
          line-height: 1.45;
          color: ${TOKENS.text};
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid ${TOKENS.line};
          border-radius: ${TOKENS.radiusSm}px;
          padding: 9px 11px;
          outline: none;
          resize: none;
        }
        .instr textarea::placeholder {
          color: ${TOKENS.faint};
        }
        .instr textarea:focus {
          border-color: ${TOKENS.pink};
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--pink) 16%, transparent);
        }
        .modelrow {
          margin: 8px 0;
        }
        .actions {
          display: flex;
          gap: 7px;
          margin-bottom: 9px;
        }
        .primary,
        .secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: ${TOKENS.font};
          font-weight: 700;
          font-size: 12.5px;
          border-radius: ${TOKENS.radiusSm}px;
          cursor: pointer;
          transition: filter 0.15s ease, transform 0.12s ease, background 0.15s ease;
          padding: 9px 12px;
        }
        .primary {
          flex: 1 1 auto;
          background: ${TOKENS.accent};
          border: 1px solid transparent;
          color: #fff;
          box-shadow: 0 8px 20px color-mix(in srgb, var(--pink) 30%, transparent);
        }
        .primary:hover:not(:disabled) {
          filter: brightness(1.07);
          transform: translateY(-1px);
        }
        .secondary {
          flex: 0 0 auto;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid ${TOKENS.line};
          color: ${TOKENS.text};
        }
        .secondary:hover:not(:disabled) {
          border-color: ${TOKENS.lineStrong};
          background: rgba(255, 255, 255, 0.08);
        }
        .primary:disabled,
        .secondary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }
        .beak {
          position: absolute;
          left: 50%;
          bottom: -7px;
          width: 14px;
          height: 14px;
          transform: translateX(-50%) rotate(45deg);
          background: ${TOKENS.panel};
          border-right: 1px solid ${TOKENS.lineStrong};
          border-bottom: 1px solid ${TOKENS.lineStrong};
        }
      `}</style>
    </div>
  );
};

const Quick: React.FC<{
  icon: React.ReactNode;
  label: string;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon, label, busy, disabled, onClick }) => (
  <button type="button" className="q" disabled={disabled} onClick={onClick}>
    {busy ? <Spinner size={14} /> : icon}
    <span>{label}</span>
    <style jsx>{`
      .q {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 10px 4px;
        border-radius: ${TOKENS.radiusSm}px;
        border: 1px solid ${TOKENS.line};
        background: rgba(255, 255, 255, 0.02);
        color: ${TOKENS.muted};
        font-family: ${TOKENS.font};
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.12s ease, color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
      }
      .q :global(svg) {
        color: ${TOKENS.pinkSoft};
      }
      .q:hover:not(:disabled) {
        color: ${TOKENS.text};
        border-color: ${TOKENS.lineStrong};
        background: rgba(255, 255, 255, 0.06);
        transform: translateY(-1px);
      }
      .q:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    `}</style>
  </button>
);
