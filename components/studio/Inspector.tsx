import { Copy, Download, Layers3, SlidersHorizontal } from 'lucide-react';
import { familyColor } from '../../lib/prodia/catalog';
import type { ModelFamily } from '../../lib/prodia/types';
import { useStudio } from '../../lib/studio/store';
import type { StudioAsset } from '../../lib/studio/types';
import RemixBar from './RemixBar';

const short = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const cost = (p?: number | null) => (p || p === 0 ? `$${Number(p).toFixed(4)}` : '—');
const labelsOf = (asset: StudioAsset): [string, number][] => {
  const raw = (asset.metadata?.labels ?? asset.metadata) as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw)
    .filter(([, value]) => typeof value === 'number')
    .map(([label, value]) => [label, Number(value)] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
};

function Preview({ asset }: { asset: StudioAsset }) {
  if (asset.isVideo && asset.url) return <video src={asset.url} autoPlay loop muted playsInline />;
  if (asset.url) return <img src={asset.url} alt={asset.prompt} />;
  return <div className="spinner" />;
}

const download = (a: StudioAsset) => {
  if (!a.url) return;
  const ext = a.mimeType?.includes('svg') ? 'svg' : a.isVideo ? 'mp4' : 'png';
  const el = document.createElement('a');
  el.href = a.url;
  el.download = `pixio-${a.modelLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`;
  el.click();
};

export default function Inspector({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const assets = useStudio((s) => s.assets);
  const selected = assets.find((a) => a.id === selectedId) ?? assets.find((a) => a.status === 'done') ?? assets[0];
  const labels = selected ? labelsOf(selected) : [];

  return (
    <div className="rail-scroll">
      <section className="section">
        <div className="section-head"><span className="section-label">Inspector</span><SlidersHorizontal size={14} color="var(--faint)" /></div>
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="inspector-media"><Preview asset={selected} /></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 750 }}>{selected.modelLabel}</div>
              <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 3 }}>{selected.modelType}</div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{short(selected.prompt, 160)}</div>
            <div className="meta-row">
              <span className="badge">{selected.status}</span>
              <span className="badge">{selected.family}</span>
              <span className="badge" style={{ color: 'var(--pink-soft)' }}>{cost(selected.price)}</span>
            </div>
            {labels.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div className="section-label">Labels</div>
                {labels.map(([label, score]) => (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: 8, alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--ghost)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(score * 100)}%`, height: '100%', background: 'var(--accent)' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--pink-soft)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(score * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn sm" onClick={() => navigator.clipboard?.writeText(selected.prompt)}><Copy size={14} /> Copy prompt</button>
            {selected.status === 'done' && <RemixBar asset={selected} variant="inline" />}
          </div>
        ) : (
          <div className="empty" style={{ minHeight: 200 }}>
            <div><strong>Nothing selected</strong><p>Generate or pick an output to inspect it.</p></div>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head"><span className="section-label">Recent</span><span className="section-kicker">{assets.length}</span></div>
        <div className="gallery-list">
          {assets.slice(0, 10).map((a) => {
            const hue = familyColor(a.family as ModelFamily);
            return (
              <button key={a.id} className="gallery-item" onClick={() => onSelect(a.id)}>
                {a.url && !a.isVideo
                  ? <img className="gallery-thumb" src={a.url} alt="" />
                  : <span className="gallery-thumb" style={{ display: 'grid', placeItems: 'center' }}><Layers3 size={15} color={hue} /></span>}
                <div className="info">
                  <div className="t">{a.modelLabel}</div>
                  <div className="s">{a.status} · {cost(a.price)}</div>
                </div>
              </button>
            );
          })}
          {assets.length === 0 && <div className="section-kicker">No outputs yet.</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-label">Prodia · v2</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <a className="variant" href="https://docs.prodia.com/reference/inference/" target="_blank" rel="noreferrer">
            <strong>Inference API</strong><span>POST /v2/job · Bearer auth · Accept negotiation · multipart inputs</span>
          </a>
          <a className="variant" href="https://docs.prodia.com/guides/tracking-costs/" target="_blank" rel="noreferrer">
            <strong>Cost tracking</strong><span>price=true returns exact per-job dollar cost</span>
          </a>
        </div>
      </section>
    </div>
  );
}
