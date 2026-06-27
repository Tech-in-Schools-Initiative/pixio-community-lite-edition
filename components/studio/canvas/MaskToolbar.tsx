// ──────────────────────────────────────────────────────────────────────────
// Pixio · Inpaint mask toolbar
// A floating bottom-center bar shown while masking an image. Brush size, paint
// vs erase, clear, an inpaint-model picker, prompt + run, and exit.
// ──────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Brush, Eraser, Wand2, X, Trash2 } from 'lucide-react';
import { TOKENS } from '../../../lib/studio/types';
import { INPAINT_MODELS } from '../../../lib/prodia/catalog';
import { ModelPicker } from './ModelPicker';
import { Spinner } from './ui';

export const MaskToolbar: React.FC<{
  brushSize: number;
  setBrushSize: (v: number) => void;
  mode: 'paint' | 'erase';
  setMode: (m: 'paint' | 'erase') => void;
  prompt: string;
  setPrompt: (v: string) => void;
  modelId: string;
  setModelId: (id: string) => void;
  hasStrokes: boolean;
  busy: boolean;
  onClear: () => void;
  onRun: () => void;
  onExit: () => void;
}> = ({
  brushSize,
  setBrushSize,
  mode,
  setMode,
  prompt,
  setPrompt,
  modelId,
  setModelId,
  hasStrokes,
  busy,
  onClear,
  onRun,
  onExit,
}) => (
  <div className="mt" onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
    <div className="top">
      <span className="tag">
        <Brush size={13} /> Inpaint mask
      </span>
      <span className="hint">Paint over the area you want regenerated</span>
      <button type="button" className="exit" onClick={onExit} title="Exit mask mode">
        <X size={15} />
      </button>
    </div>

    <div className="row">
      <div className="seg">
        <button type="button" className={`sb${mode === 'paint' ? ' on' : ''}`} onClick={() => setMode('paint')}>
          <Brush size={14} /> Paint
        </button>
        <button type="button" className={`sb${mode === 'erase' ? ' on' : ''}`} onClick={() => setMode('erase')}>
          <Eraser size={14} /> Erase
        </button>
      </div>

      <div className="brush">
        <span className="bl">Brush</span>
        <input
          type="range"
          min={4}
          max={160}
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
        />
        <span className="bv">{brushSize}</span>
      </div>

      <button type="button" className="clear" onClick={onClear} disabled={!hasStrokes}>
        <Trash2 size={14} /> Clear
      </button>
    </div>

    <div className="row2">
      <input
        className="prompt"
        value={prompt}
        placeholder="What should fill the masked area? e.g. “a field of wildflowers”"
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && hasStrokes && prompt.trim() && !busy) {
            e.preventDefault();
            onRun();
          }
        }}
      />
      <div className="picker">
        <ModelPicker models={INPAINT_MODELS} value={modelId} onChange={setModelId} compact />
      </div>
      <button type="button" className="run" disabled={busy || !hasStrokes || !prompt.trim()} onClick={onRun}>
        {busy ? <Spinner size={14} color="#fff" /> : <Wand2 size={15} />}
        {busy ? 'Inpainting…' : 'Inpaint'}
      </button>
    </div>

    <style jsx>{`
      .mt {
        position: absolute;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        z-index: 50;
        width: min(720px, calc(100% - 48px));
        background: ${TOKENS.panel};
        border: 1px solid ${TOKENS.lineStrong};
        border-radius: ${TOKENS.radius}px;
        box-shadow: ${TOKENS.shadow};
        padding: 13px 15px;
        backdrop-filter: blur(20px);
        animation: rise 0.18s ease-out;
      }
      @keyframes rise {
        from {
          opacity: 0;
          transform: translate(-50%, 10px);
        }
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 11px;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 800;
        color: ${TOKENS.text};
      }
      :global(.mt .tag svg) {
        color: ${TOKENS.pink};
      }
      .hint {
        flex: 1 1 auto;
        font-size: 11.5px;
        color: ${TOKENS.faint};
      }
      .exit {
        display: inline-flex;
        background: transparent;
        border: none;
        color: ${TOKENS.faint};
        cursor: pointer;
      }
      .exit:hover {
        color: ${TOKENS.text};
      }
      .row {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 11px;
        flex-wrap: wrap;
      }
      .seg {
        display: flex;
        gap: 4px;
        background: rgba(0, 0, 0, 0.28);
        border-radius: 10px;
        padding: 3px;
      }
      .sb {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 13px;
        border-radius: 8px;
        border: none;
        background: transparent;
        color: ${TOKENS.muted};
        font-family: ${TOKENS.font};
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .sb:hover {
        color: ${TOKENS.text};
      }
      .sb.on {
        background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 24%, transparent), color-mix(in srgb, var(--violet) 24%, transparent));
        color: ${TOKENS.text};
      }
      .brush {
        display: flex;
        align-items: center;
        gap: 9px;
        flex: 1 1 auto;
        min-width: 160px;
      }
      .bl {
        font-size: 12px;
        color: ${TOKENS.muted};
        font-weight: 600;
      }
      .brush input {
        flex: 1 1 auto;
        appearance: none;
        -webkit-appearance: none;
        height: 4px;
        border-radius: 4px;
        background: linear-gradient(
          90deg,
          ${TOKENS.pink},
          ${TOKENS.violet} ${((brushSize - 4) / 156) * 100}%,
          rgba(255, 255, 255, 0.1) ${((brushSize - 4) / 156) * 100}%
        );
        outline: none;
        cursor: pointer;
      }
      .brush input::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid ${TOKENS.pink};
        cursor: pointer;
      }
      .brush input::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid ${TOKENS.pink};
        cursor: pointer;
      }
      .bv {
        font-size: 12px;
        font-weight: 700;
        color: ${TOKENS.text};
        width: 28px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .clear {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 9px;
        border: 1px solid ${TOKENS.line};
        background: rgba(255, 255, 255, 0.02);
        color: ${TOKENS.muted};
        font-family: ${TOKENS.font};
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .clear:hover:not(:disabled) {
        color: ${TOKENS.danger};
        border-color: ${TOKENS.danger};
      }
      .clear:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .row2 {
        display: flex;
        align-items: stretch;
        gap: 9px;
      }
      .prompt {
        flex: 1 1 auto;
        box-sizing: border-box;
        font-family: ${TOKENS.font};
        font-size: 12.5px;
        color: ${TOKENS.text};
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid ${TOKENS.line};
        border-radius: ${TOKENS.radiusSm}px;
        padding: 0 13px;
        outline: none;
      }
      .prompt::placeholder {
        color: ${TOKENS.faint};
      }
      .prompt:focus {
        border-color: ${TOKENS.pink};
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--pink) 16%, transparent);
      }
      .picker {
        width: 178px;
        flex: 0 0 auto;
      }
      .run {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        flex: 0 0 auto;
        padding: 0 17px;
        border-radius: ${TOKENS.radiusSm}px;
        border: 1px solid transparent;
        background: ${TOKENS.accent};
        color: #fff;
        font-family: ${TOKENS.font};
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 8px 20px color-mix(in srgb, var(--pink) 30%, transparent);
        transition: filter 0.15s ease, transform 0.12s ease;
      }
      .run:hover:not(:disabled) {
        filter: brightness(1.07);
        transform: translateY(-1px);
      }
      .run:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `}</style>
  </div>
);
