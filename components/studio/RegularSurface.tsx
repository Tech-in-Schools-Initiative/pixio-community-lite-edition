import { useState } from 'react';
import { Download, ImageIcon, Sparkles, X } from 'lucide-react';
import { familyColor } from '../../lib/prodia/catalog';
import type { ModelFamily } from '../../lib/prodia/types';
import { useStudio } from '../../lib/studio/store';
import type { StudioAsset } from '../../lib/studio/types';
import RemixBar from './RemixBar';

const short = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const cost = (p?: number | null) => (p || p === 0 ? `$${Number(p).toFixed(4)}` : '—');
const extFor = (a: StudioAsset) => (a.mimeType?.includes('svg') ? 'svg' : a.isVideo ? 'mp4' : 'png');

function Media({ asset }: { asset: StudioAsset }) {
  if (asset.status === 'running') return <div className="skeleton" />;
  if (asset.status === 'error') return <span style={{ padding: 16, fontSize: 12, color: 'var(--danger)', textAlign: 'center' }}>{asset.error}</span>;
  if (asset.isVideo && asset.url) return <video src={asset.url} autoPlay loop muted playsInline />;
  if (asset.url) return <img src={asset.url} alt={asset.prompt} />;
  return <ImageIcon size={26} color="var(--faint)" />;
}

export default function RegularSurface({ onSelect }: { onSelect: (id: string) => void }) {
  const assets = useStudio((s) => s.assets);
  const patchParams = useStudio((s) => s.patchParams);
  const [box, setBox] = useState<number | null>(null);

  const done = assets.filter((a) => a.status === 'done');
  const running = assets.filter((a) => a.status === 'running').length;
  const totalCost = assets.reduce((sum, a) => sum + Number(a.price ?? 0), 0);

  const examples = [
    'Glowing jellyfish in a neon ocean, cinematic',
    'Cyberpunk city at night in the rain, 4K',
    'Fox samurai in ancient Japan, oil painting',
  ];

  return (
    <div className="stage-scroll">
      <div className="surface-hero">
        <div>
          <h1 className="surface-title">A command desk for raw model power.</h1>
          <p className="surface-copy">
            Fire any Prodia image or video models in parallel, compare outputs side by side, then promote
            the best ideas into the AI <strong>Canvas</strong> or wire them through the <strong>Nodes</strong> graph.
          </p>
        </div>
        <div className="stat-strip">
          <div className="stat"><div className="v">{assets.length}</div><div className="l">outputs</div></div>
          <div className="stat"><div className="v">{running}</div><div className="l">running</div></div>
          <div className="stat"><div className="v">${totalCost.toFixed(3)}</div><div className="l">cost</div></div>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="empty">
          <div>
            <div className="welcome-rings">
              <span className="ring" /><span className="ring" /><span className="ring" />
              <div className="core"><Sparkles size={26} /></div>
            </div>
            <div className="welcome-title"><span className="brand-grad">Your canvas awaits</span></div>
            <p>Pick models, write a prompt, then press <kbd>⌘ Enter</kbd> to generate.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, maxWidth: 420 }}>
              {examples.map((ex) => (
                <button key={ex} className="chip" onClick={() => patchParams({ prompt: ex })}>{ex}</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map((a) => {
            const hue = familyColor(a.family as ModelFamily);
            return (
              <article key={a.id} className="asset-card"
                onClick={() => { onSelect(a.id); if (a.status === 'done') setBox(done.findIndex((d) => d.id === a.id)); }}>
                <div className="asset-media">
                  <Media asset={a} />
                  {a.status !== 'running' && <RemixBar asset={a} variant="overlay" />}
                </div>
                {a.status === 'done' && <span className="asset-tag" style={{ background: `color-mix(in srgb, ${hue} 82%, transparent)` }}>{a.family}</span>}
                <div className="asset-foot">
                  <div className="t">{a.modelLabel}</div>
                  <div className="s">{a.status === 'done' ? cost(a.price) : a.status} · {short(a.prompt, 42)}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {box !== null && done[box] && (
        <div className="lightbox" onClick={() => setBox(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {done[box].isVideo
              ? <video src={done[box].url} autoPlay loop controls />
              : <img src={done[box].url} alt={done[box].prompt} />}
            <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
              <a className="btn icon" href={done[box].url} download={`pixio.${extFor(done[box])}`} onClick={(e) => e.stopPropagation()}><Download size={15} /></a>
              <button className="btn icon" onClick={() => setBox(null)}><X size={16} /></button>
            </div>
            {done.length > 1 && (
              <>
                <button className="lightbox-nav" style={{ left: -58 }} onClick={(e) => { e.stopPropagation(); setBox((box - 1 + done.length) % done.length); }}>‹</button>
                <button className="lightbox-nav" style={{ right: -58 }} onClick={(e) => { e.stopPropagation(); setBox((box + 1) % done.length); }}>›</button>
              </>
            )}
            <div className="lightbox-caption">
              <span style={{ fontWeight: 800, color: 'var(--pink-soft)' }}>{done[box].modelLabel}</span>
              <span style={{ color: 'var(--faint)', margin: '0 10px' }}>·</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{short(done[box].prompt, 90)}</span>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 5 }}>{box + 1} / {done.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
