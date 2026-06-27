// ──────────────────────────────────────────────────────────────────────────
// Pixio Studio · QueueDock
// A fixed bottom-right dock that visualizes in-flight generations: live elapsed
// timers, a model/family identity per card, and a celebratory chime + flash the
// moment a job finishes. Self-contained — reads everything from the store.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Check, Loader } from 'lucide-react';
import { useStudio } from '../../lib/studio/store';
import { familyColor } from '../../lib/prodia/catalog';
import type { ModelFamily } from '../../lib/prodia/types';
import type { StudioAsset } from '../../lib/studio/types';

const truncate = (s: string, n = 64): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Detect prefers-reduced-motion safely on the client. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    // addEventListener is widely supported; fall back to addListener for older engines.
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else if (mq.removeListener) mq.removeListener(apply);
    };
  }, []);
  return reduced;
}

/** Two quick, gentle sine notes (~E6 / A6) with a soft gain envelope. */
function playChime(): void {
  if (typeof window === 'undefined') return;
  const Ctx =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const notes = [1318.51, 1760.0]; // E6, A6
    const noteDur = 0.12;
    notes.forEach((freq, i) => {
      const t0 = ctx.currentTime + i * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + noteDur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + noteDur + 0.02);
    });
    // Close the context shortly after the last note finishes.
    window.setTimeout(() => {
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
    }, 600);
  } catch {
    /* ignore — audio is a nicety, never block the UI */
  }
}

interface DoneToast {
  id: string;
  label: string;
  color: string;
}

export default function QueueDock() {
  const assets = useStudio((s) => s.assets);
  const sound = useStudio((s) => s.sound);
  const reduced = usePrefersReducedMotion();

  const [now, setNow] = useState<number>(() => Date.now());
  const [toasts, setToasts] = useState<DoneToast[]>([]);

  // Track which ids were running on the previous render so we can detect completions.
  const prevRunningRef = useRef<Set<string>>(new Set());
  // Keep a live snapshot of assets for the completion effect without re-subscribing it.
  const assetsRef = useRef<StudioAsset[]>(assets);
  assetsRef.current = assets;
  // Timers we own, so we can clear them on unmount.
  const toastTimers = useRef<number[]>([]);

  const running = assets.filter((a) => a.status === 'running');

  // ── Live elapsed timer: tick once a second only while something is running ──
  useEffect(() => {
    if (running.length === 0) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running.length]);

  // ── Completion detection: chime + flash toast when a job leaves "running" ──
  useEffect(() => {
    const prev = prevRunningRef.current;
    const nextRunning = new Set<string>();
    let anyCompleted = false;

    for (const a of assets) {
      if (a.status === 'running') nextRunning.add(a.id);
    }

    const fresh: DoneToast[] = [];
    prev.forEach((id) => {
      if (!nextRunning.has(id)) {
        const asset = assets.find((a) => a.id === id);
        if (asset && asset.status === 'done') {
          anyCompleted = true;
          fresh.push({
            id: `${id}-${Date.now()}`,
            label: asset.modelLabel,
            color: familyColor(asset.family as ModelFamily),
          });
        }
      }
    });

    prevRunningRef.current = nextRunning;

    if (fresh.length) {
      setToasts((t) => [...fresh, ...t].slice(0, 4));
      fresh.forEach((toast) => {
        const timer = window.setTimeout(() => {
          setToasts((t) => t.filter((x) => x.id !== toast.id));
        }, 2000);
        toastTimers.current.push(timer);
      });
    }

    if (anyCompleted && sound) playChime();
    // We intentionally depend on `assets` (and read `sound` live); the ref keeps
    // prior running ids across renders.
  }, [assets, sound]);

  // Clear any pending toast timers on unmount.
  useEffect(() => {
    return () => {
      toastTimers.current.forEach((id) => window.clearTimeout(id));
      toastTimers.current = [];
    };
  }, []);

  if (running.length === 0 && toasts.length === 0) return null;

  const pulse: React.CSSProperties = reduced
    ? {}
    : { animation: 'breathe 2.4s ease-in-out infinite' };

  return (
    <div
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-end',
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 36px)',
      }}
      aria-live="polite"
    >
      {/* ── Completion toasts ─────────────────────────────────────────────── */}
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'auto',
            width: 260,
            maxWidth: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 'var(--radius)',
            background: 'var(--panel)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--mint)',
            boxShadow: 'var(--shadow)',
            ...(reduced ? {} : { animation: 'fade-up 0.22s var(--ease)' }),
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--mint)',
              color: '#06231a',
              flexShrink: 0,
            }}
          >
            <Check size={15} strokeWidth={3} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--mint)' }}>Done</div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t.label}
            </div>
          </div>
        </div>
      ))}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      {running.length > 0 && (
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 99,
            background: 'var(--panel)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--pink)',
              boxShadow: '0 0 10px var(--pink)',
              ...pulse,
            }}
          />
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text)' }}>
            Generating {running.length}
          </span>
        </div>
      )}

      {/* ── Running cards ─────────────────────────────────────────────────── */}
      {running.map((a) => {
        const color = familyColor(a.family as ModelFamily);
        const elapsed = Math.max(0, Math.round((now - a.createdAt) / 1000));
        return (
          <div
            key={a.id}
            style={{
              pointerEvents: 'auto',
              width: 260,
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 14,
              borderRadius: 'var(--radius)',
              background: 'var(--panel)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow)',
              ...(reduced ? {} : { animation: 'fade-up 0.24s var(--ease)' }),
            }}
          >
            <span className="spinner" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.modelLabel}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--muted)',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                title={a.prompt}
              >
                {truncate(a.prompt, 90)}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--pink-soft)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <Loader size={12} aria-hidden />
                {elapsed}s
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
