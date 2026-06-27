// ──────────────────────────────────────────────────────────────────────────
// Pixio · Canvas chrome UI primitives
// Small, dependency-free building blocks (buttons, panels, sliders, selects)
// themed from TOKENS. styled-jsx is available (next/babel) so each primitive
// carries its own scoped styles. No external .css.
// ──────────────────────────────────────────────────────────────────────────

import React from 'react';
import { TOKENS } from '../../../lib/studio/types';

/* ── Icon button ─────────────────────────────────────────────────────────── */
export const IconButton: React.FC<{
  title: string;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  size?: number;
  children: React.ReactNode;
}> = ({ title, onClick, active, disabled, danger, size = 36, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={`ib${active ? ' on' : ''}${danger ? ' danger' : ''}`}
    style={{ width: size, height: size }}
  >
    {children}
    <style jsx>{`
      .ib {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: ${TOKENS.radiusSm}px;
        border: 1px solid ${TOKENS.line};
        background: rgba(255, 255, 255, 0.02);
        color: ${TOKENS.muted};
        cursor: pointer;
        transition: transform 0.12s ease, background 0.15s ease, color 0.15s ease,
          border-color 0.15s ease, box-shadow 0.15s ease;
        flex: 0 0 auto;
      }
      .ib:hover:not(:disabled) {
        color: ${TOKENS.text};
        background: rgba(255, 255, 255, 0.06);
        border-color: ${TOKENS.lineStrong};
        transform: translateY(-1px);
      }
      .ib:active:not(:disabled) {
        transform: translateY(0) scale(0.96);
      }
      .ib.on {
        color: ${TOKENS.text};
        background: linear-gradient(135deg, color-mix(in srgb, var(--pink) 22%, transparent), color-mix(in srgb, var(--violet) 22%, transparent));
        border-color: ${TOKENS.pink};
        box-shadow: 0 6px 18px color-mix(in srgb, var(--pink) 22%, transparent);
      }
      .ib.danger:hover:not(:disabled) {
        color: ${TOKENS.danger};
        border-color: ${TOKENS.danger};
        background: rgba(251, 113, 133, 0.12);
      }
      .ib:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    `}</style>
  </button>
);

/* ── Ghost / solid pill button ───────────────────────────────────────────── */
export const Button: React.FC<{
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'solid' | 'ghost' | 'subtle';
  disabled?: boolean;
  block?: boolean;
  small?: boolean;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, variant = 'subtle', disabled, block, small, title, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`btn ${variant}${block ? ' block' : ''}${small ? ' small' : ''}`}
  >
    {children}
    <style jsx>{`
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-family: ${TOKENS.font};
        font-weight: 600;
        font-size: ${small ? 12 : 13}px;
        letter-spacing: 0.01em;
        padding: ${small ? '6px 11px' : '9px 15px'};
        border-radius: ${TOKENS.radiusSm}px;
        border: 1px solid ${TOKENS.line};
        background: rgba(255, 255, 255, 0.03);
        color: ${TOKENS.text};
        cursor: pointer;
        transition: transform 0.12s ease, filter 0.15s ease, background 0.15s ease,
          border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .btn.block {
        width: 100%;
      }
      .btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      .btn:active:not(:disabled) {
        transform: translateY(0) scale(0.985);
      }
      .btn.solid {
        background: ${TOKENS.accent};
        border-color: transparent;
        color: #fff;
        box-shadow: 0 8px 22px color-mix(in srgb, var(--pink) 28%, transparent);
      }
      .btn.solid:hover:not(:disabled) {
        filter: brightness(1.06);
      }
      .btn.ghost {
        background: transparent;
        color: ${TOKENS.muted};
      }
      .btn.ghost:hover:not(:disabled) {
        color: ${TOKENS.text};
        background: rgba(255, 255, 255, 0.04);
        border-color: ${TOKENS.lineStrong};
      }
      .btn.subtle:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.07);
        border-color: ${TOKENS.lineStrong};
      }
      .btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `}</style>
  </button>
);

/* ── Section heading inside a panel ──────────────────────────────────────── */
export const PanelLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({
  children,
  right,
}) => (
  <div className="pl">
    <span>{children}</span>
    {right}
    <style jsx>{`
      .pl {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: ${TOKENS.faint};
        margin: 0 0 9px;
      }
    `}</style>
  </div>
);

