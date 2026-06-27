import { useEffect } from 'react';
import { Check, Moon, Palette, Sun, Volume2, VolumeX } from 'lucide-react';
import { useStudio } from '../../lib/studio/store';
import { ACCENTS } from '../../lib/studio/theme';

export default function SettingsMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useStudio((s) => s.theme);
  const setTheme = useStudio((s) => s.setTheme);
  const sound = useStudio((s) => s.sound);
  const setSound = useStudio((s) => s.setSound);
  const accent = useStudio((s) => s.accent);
  const setAccent = useStudio((s) => s.setAccent);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 95 }} />
      <div className="settings-pop" onClick={(e) => e.stopPropagation()}>
        <div className="section-head" style={{ marginBottom: 4 }}>
          <span className="section-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Palette size={13} /> Appearance
          </span>
        </div>

        <div className="segmented" style={{ marginBottom: 12 }}>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><Moon size={14} /> Dark</button>
          <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><Sun size={14} /> Light</button>
        </div>

        <label className="toggle" style={{ marginBottom: 16 }}>
          <div className={`track ${sound ? 'on' : ''}`} onClick={() => setSound(!sound)}><div className="knob" /></div>
          <span className="lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} Completion sounds
          </span>
        </label>

        <div className="section-label" style={{ marginBottom: 10 }}>Accent</div>
        <div className="accent-grid">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              className={`accent-chip ${accent === a.id ? 'active' : ''}`}
              title={a.name}
              onClick={() => setAccent(a.id)}
            >
              <span className="swatch" style={{ background: `linear-gradient(135deg, ${a.c1}, ${a.c2})` }}>
                {accent === a.id && <Check size={13} color="#fff" />}
              </span>
              <span className="aname">{a.name}</span>
            </button>
          ))}
        </div>

        <style jsx>{`
          .settings-pop {
            position: fixed; top: 62px; right: 14px; z-index: 96;
            width: 320px; max-height: calc(100vh - 80px); overflow-y: auto;
            padding: 16px; border-radius: 18px;
            background: var(--elevated); border: 1px solid var(--line-strong);
            box-shadow: 0 30px 70px rgba(0,0,0,0.5);
            backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
            animation: pop 0.16s var(--ease);
          }
          .accent-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
          .accent-chip {
            display: flex; align-items: center; gap: 9px; padding: 8px 9px;
            border-radius: 11px; border: 1px solid var(--line); background: var(--ghost);
            color: var(--muted); font-size: 12px; font-weight: 600; cursor: pointer;
            transition: all 0.15s var(--ease);
          }
          .accent-chip:hover { color: var(--text); border-color: var(--line-strong); transform: translateY(-1px); }
          .accent-chip.active { color: var(--text); border-color: var(--line-strong); background: var(--accent-soft); }
          .swatch {
            width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0;
            display: grid; place-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25);
          }
          .aname { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        `}</style>
      </div>
    </>
  );
}
