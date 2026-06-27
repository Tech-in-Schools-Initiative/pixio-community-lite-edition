// ──────────────────────────────────────────────────────────────────────────
// Pixio · Global studio store
// Shared state across the three surfaces + persistence (gallery -> IndexedDB,
// preferences -> localStorage), prompt/model memory, compare selection and the
// cross-surface "send to" handoff.
// ──────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { createDefaultParams, type GenerationParams, type MediaMode } from '../prodia/types';
import type { StudioAsset, Surface, Theme } from './types';
import { idbGet, idbSet, debounce } from './db';

const DEFAULT_PROMPT =
  'A translucent handheld AI canvas device on a glossy black workbench, luminous accent light seams, glass reflections, cinematic studio lighting, editorial product photography, 8k';

const GALLERY_KEY = 'gallery';
const MAX_GALLERY = 80;
const MAX_HISTORY = 30;
const MAX_RECENT_MODELS = 10;

const ls = {
  get: (k: string) => (typeof window === 'undefined' ? null : localStorage.getItem(k)),
  set: (k: string, v: string) => { if (typeof window !== 'undefined') localStorage.setItem(k, v); },
};
const readJSON = <T,>(k: string, fallback: T): T => {
  try { const v = ls.get(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};

const persistGallery = debounce((assets: StudioAsset[]) => {
  // only persist finished work, capped, without transient flags
  const keep = assets.filter((a) => a.status === 'done').slice(0, MAX_GALLERY);
  void idbSet(GALLERY_KEY, keep);
}, 600);

export interface CanvasSeed { url: string; isVideo?: boolean }

interface StudioState {
  hydrated: boolean;
  theme: Theme;
  apiKey: string;
  surface: Surface;
  medium: MediaMode;
  trackCost: boolean;
  sound: boolean;
  accent: string;
  params: GenerationParams;
  selectedTypes: string[];
  assets: StudioAsset[];

  promptHistory: string[];
  favoritePrompts: string[];
  recentModels: string[];
  favoriteModels: string[];

  canvasSeed: CanvasSeed[];
  nodeSeed: string | null;
  compareIds: string[];

  hydrate: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setApiKey: (k: string) => void;
  setSurface: (s: Surface) => void;
  setMedium: (m: MediaMode) => void;
  setTrackCost: (v: boolean) => void;
  setSound: (v: boolean) => void;
  setAccent: (id: string) => void;
  patchParams: (patch: Partial<GenerationParams>) => void;
  resetParams: () => void;
  setSelectedTypes: (types: string[]) => void;
  toggleType: (type: string) => void;

  addAsset: (a: StudioAsset) => void;
  updateAsset: (id: string, patch: Partial<StudioAsset>) => void;
  removeAsset: (id: string) => void;
  clearAssets: () => void;

  pushPrompt: (p: string) => void;
  toggleFavoritePrompt: (p: string) => void;
  noteModelsUsed: (types: string[]) => void;
  toggleFavoriteModel: (type: string) => void;

  sendToCanvas: (seeds: CanvasSeed | CanvasSeed[]) => void;
  takeCanvasSeed: () => void;
  sendToNodes: (url: string) => void;
  takeNodeSeed: () => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
}

export const useStudio = create<StudioState>((set, get) => ({
  hydrated: false,
  theme: 'dark',
  apiKey: '',
  surface: 'studio',
  medium: 'image',
  trackCost: true,
  sound: true,
  accent: 'pixio',
  params: { ...createDefaultParams(), prompt: DEFAULT_PROMPT },
  selectedTypes: ['inference.flux-fast.schnell.txt2img.v2'],
  assets: [],
  promptHistory: [],
  favoritePrompts: [],
  recentModels: [],
  favoriteModels: [],
  canvasSeed: [],
  nodeSeed: null,
  compareIds: [],

  hydrate: () => {
    if (typeof window === 'undefined' || get().hydrated) return;
    set({
      hydrated: true,
      theme: (ls.get('PIXIO_THEME') as Theme | null) ?? 'dark',
      apiKey: ls.get('PIXIO_API_KEY') ?? '',
      trackCost: ls.get('PIXIO_TRACK_COST') == null ? true : ls.get('PIXIO_TRACK_COST') === '1',
      sound: ls.get('PIXIO_SOUND') == null ? true : ls.get('PIXIO_SOUND') === '1',
      accent: ls.get('PIXIO_ACCENT') ?? 'pixio',
      promptHistory: readJSON('PIXIO_PROMPTS', []),
      favoritePrompts: readJSON('PIXIO_FAV_PROMPTS', []),
      recentModels: readJSON('PIXIO_RECENT_MODELS', []),
      favoriteModels: readJSON('PIXIO_FAV_MODELS', []),
    });
    void idbGet<StudioAsset[]>(GALLERY_KEY).then((saved) => {
      if (saved && saved.length) set((s) => ({ assets: s.assets.length ? s.assets : saved }));
    });
  },

  setTheme: (theme) => { ls.set('PIXIO_THEME', theme); set({ theme }); },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setApiKey: (apiKey) => { ls.set('PIXIO_API_KEY', apiKey); set({ apiKey }); },
  setSurface: (surface) => set({ surface }),
  setMedium: (medium) =>
    set({
      medium,
      selectedTypes: medium === 'video'
        ? ['inference.veo.fast.txt2vid.v2']
        : ['inference.flux-fast.schnell.txt2img.v2'],
    }),
  setTrackCost: (trackCost) => { ls.set('PIXIO_TRACK_COST', trackCost ? '1' : '0'); set({ trackCost }); },
  setSound: (sound) => { ls.set('PIXIO_SOUND', sound ? '1' : '0'); set({ sound }); },
  setAccent: (accent) => { ls.set('PIXIO_ACCENT', accent); set({ accent }); },
  patchParams: (patch) => set((s) => ({ params: { ...s.params, ...patch } })),
  resetParams: () => set({ params: { ...createDefaultParams(), prompt: DEFAULT_PROMPT } }),
  setSelectedTypes: (selectedTypes) => set({ selectedTypes }),
  toggleType: (type) =>
    set((s) => ({
      selectedTypes: s.selectedTypes.includes(type)
        ? s.selectedTypes.filter((t) => t !== type)
        : [...s.selectedTypes, type],
    })),

  addAsset: (asset) =>
    set((s) => {
      const idx = s.assets.findIndex((a) => a.id === asset.id);
      let assets: StudioAsset[];
      if (idx === -1) assets = [asset, ...s.assets];
      else { assets = s.assets.slice(); assets[idx] = { ...assets[idx], ...asset }; }
      persistGallery(assets);
      return { assets };
    }),
  updateAsset: (id, patch) =>
    set((s) => {
      const assets = s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a));
      persistGallery(assets);
      return { assets };
    }),
  removeAsset: (id) =>
    set((s) => {
      const assets = s.assets.filter((a) => a.id !== id);
      persistGallery(assets);
      return { assets, compareIds: s.compareIds.filter((c) => c !== id) };
    }),
  clearAssets: () => { void idbSet(GALLERY_KEY, []); set({ assets: [], compareIds: [] }); },

  pushPrompt: (p) =>
    set((s) => {
      const v = p.trim();
      if (!v) return {};
      const promptHistory = [v, ...s.promptHistory.filter((x) => x !== v)].slice(0, MAX_HISTORY);
      ls.set('PIXIO_PROMPTS', JSON.stringify(promptHistory));
      return { promptHistory };
    }),
  toggleFavoritePrompt: (p) =>
    set((s) => {
      const has = s.favoritePrompts.includes(p);
      const favoritePrompts = has ? s.favoritePrompts.filter((x) => x !== p) : [p, ...s.favoritePrompts];
      ls.set('PIXIO_FAV_PROMPTS', JSON.stringify(favoritePrompts));
      return { favoritePrompts };
    }),
  noteModelsUsed: (types) =>
    set((s) => {
      const recentModels = [...types, ...s.recentModels.filter((t) => !types.includes(t))].slice(0, MAX_RECENT_MODELS);
      ls.set('PIXIO_RECENT_MODELS', JSON.stringify(recentModels));
      return { recentModels };
    }),
  toggleFavoriteModel: (type) =>
    set((s) => {
      const has = s.favoriteModels.includes(type);
      const favoriteModels = has ? s.favoriteModels.filter((t) => t !== type) : [type, ...s.favoriteModels];
      ls.set('PIXIO_FAV_MODELS', JSON.stringify(favoriteModels));
      return { favoriteModels };
    }),

  sendToCanvas: (seeds) =>
    set({ canvasSeed: Array.isArray(seeds) ? seeds : [seeds], surface: 'canvas' }),
  takeCanvasSeed: () => set({ canvasSeed: [] }),
  sendToNodes: (url) => set({ nodeSeed: url, surface: 'nodes' }),
  takeNodeSeed: () => set({ nodeSeed: null }),
  toggleCompare: (id) =>
    set((s) => ({
      compareIds: s.compareIds.includes(id)
        ? s.compareIds.filter((c) => c !== id)
        : [...s.compareIds, id].slice(-4),
    })),
  clearCompare: () => set({ compareIds: [] }),
}));
