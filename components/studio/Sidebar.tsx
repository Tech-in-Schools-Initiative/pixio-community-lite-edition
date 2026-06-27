import { useMemo, useState } from 'react';
import {
  Check, Copy, Film, ImageIcon, RefreshCcw, Search, Settings2, Sparkles, Wand2,
} from 'lucide-react';
import {
  ASPECT_RATIOS, FAMILY_COLORS, RESOLUTIONS, SDXL_STYLES, STUDIO_IMAGE_MODELS, STUDIO_VIDEO_MODELS, familyColor,
} from '../../lib/prodia/catalog';
import type { ModelFamily, ProdiaModel } from '../../lib/prodia/types';
import { assistPrompt, type PromptVariant } from '../../lib/prodia/client';
import { useStudio } from '../../lib/studio/store';

export default function Sidebar({ onGenerate }: { onGenerate: () => void }) {
  const { params, patchParams, medium, setMedium, selectedTypes, toggleType, setSelectedTypes, trackCost, setTrackCost } = useStudio();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<ModelFamily | 'All'>('All');
  const [variants, setVariants] = useState<PromptVariant[]>([]);
  const [busy, setBusy] = useState(false);

  const models = medium === 'image' ? STUDIO_IMAGE_MODELS : STUDIO_VIDEO_MODELS;
  const families = useMemo(() => Array.from(new Set(models.map((m) => m.family))), [models]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      if (family !== 'All' && m.family !== family) return false;
      if (!q) return true;
      return `${m.label} ${m.family} ${m.type} ${m.desc}`.toLowerCase().includes(q);
    });
  }, [models, family, query]);

  const grouped = useMemo(() => {
    const map = new Map<ModelFamily, ProdiaModel[]>();
    visible.forEach((m) => { const arr = map.get(m.family) ?? []; arr.push(m); map.set(m.family, arr); });
    return Array.from(map.entries());
  }, [visible]);

  const remix = async () => {
    setBusy(true);
    try { setVariants(await assistPrompt(params.prompt, medium)); }
    finally { setBusy(false); }
  };

  const showSdxl = medium === 'image' && selectedTypes.some((t) => t.includes('sdxl'));
  const showVeoAudio = medium === 'video' && selectedTypes.some((t) => t.includes('veo') && t.includes('v2'));

  return (
    <>
      {/* Prompt */}
      <section className="section">
        <div className="section-head">
          <span className="section-label">{medium === 'image' ? 'Describe your image' : 'Describe your video'}</span>
          <span className="section-kicker">{params.prompt.length}</span>
        </div>
        <textarea
          className="input"
          rows={5}
          value={params.prompt}
          onChange={(e) => patchParams({ prompt: e.target.value })}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && onGenerate()}
          placeholder="A glowing jellyfish drifting through a neon ocean at night, cinematic lighting…"
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn sm" onClick={remix} disabled={busy}><Wand2 size={14} /> {busy ? 'Thinking…' : 'AI remix'}</button>
          <button className="btn sm ghost" onClick={() => navigator.clipboard?.writeText(params.prompt)}><Copy size={14} /> Copy</button>
          <button className="btn sm ghost" onClick={() => patchParams({ prompt: '' })}><RefreshCcw size={14} /> Clear</button>
        </div>
        {variants.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {variants.map((v) => (
              <button key={v.title} className="variant" onClick={() => patchParams({ prompt: v.prompt })}>
                <strong>{v.title}</strong><span>{v.prompt}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Medium */}
      <section className="section">
        <div className="section-label">Medium</div>
        <div className="segmented">
          <button className={medium === 'image' ? 'active' : ''} onClick={() => setMedium('image')}><ImageIcon size={14} /> Images</button>
          <button className={medium === 'video' ? 'active' : ''} onClick={() => setMedium('video')}><Film size={14} /> Videos</button>
        </div>
      </section>

      {/* Controls */}
      <section className="section">
        <div className="section-head"><span className="section-label">Controls</span><Settings2 size={14} color="var(--faint)" /></div>
        <div className="field">
          <label>Negative prompt</label>
          <input className="input" value={params.negativePrompt} onChange={(e) => patchParams({ negativePrompt: e.target.value })} placeholder="blurry, low quality, watermark" />
        </div>

        {medium === 'image' && (
          <>
            <div className="field">
              <label>Output format</label>
              <select className="input" value={params.outputFormat} onChange={(e) => patchParams({ outputFormat: e.target.value as any })}>
                <option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option>
              </select>
            </div>
            {showSdxl && (
              <div className="field">
                <label>SDXL style</label>
                <select className="input" value={params.style} onChange={(e) => patchParams({ style: e.target.value })}>
                  <option value="">None</option>
                  {SDXL_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label>Steps</label>
              <div className="slider-row">
                <input type="range" min={1} max={50} value={params.steps} onChange={(e) => patchParams({ steps: +e.target.value })} />
                <span className="val">{params.steps}</span>
              </div>
            </div>
            <div className="field">
              <label>Guidance</label>
              <div className="slider-row">
                <input type="range" min={1} max={20} step={0.5} value={params.guidance} onChange={(e) => patchParams({ guidance: +e.target.value })} />
                <span className="val">{params.guidance}</span>
              </div>
            </div>
            <div className="field">
              <label>Seed <span style={{ color: 'var(--faint)' }}>(-1 random)</span></label>
              <input className="input" type="number" value={params.seed} onChange={(e) => patchParams({ seed: +e.target.value })} />
            </div>
          </>
        )}

        {medium === 'video' && (
          <>
            <div className="field">
              <label>Resolution</label>
              <select className="input" value={params.resolution} onChange={(e) => patchParams({ resolution: e.target.value })}>
                {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Aspect ratio</label>
              <select className="input" value={params.aspectRatio} onChange={(e) => patchParams({ aspectRatio: e.target.value })}>
                {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Duration</label>
              <div className="slider-row">
                <input type="range" min={4} max={8} step={2} value={params.duration} onChange={(e) => patchParams({ duration: +e.target.value })} />
                <span className="val">{params.duration}s</span>
              </div>
            </div>
            {showVeoAudio && (
              <label className="toggle">
                <div className={`track ${params.generateAudio ? 'on' : ''}`} onClick={() => patchParams({ generateAudio: !params.generateAudio })}><div className="knob" /></div>
                <span className="lbl">Generate audio (Veo v2)</span>
              </label>
            )}
          </>
        )}

        <label className="toggle">
          <div className={`track ${trackCost ? 'on' : ''}`} onClick={() => setTrackCost(!trackCost)}><div className="knob" /></div>
          <span className="lbl">Track exact Prodia cost</span>
        </label>
      </section>

      {/* Models */}
      <section className="section">
        <div className="section-head">
          <span className="section-label">Models</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="section-kicker" style={{ color: 'var(--pink-soft)' }} onClick={() => setSelectedTypes(visible.map((m) => m.type))}>All</button>
            <button className="section-kicker" onClick={() => setSelectedTypes([])}>Clear</button>
          </div>
        </div>
        <div className="field" style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--faint)' }} />
          <input className="input" style={{ paddingLeft: 34 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models" />
        </div>
        <div className="family-row">
          {(['All', ...families] as (ModelFamily | 'All')[]).map((f) => {
            const hue = f === 'All' ? 'var(--pink)' : familyColor(f as ModelFamily);
            const active = family === f;
            return (
              <button key={f} className={`chip ${active ? 'active' : ''}`} onClick={() => setFamily(f)}
                style={active ? { color: hue, borderColor: hue } : undefined}>{f}</button>
            );
          })}
        </div>
        <div className="model-list">
          {grouped.map(([fam, list]) => {
            const hue = familyColor(fam);
            return (
              <div key={fam}>
                <div className="model-group-head">
                  <span className="dot" style={{ background: hue, boxShadow: `0 0 8px ${hue}` }} />
                  <span className="name" style={{ color: hue }}>{fam}</span>
                  <span className="rule" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${hue} 34%, transparent), transparent)` }} />
                </div>
                {list.map((m) => {
                  const active = selectedTypes.includes(m.type);
                  return (
                    <button key={m.type} className={`model-card ${active ? 'active' : ''}`} onClick={() => toggleType(m.type)}>
                      <div className="info">
                        <div className="label">{m.label}{m.badge && <span className="badge" style={{ marginLeft: 7, color: hue, borderColor: `color-mix(in srgb, ${hue} 42%, transparent)` }}>{m.badge}</span>}</div>
                        <div className="desc">{m.desc}</div>
                      </div>
                      <div className="check" style={active ? { borderColor: hue } : undefined}>{active && <Check size={11} />}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {selectedTypes.length > 0 && (
          <div className="section-kicker" style={{ color: 'var(--pink-soft)' }}>
            {selectedTypes.length} selected{selectedTypes.length > 1 ? ` · ${selectedTypes.length} results per run` : ''}
          </div>
        )}
      </section>
    </>
  );
}
