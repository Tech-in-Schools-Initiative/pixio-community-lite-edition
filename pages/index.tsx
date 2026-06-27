import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import {
  Columns2, Command, KeyRound, Layers3, Library, Moon, Play, Settings2, Sparkles, Sun, Volume2, VolumeX,
  Workflow as WorkflowIcon, Wand2,
} from 'lucide-react';
import LibraryOverlay from '../components/studio/LibraryOverlay';
import { accentVars, getAccent } from '../lib/studio/theme';
import SettingsMenu from '../components/studio/SettingsMenu';
import { useStudio } from '../lib/studio/store';
import { useGenerate } from '../lib/studio/useGenerate';
import { ALL_MODELS, getModel } from '../lib/prodia/catalog';
import type { Surface } from '../lib/studio/types';
import ApiKeyModal from '../components/studio/ApiKeyModal';
import Sidebar from '../components/studio/Sidebar';
import RegularSurface from '../components/studio/RegularSurface';
import Inspector from '../components/studio/Inspector';
import QueueDock from '../components/studio/QueueDock';
import CompareView from '../components/studio/CompareView';
import ShortcutsSheet from '../components/studio/ShortcutsSheet';
import CommandPalette, { type CommandAction } from '../components/studio/CommandPalette';

function SurfacePlaceholder({ label }: { label: string }) {
  return (
    <div className="surface-fill">
      <div className="surface-loading">
        <div className="spinner" />
        <div style={{ textAlign: 'center' }}>
          <strong style={{ display: 'block', fontSize: 16, color: 'var(--text)' }}>Preparing {label}…</strong>
          <span style={{ fontSize: 13 }}>This module is initializing.</span>
        </div>
      </div>
    </div>
  );
}

const NodeStudio = dynamic(() => import('../components/studio/nodes/NodeStudio'), {
  ssr: false, loading: () => <SurfacePlaceholder label="the node graph" />,
});
const CanvasStudio = dynamic(() => import('../components/studio/canvas/CanvasStudio'), {
  ssr: false, loading: () => <SurfacePlaceholder label="the AI canvas" />,
});

