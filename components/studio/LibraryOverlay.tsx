import { useEffect, useMemo, useState } from 'react';
import { ImageIcon, Library, Trash2, X } from 'lucide-react';
import { familyColor } from '../../lib/prodia/catalog';
import type { ModelFamily } from '../../lib/prodia/types';
import { useStudio } from '../../lib/studio/store';
import type { StudioAsset } from '../../lib/studio/types';
import RemixBar from './RemixBar';

const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const cost = (p?: number | null) => (p || p === 0 ? `$${Number(p).toFixed(4)}` : '—');
type Filter = 'all' | 'image' | 'video';

function Media({ asset }: { asset: StudioAsset }) {
  if (asset.status === 'running') return <div className="skeleton" />;
  if (asset.status === 'error') return <span style={{ padding: 12, fontSize: 11, color: 'var(--danger)', textAlign: 'center' }}>{asset.error}</span>;
  if (asset.isVideo && asset.url) return <video src={asset.url} autoPlay loop muted playsInline />;
  if (asset.url) return <img src={asset.url} alt={asset.prompt} />;
  return <ImageIcon size={24} color="var(--faint)" />;
}

export default function LibraryOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const assets = useStudio((s) => s.assets);
  const clearAssets = useStudio((s) => s.clearAssets);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const shown = useMemo(() => assets.filter((a) => {
    if (filter === 'image') return !a.isVideo;
    if (filter === 'video') return a.isVideo;
    return true;
  }), [assets, filter]);

  if (!open) return null;
  const totalCost = assets.reduce((s, a) => s + Number(a.price ?? 0), 0);

  return (
    <div className="library-scrim" onClick={onClose}>
      <div className="library" onClick={(e) => e.stopPropagation()}>
        <header className="library-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span className="brand-mark" style={{ width: 34, height: 34 }}><Library size={17} /></span>
            <div>
              <div className="surface-title" style={{ fontSize: 19 }}><span className="brand-grad">Library</span></div>
              <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{assets.length} assets · ${totalCost.toFixed(3)} tracked</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="family-row">
              {(['all', 'image', 'video'] as Filter[]).map((f) => (
                <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Videos'}
                </button>
              ))}
            </div>
            {assets.length > 0 && (
              <button className="btn sm" onClick={() => { if (typeof window === 'undefined' || window.confirm('Clear the entire library?')) clearAssets(); }}>
                <Trash2 size={14} /> Clear
              </button>
            )}
            <button className="btn icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div>
        </header>

        <div className="library-body">
          {shown.length === 0 ? (
            <div className="empty">
              <div>
                <div className="orb"><Library size={28} /></div>
                <strong>{assets.length === 0 ? 'Your library is empty' : 'Nothing in this filter'}</strong>
                <p>Generate in Studio, Canvas, or Nodes — every output collects here and persists across reloads.</p>
              </div>
            </div>
          ) : (
            <div className="asset-grid">
              {shown.map((a) => {
                const hue = familyColor(a.family as ModelFamily);
                return (
                  <article key={a.id} className="asset-card" style={{ cursor: 'default' }}>
                    <div className="asset-media">
                      <Media asset={a} />
                      {a.status !== 'running' && <RemixBar asset={a} variant="overlay" />}
                    </div>
                    {a.status === 'done' && <span className="asset-tag" style={{ background: `color-mix(in srgb, ${hue} 82%, transparent)` }}>{a.family}</span>}
                    <div className="asset-foot">
                      <div className="t">{a.modelLabel}</div>
                      <div className="s">{a.status === 'done' ? cost(a.price) : a.status} · {short(a.prompt, 38)}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