/* ── Text input ──────────────────────────────────────────────────────────── */
export const TextField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  multiline?: boolean;
  rows?: number;
  autoFocus?: boolean;
}> = ({ value, onChange, placeholder, onEnter, multiline, rows = 3, autoFocus }) => {
  const handleKey = (e: React.KeyboardEvent) => {
    if (onEnter && e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onEnter();
    }
  };
  return (
    <>
      {multiline ? (
        <textarea
          className="tf"
          value={value}
          rows={rows}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
        />
      ) : (
        <input
          className="tf"
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
        />
      )}
      <style jsx>{`
        .tf {
          width: 100%;
          box-sizing: border-box;
          font-family: ${TOKENS.font};
          font-size: 13px;
          line-height: 1.5;
          color: ${TOKENS.text};
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid ${TOKENS.line};
          border-radius: ${TOKENS.radiusSm}px;
          padding: 10px 12px;
          outline: none;
          resize: vertical;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .tf::placeholder {
          color: ${TOKENS.faint};
        }
        .tf:focus {
          border-color: ${TOKENS.pink};
          background: rgba(0, 0, 0, 0.4);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--pink) 16%, transparent);
        }
      `}</style>
    </>
  );
};

/* ── Select ──────────────────────────────────────────────────────────────── */
export const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div className="sw">
    <select className="sl" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <span className="caret">▾</span>
    <style jsx>{`
      .sw {
        position: relative;
        width: 100%;
      }
      .sl {
        width: 100%;
        box-sizing: border-box;
        appearance: none;
        -webkit-appearance: none;
        font-family: ${TOKENS.font};
        font-size: 12.5px;
        font-weight: 600;
        color: ${TOKENS.text};
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid ${TOKENS.line};
        border-radius: ${TOKENS.radiusSm}px;
        padding: 9px 30px 9px 12px;
        outline: none;
        cursor: pointer;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .sl:focus {
        border-color: ${TOKENS.pink};
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--pink) 16%, transparent);
      }
      .sl option {
        background: ${TOKENS.panel};
        color: ${TOKENS.text};
      }
      .caret {
        position: absolute;
        right: 11px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: ${TOKENS.faint};
        font-size: 11px;
      }
    `}</style>
  </div>
);

/* ── Slider with label + value ───────────────────────────────────────────── */
export const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, suffix, onChange }) => (
  <div className="sld">
    <div className="row">
      <span className="lab">{label}</span>
      <span className="val">
        {Math.round(value * 100) / 100}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
    <style jsx>{`
      .sld {
        width: 100%;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 5px;
      }
      .lab {
        font-size: 12px;
        color: ${TOKENS.muted};
        font-weight: 500;
      }
      .val {
        font-size: 11.5px;
        color: ${TOKENS.text};
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      input[type='range'] {
        width: 100%;
        appearance: none;
        -webkit-appearance: none;
        height: 4px;
        border-radius: 4px;
        background: linear-gradient(
          90deg,
          ${TOKENS.pink} 0%,
          ${TOKENS.violet} ${((value - min) / (max - min)) * 100}%,
          rgba(255, 255, 255, 0.1) ${((value - min) / (max - min)) * 100}%
        );
        outline: none;
        cursor: pointer;
      }
      input[type='range']::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid ${TOKENS.pink};
        box-shadow: 0 2px 8px color-mix(in srgb, var(--pink) 40%, transparent);
        cursor: pointer;
      }
      input[type='range']::-moz-range-thumb {
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid ${TOKENS.pink};
        cursor: pointer;
      }
    `}</style>
  </div>
);

/* ── Tiny spinning loader ────────────────────────────────────────────────── */
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 16, color }) => (
  <span className="sp" style={{ width: size, height: size }}>
    <style jsx>{`
      .sp {
        display: inline-block;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.18);
        border-top-color: ${color ?? TOKENS.pink};
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </span>
);

/* ── Color swatch picker (native input, styled trigger) ──────────────────── */
export const ColorField: React.FC<{ value: string; onChange: (v: string) => void; label?: string }> = ({
  value,
  onChange,
  label,
}) => (
  <label className="cf">
    {label && <span className="cflab">{label}</span>}
    <span className="sw" style={{ background: value }}>
      <input type="color" value={normalizeHex(value)} onChange={(e) => onChange(e.target.value)} />
    </span>
    <style jsx>{`
      .cf {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        cursor: pointer;
      }
      .cflab {
        font-size: 12px;
        color: ${TOKENS.muted};
      }
      .sw {
        position: relative;
        width: 30px;
        height: 24px;
        border-radius: 7px;
        border: 1px solid ${TOKENS.lineStrong};
        overflow: hidden;
        flex: 0 0 auto;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.3);
      }
      .sw input {
        position: absolute;
        inset: -6px;
        width: 200%;
        height: 200%;
        border: none;
        padding: 0;
        cursor: pointer;
        opacity: 0;
      }
    `}</style>
  </label>
);

/** Native <input type=color> needs #rrggbb; coerce best-effort. */
export function normalizeHex(v: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return '#' + v.slice(1).split('').map((c) => c + c).join('');
  }
  return '#ffffff';
}