const MODES: { key: Surface; label: string; icon: any }[] = [
  { key: 'studio', label: 'Studio', icon: Sparkles },
  { key: 'canvas', label: 'Canvas', icon: Layers3 },
  { key: 'nodes', label: 'Nodes', icon: WorkflowIcon },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const theme = useStudio((s) => s.theme);
  const toggleTheme = useStudio((s) => s.toggleTheme);
  const surface = useStudio((s) => s.surface);
  const setSurface = useStudio((s) => s.setSurface);
  const apiKey = useStudio((s) => s.apiKey);
  const assets = useStudio((s) => s.assets);
  const params = useStudio((s) => s.params);
  const trackCost = useStudio((s) => s.trackCost);
  const addAsset = useStudio((s) => s.addAsset);
  const sound = useStudio((s) => s.sound);
  const setSound = useStudio((s) => s.setSound);
  const medium = useStudio((s) => s.medium);
  const setMedium = useStudio((s) => s.setMedium);
  const setSelectedTypes = useStudio((s) => s.setSelectedTypes);
  const patchParams = useStudio((s) => s.patchParams);
  const promptHistory = useStudio((s) => s.promptHistory);
  const canvasSeed = useStudio((s) => s.canvasSeed);
  const nodeSeed = useStudio((s) => s.nodeSeed);
  const compareIds = useStudio((s) => s.compareIds);
  const accent = useStudio((s) => s.accent);
  const runGenerate = useGenerate();

  useEffect(() => {
    useStudio.getState().hydrate();
    setMounted(true);
  }, []);

  // Clear cross-surface handoffs when leaving the destination surface.
  const prevSurface = useRef(surface);
  useEffect(() => {
    const st = useStudio.getState();
    if (prevSurface.current === 'canvas' && surface !== 'canvas') st.takeCanvasSeed();
    if (prevSurface.current === 'nodes' && surface !== 'nodes') st.takeNodeSeed();
    prevSurface.current = surface;
  }, [surface]);

  const onGenerate = useCallback(() => {
    if (!useStudio.getState().apiKey) { setKeyOpen(true); return; }
    setError(runGenerate() ?? '');
  }, [runGenerate]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); return; }
      if (mod && e.key === 'Enter') { e.preventDefault(); onGenerate(); return; }
      if (mod && e.key === '\\') { e.preventDefault(); toggleTheme(); return; }
      if (e.key === 'Escape') { setPaletteOpen(false); setShortcutsOpen(false); setCompareOpen(false); setSettingsOpen(false); setLibraryOpen(false); return; }
      if (typing || mod) return;
      if (e.key === '?') { e.preventDefault(); setShortcutsOpen(true); }
      else if (e.key === 'g' || e.key === 'G') setSurface('studio');
      else if (e.key === 'c' || e.key === 'C') setSurface('canvas');
      else if (e.key === 'n' || e.key === 'N') setSurface('nodes');
      else if (e.key === 'l' || e.key === 'L') setLibraryOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onGenerate, toggleTheme, setSurface]);

  const actions = useMemo<CommandAction[]>(() => {
    const list: CommandAction[] = [
      { id: 'go-studio', label: 'Go to Studio', group: 'Navigate', hint: 'G', perform: () => setSurface('studio') },
      { id: 'go-canvas', label: 'Go to Canvas', group: 'Navigate', hint: 'C', perform: () => setSurface('canvas') },
      { id: 'go-nodes', label: 'Go to Nodes', group: 'Navigate', hint: 'N', perform: () => setSurface('nodes') },
      { id: 'library', label: 'Open Library', group: 'Navigate', hint: 'L', keywords: 'assets gallery', perform: () => setLibraryOpen(true) },
      { id: 'generate', label: 'Generate', group: 'Actions', hint: '⌘↵', keywords: 'run create', perform: onGenerate },
      { id: 'mode-image', label: 'Switch to Images', group: 'Actions', keywords: 'image', perform: () => setMedium('image') },
      { id: 'mode-video', label: 'Switch to Videos', group: 'Actions', keywords: 'video', perform: () => setMedium('video') },
      { id: 'theme', label: 'Toggle theme', group: 'Settings', hint: '⌘\\', perform: toggleTheme },
      { id: 'sound', label: sound ? 'Mute sounds' : 'Enable sounds', group: 'Settings', perform: () => setSound(!sound) },
      { id: 'apikey', label: 'API key', group: 'Settings', keywords: 'prodia token', perform: () => setKeyOpen(true) },
      { id: 'shortcuts', label: 'Keyboard shortcuts', group: 'Settings', hint: '?', perform: () => setShortcutsOpen(true) },
    ];
    if (compareIds.length) list.push({ id: 'compare', label: `Compare ${compareIds.length} outputs`, group: 'Actions', perform: () => setCompareOpen(true) });
    promptHistory.slice(0, 8).forEach((p, i) =>
      list.push({ id: `prompt-${i}`, label: p.length > 60 ? `${p.slice(0, 59)}…` : p, group: 'Recent prompts', keywords: p, perform: () => patchParams({ prompt: p }) }));
    ALL_MODELS.forEach((m) =>
      list.push({ id: `model-${m.id}`, label: `Use ${m.label}`, group: 'Models', keywords: `${m.family} ${m.operation} ${m.type}`, hint: m.family, perform: () => { setMedium(m.medium); setSelectedTypes([m.type]); setSurface('studio'); } }));
    return list;
  }, [onGenerate, toggleTheme, setSurface, setMedium, setSound, sound, setSelectedTypes, patchParams, promptHistory, compareIds.length]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = () => useStudio.getState().sendToCanvas({ url: String(r.result) });
      r.readAsDataURL(file);
    }
  }, []);

  if (!mounted) return null;
  const running = assets.filter((a) => a.status === 'running').length;
  const activeIndex = Math.max(0, MODES.findIndex((m) => m.key === surface));
  const accentStyle = accentVars(getAccent(accent), theme);
  const accentC1 = getAccent(accent).c1;

  return (
    <div
      className="pixio" data-theme={theme} style={accentStyle as any}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={onDrop}
    >
      <Head>
        <title>Pixio Studio — Open Source AI Canvas, Nodes & Generation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <div>
            <div className="brand-title"><span className="brand-grad">Pixio Studio</span></div>
            <div className="brand-sub">{ALL_MODELS.length} Prodia models · open source</div>
          </div>
        </div>

        <nav className="modes">
          <span className="mode-pill" style={{ transform: `translateX(calc(${activeIndex} * 100%))` }} />
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.key} className={`mode ${surface === m.key ? 'is-active' : ''}`} onClick={() => setSurface(m.key)}>
                <Icon size={15} /> {m.label}
              </button>
            );
          })}
        </nav>

        <div className="top-actions">
          {running > 0 && <div className="run-pill"><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> {running}</div>}
          {compareIds.length >= 2 && (
            <button className="btn sm" onClick={() => setCompareOpen(true)}><Columns2 size={14} /> Compare {compareIds.length}</button>
          )}
          <button className="btn sm ghost" onClick={() => setLibraryOpen(true)} title="Library (L)"><Library size={14} /> Library{assets.length ? ` ${assets.length}` : ''}</button>
          <button className="btn sm ghost" onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)"><Command size={14} /> <kbd style={{ fontSize: 10 }}>⌘K</kbd></button>
          <button className="btn icon ghost" onClick={toggleTheme} title="Toggle theme (⌘\\)">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button className="btn icon ghost" onClick={() => setSettingsOpen((o) => !o)} title="Settings & accent color"><Settings2 size={16} /></button>
          <button className="btn sm" onClick={() => setKeyOpen(true)}><KeyRound size={14} /> API key</button>
          {surface === 'studio' && <button className="btn primary" onClick={onGenerate}><Play size={15} /> Generate</button>}
        </div>
      </header>

      <div className="workspace" data-surface={surface}>
        {surface === 'studio' && (
          <>
            <aside className="rail rail-left">
              <div className="rail-scroll"><Sidebar onGenerate={onGenerate} /></div>
              <div className="rail-foot">
                {error && <div className="notice">{error}</div>}
                <button className="btn primary" style={{ width: '100%', padding: 14 }} onClick={onGenerate}><Wand2 size={15} /> Generate</button>
              </div>
            </aside>
            <main className="stage"><RegularSurface onSelect={setSelectedId} /></main>
            <aside className="rail rail-right"><Inspector selectedId={selectedId} onSelect={setSelectedId} /></aside>
          </>
        )}

        {surface === 'canvas' && (
          <main className="stage">
            <div className="surface-fill">
              <CanvasStudio apiKey={apiKey} params={params} trackCost={trackCost} theme={theme} seedImages={canvasSeed} onAsset={addAsset} accentColor={accentC1} />
            </div>
          </main>
        )}

        {surface === 'nodes' && (
          <main className="stage">
            <div className="surface-fill">
              <NodeStudio apiKey={apiKey} params={params} trackCost={trackCost} theme={theme} seedImage={nodeSeed} onAsset={addAsset} />
            </div>
          </main>
        )}
      </div>

      <QueueDock />
      {keyOpen && <ApiKeyModal onClose={() => setKeyOpen(false)} />}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={actions} />
      <ShortcutsSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <CompareView open={compareOpen} onClose={() => setCompareOpen(false)} />
      <SettingsMenu open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LibraryOverlay open={libraryOpen} onClose={() => setLibraryOpen(false)} />

      {dragOver && (
        <div className="drop-overlay" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <div className="drop-card"><Layers3 size={32} /><strong>Drop image to edit on Canvas</strong></div>
        </div>
      )}
    </div>
  );
}
