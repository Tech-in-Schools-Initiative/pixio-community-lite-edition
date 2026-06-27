// ──────────────────────────────────────────────────────────────────────────
// Pixio · Generate flyout (txt2img)
// A left-rail popover: prompt + model picker + go. Result is dropped on the
// board by the parent. Defaults to a fast FLUX Schnell model.
// ──────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { TOKENS } from '../../../lib/studio/types';
import { TXT2IMG_MODELS } from '../../../lib/prodia/catalog';
import { ModelPicker } from './ModelPicker';
import { Button, Spinner } from './ui';

const FAST_DEFAULT =
  TXT2IMG_MODELS.find((m) => m.id === 'inference-flux-fast-schnell-txt2img-v2')?.id ??
  TXT2IMG_MODELS.find((m) => m.badge === 'Fast')?.id ??
  TXT2IMG_MODELS[0]?.id ??
  '';

export const GeneratePanel: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onGenerate: (modelId: string, prompt: string) => void;
}> = ({ prompt, setPrompt, busy, onClose, onGenerate }) => {
  const [modelId, setModelId] = useState(FAST_DEFAULT);

  const go = () => {
    if (prompt.trim() && !busy) onGenerate(modelId, prompt.trim());
  };

  return (
    <div className="gp" onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="head">
        <span className="title">
          <Sparkles size={15} /> Generate image
        </span>
        <button type="button" className="x" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </div>

      <textarea
        className="prompt"
        value={prompt}
        rows={4}
        autoFocus
        placeholder="A serene accent-lit mountain lake at dawn, volumetric mist, cinematic..."
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            go();
          }
        }}
      />

      <div className="mp">
        <ModelPicker models={TXT2IMG_MODELS} value={modelId} onChange={setModelId} />
      </div>

      <Button variant="solid" block onClick={go} disabled={busy || !prompt.trim()}>
        {busy ? <Spinner size={15} color="#fff" /> : <Sparkles size={15} />}
        {busy ? 'Generating…' : 'Generate'}
      </Button>
      <p className="hint">⌘/Ctrl + Enter to generate · the result lands on your board</p>

      <style jsx>{`
        .gp {
          width: 320px;
          background: ${TOKENS.panel};
          border: 1px solid ${TOKENS.lineStrong};
          border-radius: ${TOKENS.radius}px;
          box-shadow: ${TOKENS.shadow};
          padding: 14px;
          backdrop-filter: blur(20px);
          animation: fly 0.16s ease-out;
        }
        @keyframes fly {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 11px;
        }
        .title {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 800;
          color: ${TOKENS.text};
        }
        :global(.gp .title svg) {
          color: ${TOKENS.pink};
        }
        .x {
          display: inline-flex;
          background: transparent;
          border: none;
          color: ${TOKENS.faint};
          cursor: pointer;
          padding: 2px;
        }
        .x:hover {
          color: ${TOKENS.text};
        }
        .prompt {
          width: 100%;
          box-sizing: border-box;
          font-family: ${TOKENS.font};
          font-size: 13px;
          line-height: 1.5;
          color: ${TOKENS.text};
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid ${TOKENS.line};
          border-radius: ${TOKENS.radiusSm}px;
          padding: 11px 12px;
          outline: none;
          resize: vertical;
          margin-bottom: 10px;
        }
        .prompt::placeholder {
          color: ${TOKENS.faint};
        }
        .prompt:focus {
          border-color: ${TOKENS.pink};
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--pink) 16%, transparent);
        }
        .mp {
          margin-bottom: 12px;
        }
        .hint {
          font-size: 10.5px;
          color: ${TOKENS.faint};
          text-align: center;
          margin: 9px 0 0;
        }
      `}</style>
    </div>
  );
};
