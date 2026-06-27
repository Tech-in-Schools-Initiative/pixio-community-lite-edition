// ──────────────────────────────────────────────────────────────────────────
// Pixio · CanvasStudio (DEFAULT EXPORT)
// A freeform, Canva-style infinite design board on a Konva Stage. Add/upload
// images, text and shapes; generate with txt2img; and — the flagship — click an
// image to AI-edit it: instruction edits, remove-bg, upscale, variation,
// describe→prompt, and brush-mask inpainting. Accent-driven pink/violet chrome.
//
// CLIENT-ONLY: the parent must dynamic-import this with { ssr: false } because
// react-konva needs the DOM. All window/document access here is inside effects
// or event handlers — never at module scope.
// ──────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import {
  MousePointer2,
  Hand,
  Image as ImageIcon,
  Type,
  Square,
  Circle as CircleIcon,
  Sparkles,
  Wand2,
  Upload,
  Download,
  Plus,
  Minus,
  Maximize,
  Trash2,
  Copy,
} from 'lucide-react';

import { TOKENS } from '../../../lib/studio/types';
import type { StudioAsset, Theme } from '../../../lib/studio/types';
import type { GenerationParams } from '../../../lib/prodia/types';
import { runJob, describeImage, jobErrorMessage } from '../../../lib/prodia/client';
import { buildConfig } from '../../../lib/prodia/config';
import {
  CLASSIFY_MODELS,
  FACE_RESTORE_MODELS,
  SEGMENT_MODELS,
  VECTOR_MODELS,
  getModel,
  editModels,
  INPAINT_MODELS,
  UTILITY_MODELS,
} from '../../../lib/prodia/catalog';

import type {
  CanvasElement,
  ImageElement,
  MaskStroke,
  ToolId,
  Viewport,
} from '../../../lib/canvas/types';
import {
  isImage,
  makeImageElement,
  makeShapeElement,
  makeTextElement,
  uid,
} from '../../../lib/canvas/types';
import { loadImageSize, fileToDataUrl } from '../../../lib/canvas/useImage';
import { buildMaskDataUrl } from '../../../lib/canvas/mask';
import {
  centerOfViewport,
  clampScale,
  elementCorners,
  elementsAABB,
  fitViewport,
  scaleLongSide,
  screenToStage,
  stageToScreen,
} from '../../../lib/canvas/geometry';

import { CanvasNode } from './CanvasNodes';
import { AIPopover } from './AIPopover';
import type { AIActionKind } from './AIPopover';
import { PropertiesPanel } from './PropertiesPanel';
import { GeneratePanel } from './GeneratePanel';
import { MaskToolbar } from './MaskToolbar';
import { IconButton } from './ui';

export interface CanvasStudioProps {
  apiKey: string;
  params: GenerationParams;
  trackCost: boolean;
  theme: Theme;
  seedImages?: { url: string; isVideo?: boolean }[];
  onAsset?: (a: StudioAsset) => void;
  /** Resolved primary accent color (real hex) for Konva selection chrome. */
  accentColor?: string;
}

interface Toast {
  id: string;
  kind: 'info' | 'error' | 'success';
  text: string;
}

const UPSCALE_MODEL = UTILITY_MODELS.find((m) => m.operation === 'upscale');
const REMOVEBG_MODEL = UTILITY_MODELS.find((m) => m.operation === 'removebg');
const SEGMENT_MODEL = SEGMENT_MODELS[0];
const CLASSIFY_MODEL = CLASSIFY_MODELS.find((m) => m.id.includes('nsfw')) ?? CLASSIFY_MODELS[0];
const FACE_RESTORE_MODEL = FACE_RESTORE_MODELS[0];
const VECTOR_MODEL = VECTOR_MODELS[0];
const VARIATION_MODEL =
  editModels().find((m) => m.operation === 'img2img' && m.family === 'FLUX') ?? editModels()[0];
const DEFAULT_INPAINT = INPAINT_MODELS[0]?.id ?? '';

const TOOLS: { id: ToolId; icon: React.ReactNode; label: string; key: string }[] = [
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select', key: 'V' },
  { id: 'hand', icon: <Hand size={18} />, label: 'Pan', key: 'H' },
  { id: 'image', icon: <ImageIcon size={18} />, label: 'Upload image', key: 'U' },
  { id: 'text', icon: <Type size={18} />, label: 'Text', key: 'T' },
  { id: 'rect', icon: <Square size={18} />, label: 'Rectangle', key: 'R' },
  { id: 'ellipse', icon: <CircleIcon size={18} />, label: 'Ellipse', key: 'O' },
  { id: 'generate', icon: <Sparkles size={18} />, label: 'Generate', key: 'G' },
];

const CanvasStudio: React.FC<CanvasStudioProps> = ({
  apiKey,
  params,
  trackCost,
  theme,
  seedImages,
  onAsset,
  accentColor = '#ff5fb7',
}) => {
  // Konva (canvas 2D) cannot resolve CSS vars — compute real colors here.
  const gridStroke = theme === 'light' ? 'rgba(60,60,72,0.10)' : 'rgba(255,255,255,0.07)';
  /* ── refs ──────────────────────────────────────────────────────────────── */
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seededRef = useRef(false);

  /* ── state ─────────────────────────────────────────────────────────────── */
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const [vp, setVp] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<ToolId>('select');
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPrompt, setGenPrompt] = useState(params.prompt ?? '');
  const [genBusy, setGenBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // AI popover op state
  const [aiBusy, setAiBusy] = useState(false);
  const [aiLabel, setAiLabel] = useState('');

  // mask mode state
  const [maskTargetId, setMaskTargetId] = useState<string | null>(null);
  const [maskStrokes, setMaskStrokes] = useState<MaskStroke[]>([]);
  const [maskBrush, setMaskBrush] = useState(36);
  const [maskMode, setMaskMode] = useState<'paint' | 'erase'>('paint');
  const [maskPrompt, setMaskPrompt] = useState('');
  const [maskModelId, setMaskModelId] = useState(DEFAULT_INPAINT);
  const [maskBusy, setMaskBusy] = useState(false);
  const isPaintingRef = useRef(false);

  const inMaskMode = !!maskTargetId;

  /* ── helpers ───────────────────────────────────────────────────────────── */
  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = uid('t');
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 5200 : 3200);
  }, []);

  const registerRef = useCallback((id: string, node: Konva.Node | null) => {
    nodeRefs.current[id] = node;
  }, []);

  const patchElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setElements((els) => els.map((e) => (e.id === id ? ({ ...e, ...patch } as CanvasElement) : e)));
  }, []);

  const addElement = useCallback((el: CanvasElement, select = true) => {
    setElements((els) => [...els, el]);
    if (select) setSelectedIds([el.id]);
  }, []);

  const removeElements = useCallback((ids: string[]) => {
    setElements((els) => els.filter((e) => !ids.includes(e.id)));
    setSelectedIds((sel) => sel.filter((id) => !ids.includes(id)));
    ids.forEach((id) => delete nodeRefs.current[id]);
  }, []);

  /* ── resize observer ───────────────────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: Math.max(320, r.width), height: Math.max(240, r.height) });
    };
    measure();
    const ro = new window.ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // initial viewport centred once we have a size
  useEffect(() => {
    setVp((v) => (v.x === 0 && v.y === 0 ? { scale: 1, x: size.width / 2, y: size.height / 2 } : v));
  }, [size.width, size.height]);

  /* ── seed images on mount ──────────────────────────────────────────────── */
  useEffect(() => {
    if (seededRef.current || !seedImages?.length || typeof window === 'undefined') return;
    seededRef.current = true;
    let cancelled = false;
    (async () => {
      const imgs = seedImages.filter((s) => !s.isVideo);
      const placed: CanvasElement[] = [];
      let i = 0;
      for (const seed of imgs) {
        try {
          const { width, height } = await loadImageSize(seed.url);
          const sz = scaleLongSide(width, height, 460);
          const col = i % 3;
          const row = Math.floor(i / 3);
          placed.push(
            makeImageElement(seed.url, sz.width, sz.height, {
              x: -700 + col * 520,
              y: -360 + row * 520,
              name: 'Seed image',
            }),
          );
          i += 1;
        } catch {
          /* skip unloadable seed */
        }
      }
      if (cancelled || !placed.length) return;
      setElements((els) => [...els, ...placed]);
      // fit board to the seeds after a tick
      window.setTimeout(() => fitToContent(placed), 60);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedImages]);

  /* ── transformer binding ───────────────────────────────────────────────── */
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    if (inMaskMode || editingTextId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const nodes = selectedIds
      .map((id) => nodeRefs.current[id])
      .filter((n): n is Konva.Node => !!n);
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, elements, inMaskMode, editingTextId]);

  /* ── pan/zoom ──────────────────────────────────────────────────────────── */
  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Interaction model:
      //  · ctrlKey wheel  → pinch-zoom gesture (trackpads emit this) → zoom to cursor
      //  · shiftKey wheel → horizontal pan
      //  · horizontal-dominant trackpad scroll → two-axis pan
      //  · plain vertical wheel → zoom to cursor
      const horizontalDominant = Math.abs(e.evt.deltaX) > Math.abs(e.evt.deltaY);
      const panIntent = !e.evt.ctrlKey && (e.evt.shiftKey || horizontalDominant);
      if (panIntent) {
        const dx = e.evt.shiftKey && e.evt.deltaX === 0 ? e.evt.deltaY : e.evt.deltaX;
        const dy = e.evt.shiftKey && e.evt.deltaX === 0 ? 0 : e.evt.deltaY;
        setVp((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
        return;
      }

      setVp((v) => {
        const oldScale = v.scale;
        const mousePoint = { x: (pointer.x - v.x) / oldScale, y: (pointer.y - v.y) / oldScale };
        const dir = e.evt.deltaY > 0 ? -1 : 1;
        const factor = 1.0015 ** (Math.abs(e.evt.deltaY) * dir);
        const newScale = clampScale(oldScale * factor);
        return {
          scale: newScale,
          x: pointer.x - mousePoint.x * newScale,
          y: pointer.y - mousePoint.y * newScale,
        };
      });
    },
    [],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      setVp((v) => {
        const newScale = clampScale(v.scale * factor);
        const cx = size.width / 2;
        const cy = size.height / 2;
        const mousePoint = { x: (cx - v.x) / v.scale, y: (cy - v.y) / v.scale };
        return { scale: newScale, x: cx - mousePoint.x * newScale, y: cy - mousePoint.y * newScale };
      });
    },
    [size.width, size.height],
  );

  const fitToContent = useCallback(
    (override?: CanvasElement[]) => {
      const els = override ?? elements;
      const visible = els.filter((e) => !e.hidden);
      const box = elementsAABB(visible);
      if (!box) {
        setVp({ scale: 1, x: size.width / 2, y: size.height / 2 });
        return;
      }
      setVp(fitViewport(box, size.width, size.height, 90));
    },
    [elements, size.width, size.height],
  );

  /* ── selection helpers ─────────────────────────────────────────────────── */
  const selectOne = useCallback((id: string, additive: boolean) => {
    setSelectedIds((sel) => {
      if (additive) {
        return sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
      }
      return [id];
    });
  }, []);

  const onNodeSelect = useCallback(
    (id: string) => (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (inMaskMode) return;
      e.cancelBubble = true;
      const additive = e.evt.shiftKey;
      selectOne(id, additive);
    },
    [inMaskMode, selectOne],
  );

  const onStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const clickedEmpty = e.target === stage || e.target.name() === 'bg';

      // mask painting begins on empty/anywhere while in mask mode
      if (inMaskMode) {
        const target = elements.find((el) => el.id === maskTargetId);
        if (!target) return;
        beginStroke();
        return;
      }

      if (tool === 'hand') return; // stage drag handles pan

      if (clickedEmpty) {
        // placement tools drop an element where you click
        const pt = screenToStage(stage.getPointerPosition() ?? { x: size.width / 2, y: size.height / 2 }, vp);
        if (tool === 'text') {
          placeText(pt);
          return;
        }
        if (tool === 'rect') {
          placeShape('rect', pt);
          return;
        }
        if (tool === 'ellipse') {
          placeShape('ellipse', pt);
          return;
        }
        // select tool on empty → deselect
        setSelectedIds([]);
        setEditingTextId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, inMaskMode, maskTargetId, elements, vp, size.width, size.height],
  );

  /* ── element placement ─────────────────────────────────────────────────── */
  const placeText = useCallback(
    (pt: { x: number; y: number }) => {
      const el = makeTextElement({ x: pt.x - 180, y: pt.y - 30 });
      addElement(el);
      setTool('select');
      setEditingTextId(el.id);
    },
    [addElement],
  );

  const placeShape = useCallback(
    (kind: 'rect' | 'ellipse', pt: { x: number; y: number }) => {
      const el = makeShapeElement(kind, { x: pt.x - 140, y: pt.y - 100, fill: accentColor });
      addElement(el);
      setTool('select');
    },
    [addElement],
  );

  const placeImage = useCallback(
    async (src: string, opts: { name?: string; prompt?: string; modelType?: string } = {}, near?: { x: number; y: number }) => {
      try {
        const { width, height } = await loadImageSize(src);
        const sz = scaleLongSide(width, height, 480);
        const center = near ?? centerOfViewport(vp, size.width, size.height);
        const el = makeImageElement(src, sz.width, sz.height, {
          x: center.x - sz.width / 2,
          y: center.y - sz.height / 2,
          name: opts.name ?? 'Image',
          prompt: opts.prompt,
          modelType: opts.modelType,
        });
        addElement(el);
        return el;
      } catch {
        toast('error', 'Could not load that image.');
        return null;
      }
    },
    [vp, size.width, size.height, addElement, toast],
  );

  /* ── upload ────────────────────────────────────────────────────────────── */
  const onPickFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
      let i = 0;
      for (const f of arr) {
        try {
          const dataUrl = await fileToDataUrl(f);
          const { width, height } = await loadImageSize(dataUrl);
          const sz = scaleLongSide(width, height, 480);
          const center = centerOfViewport(vp, size.width, size.height);
          addElement(
            makeImageElement(dataUrl, sz.width, sz.height, {
              x: center.x - sz.width / 2 + i * 36,
              y: center.y - sz.height / 2 + i * 36,
              name: f.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Upload',
            }),
            i === arr.length - 1,
          );
          i += 1;
        } catch {
          toast('error', `Couldn't read ${f.name}`);
        }
      }
      setTool('select');
    },
    [vp, size.width, size.height, addElement, toast],
  );

  // drag & drop onto the board
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) onPickFiles(e.dataTransfer.files);
    },
    [onPickFiles],
  );

  /* ── txt2img generate ──────────────────────────────────────────────────── */
  const handleGenerate = useCallback(
    async (modelId: string, prompt: string) => {
      const model = getModel(modelId);
      if (!model) return;
      setGenBusy(true);
      const assetId = uid('asset');
      onAsset?.({
        id: assetId,
        status: 'running',
        prompt,
        modelType: model.type,
        modelLabel: model.label,
        family: model.family,
        source: 'canvas',
        createdAt: Date.now(),
      });
      try {
        const config = buildConfig(model, params, prompt);
        const res = await runJob({
          type: model.type,
          config,
          apiKey,
          format: params.outputFormat,
          trackCost,
        });
        if (!res.url) throw new Error('Prodia returned metadata without an image.');
        await placeImage(res.url, { name: 'Generated', prompt, modelType: model.type });
        onAsset?.({
          id: assetId,
          status: 'done',
          url: res.url,
          isVideo: res.video,
          outputs: res.outputs,
          metadata: res.metadata,
          mimeType: res.mimeType,
          prompt,
          modelType: model.type,
          modelLabel: model.label,
          family: model.family,
          source: 'canvas',
          createdAt: Date.now(),
          price: res.price?.dollars ?? null,
        });
        toast('success', `Generated with ${model.label}`);
        setShowGenerate(false);
      } catch (err) {
        const msg = jobErrorMessage(err);
        onAsset?.({
          id: assetId,
          status: 'error',
          prompt,
          modelType: model.type,
          modelLabel: model.label,
          family: model.family,
          source: 'canvas',
          createdAt: Date.now(),
          error: msg,
        });
        toast('error', msg);
      } finally {
        setGenBusy(false);
      }
    },
    [params, apiKey, trackCost, placeImage, onAsset, toast],
  );

  /* ── AI image ops (the flagship) ───────────────────────────────────────── */
  const selectedImage = useMemo<ImageElement | null>(() => {
    if (selectedIds.length !== 1) return null;
    const el = elements.find((e) => e.id === selectedIds[0]);
    return isImage(el) ? el : null;
  }, [selectedIds, elements]);

  const reportAsset = useCallback(
    (status: StudioAsset['status'], extra: Partial<StudioAsset>) => {
      onAsset?.({
        id: uid('asset'),
        status,
        prompt: '',
        modelType: '',
        modelLabel: '',
        family: '',
        source: 'canvas',
        createdAt: Date.now(),
        ...extra,
      });
    },
    [onAsset],
  );

  const runImageJob = useCallback(
    async (opts: {
      target: ImageElement;
      label: string;
      modelType: string;
      config: Record<string, unknown>;
      inputs: string[];
      modelLabel: string;
      family: string;
      mode: 'replace' | 'new';
      prompt: string;
      offset?: number;
    }) => {
      const { target } = opts;
      setAiBusy(true);
      setAiLabel(opts.label);
      patchElement(target.id, { loading: true, loadingLabel: opts.label + '…' } as Partial<CanvasElement>);
      try {
        const res = await runJob({
          type: opts.modelType,
          config: opts.config,
          inputs: opts.inputs,
          apiKey,
          format: params.outputFormat,
          trackCost,
        });
        if (!res.url) throw new Error('Prodia returned metadata without an image.');
        if (opts.mode === 'replace') {
          // refresh natural ratio in case dimensions changed (e.g. upscale)
          let newW = target.width;
          let newH = target.height;
          try {
            const nat = await loadImageSize(res.url);
            const ratio = nat.width / nat.height;
            newH = target.width / ratio;
          } catch {
            /* keep size */
          }
          patchElement(target.id, {
            src: res.url,
            height: newH,
            width: newW,
            loading: false,
            loadingLabel: undefined,
            prompt: opts.prompt || target.prompt,
            modelType: opts.modelType,
          } as Partial<CanvasElement>);
        } else {
          patchElement(target.id, { loading: false, loadingLabel: undefined } as Partial<CanvasElement>);
          const off = opts.offset ?? target.width + 40;
          await placeImage(
            res.url,
            { name: opts.label, prompt: opts.prompt, modelType: opts.modelType },
            { x: target.x + target.width + off / 2, y: target.y + target.height / 2 },
          );
        }
        reportAsset('done', {
          url: res.url,
          outputs: res.outputs,
          metadata: res.metadata,
          mimeType: res.mimeType,
          prompt: opts.prompt,
          modelType: opts.modelType,
          modelLabel: opts.modelLabel,
          family: opts.family,
          price: res.price?.dollars ?? null,
        });
        toast('success', `${opts.label} complete`);
        return res.url;
      } catch (err) {
        patchElement(target.id, { loading: false, loadingLabel: undefined } as Partial<CanvasElement>);
        const msg = jobErrorMessage(err);
        reportAsset('error', { modelType: opts.modelType, modelLabel: opts.modelLabel, family: opts.family, error: msg });
        toast('error', msg);
        return null;
      } finally {
        setAiBusy(false);
        setAiLabel('');
      }
    },
    [apiKey, params, trackCost, patchElement, placeImage, reportAsset, toast],
  );

  const onAIAction = useCallback(
    async (kind: AIActionKind, payload: { instruction: string; modelId: string }) => {
      const target = selectedImage;
      if (!target) return;

      if (kind === 'mask') {
        enterMaskMode(target.id);
        return;
      }

      if (kind === 'describe') {
        setAiBusy(true);
        setAiLabel('Describing');
        try {
          const desc = await describeImage(target.src, 'recreate');
          if (desc) {
            setGenPrompt(desc);
            setShowGenerate(true);
            toast('success', 'Prompt ready in the generate panel');
          } else {
            toast('info', 'No description returned.');
          }
        } catch (err) {
          toast('error', jobErrorMessage(err));
        } finally {
          setAiBusy(false);
          setAiLabel('');
        }
        return;
      }

      if (kind === 'removebg') {
        if (!REMOVEBG_MODEL) return;
        await runImageJob({
          target,
          label: 'Removing BG',
          modelType: REMOVEBG_MODEL.type,
          config: buildConfig(REMOVEBG_MODEL, params, ''),
          inputs: [target.src],
          modelLabel: REMOVEBG_MODEL.label,
          family: REMOVEBG_MODEL.family,
          mode: 'replace',
          prompt: '',
        });
        return;
      }

      if (kind === 'upscale') {
        if (!UPSCALE_MODEL) return;
        await runImageJob({
          target,
          label: 'Upscaling',
          modelType: UPSCALE_MODEL.type,
          config: buildConfig(UPSCALE_MODEL, params, target.prompt ?? ''),
          inputs: [target.src],
          modelLabel: UPSCALE_MODEL.label,
          family: UPSCALE_MODEL.family,
          mode: 'replace',
          prompt: target.prompt ?? '',
        });
        return;
      }

      if (kind === 'variation') {
        const vmodel = VARIATION_MODEL;
        if (!vmodel) return;
        const p = payload.instruction || target.prompt || params.prompt || 'a creative variation';
        await runImageJob({
          target,
          label: 'Varying',
          modelType: vmodel.type,
          config: buildConfig(vmodel, params, p),
          inputs: [target.src],
          modelLabel: vmodel.label,
          family: vmodel.family,
          mode: 'new',
          prompt: p,
        });
        return;
      }

      if (kind === 'segment') {
        if (!SEGMENT_MODEL) return;
        await runImageJob({
          target,
          label: 'Segmenting',
          modelType: SEGMENT_MODEL.type,
          config: buildConfig(SEGMENT_MODEL, params, payload.instruction || target.prompt || ''),
          inputs: [target.src],
          modelLabel: SEGMENT_MODEL.label,
          family: SEGMENT_MODEL.family,
          mode: 'new',
          prompt: payload.instruction || target.prompt || '',
          offset: 24,
        });
        return;
      }

      if (kind === 'classify') {
        if (!CLASSIFY_MODEL) return;
        await runImageJob({
          target,
          label: 'Classifying',
          modelType: CLASSIFY_MODEL.type,
          config: buildConfig(CLASSIFY_MODEL, params, ''),
          inputs: [target.src],
          modelLabel: CLASSIFY_MODEL.label,
          family: CLASSIFY_MODEL.family,
          mode: 'new',
          prompt: target.prompt || '',
          offset: 24,
        });
        return;
      }

      if (kind === 'facerestore') {
        if (!FACE_RESTORE_MODEL) return;
        await runImageJob({
          target,
          label: 'Restoring',
          modelType: FACE_RESTORE_MODEL.type,
          config: buildConfig(FACE_RESTORE_MODEL, params, ''),
          inputs: [target.src],
          modelLabel: FACE_RESTORE_MODEL.label,
          family: FACE_RESTORE_MODEL.family,
          mode: 'replace',
          prompt: target.prompt || '',
        });
        return;
      }

      if (kind === 'vectorize') {
        if (!VECTOR_MODEL) return;
        const p = payload.instruction || target.prompt || params.prompt || 'minimal vector mark in pink and purple';
        setAiBusy(true);
        setAiLabel('Vectorizing');
        patchElement(target.id, { loading: true, loadingLabel: 'Vectorizing…' } as Partial<CanvasElement>);
        try {
          const res = await runJob({
            type: VECTOR_MODEL.type,
            config: buildConfig(VECTOR_MODEL, params, p),
            apiKey,
            format: params.outputFormat,
            trackCost,
          });
          if (!res.url) throw new Error('Prodia returned no SVG output.');
          patchElement(target.id, { loading: false, loadingLabel: undefined } as Partial<CanvasElement>);
          await placeImage(
            res.url,
            { name: VECTOR_MODEL.label, prompt: p, modelType: VECTOR_MODEL.type },
            { x: target.x + target.width + target.width / 2 + 40, y: target.y + target.height / 2 },
          );
          reportAsset('done', {
            url: res.url,
            outputs: res.outputs,
            metadata: res.metadata,
            mimeType: res.mimeType,
            prompt: p,
            modelType: VECTOR_MODEL.type,
            modelLabel: VECTOR_MODEL.label,
            family: VECTOR_MODEL.family,
            price: res.price?.dollars ?? null,
          });
          toast('success', 'Vector complete');
        } catch (err) {
          patchElement(target.id, { loading: false, loadingLabel: undefined } as Partial<CanvasElement>);
          const msg = jobErrorMessage(err);
          reportAsset('error', { modelType: VECTOR_MODEL.type, modelLabel: VECTOR_MODEL.label, family: VECTOR_MODEL.family, error: msg });
          toast('error', msg);
        } finally {
          setAiBusy(false);
          setAiLabel('');
        }
        return;
      }

      // edit-replace / edit-new
      const model = getModel(payload.modelId) ?? editModels()[0];
      if (!model) return;
      if (!payload.instruction) {
        toast('info', 'Type an instruction first.');
        return;
      }
      await runImageJob({
        target,
        label: 'Editing',
        modelType: model.type,
        config: buildConfig(model, params, payload.instruction),
        inputs: [target.src],
        modelLabel: model.label,
        family: model.family,
        mode: kind === 'edit-new' ? 'new' : 'replace',
        prompt: payload.instruction,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedImage, params, runImageJob, toast, apiKey, trackCost, patchElement, placeImage, reportAsset],
  );

  /* ── mask mode ─────────────────────────────────────────────────────────── */
  const enterMaskMode = useCallback((id: string) => {
    setMaskTargetId(id);
    setMaskStrokes([]);
    setMaskMode('paint');
    setMaskPrompt('');
    setSelectedIds([id]);
    setTool('select');
  }, []);

  const exitMaskMode = useCallback(() => {
    setMaskTargetId(null);
    setMaskStrokes([]);
    isPaintingRef.current = false;
  }, []);

  const localPointForMask = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current;
    const target = elements.find((e) => e.id === maskTargetId);
    if (!stage || !target) return null;
    const ptr = stage.getPointerPosition();
    if (!ptr) return null;
    // stage space
    const sp = screenToStage(ptr, vp);
    // rotate into element-local space about its origin
    const r = (-target.rotation * Math.PI) / 180;
    const dx = sp.x - target.x;
    const dy = sp.y - target.y;
    return { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) };
  }, [elements, maskTargetId, vp]);

  const beginStroke = useCallback(() => {
    const p = localPointForMask();
    if (!p) return;
    isPaintingRef.current = true;
    setMaskStrokes((s) => [...s, { points: [p.x, p.y], size: maskBrush, paint: maskMode === 'paint' }]);
  }, [localPointForMask, maskBrush, maskMode]);

  const onStageMouseMove = useCallback(() => {
    if (!inMaskMode || !isPaintingRef.current) return;
    const p = localPointForMask();
    if (!p) return;
    setMaskStrokes((s) => {
      if (!s.length) return s;
      const last = s[s.length - 1];
      const next = { ...last, points: [...last.points, p.x, p.y] };
      return [...s.slice(0, -1), next];
    });
  }, [inMaskMode, localPointForMask]);

  const endStroke = useCallback(() => {
    isPaintingRef.current = false;
  }, []);

  const runInpaint = useCallback(async () => {
    const target = elements.find((e) => e.id === maskTargetId);
    if (!target || !isImage(target)) return;
    const model = getModel(maskModelId) ?? INPAINT_MODELS[0];
    if (!model) return;
    if (!maskPrompt.trim()) {
      toast('info', 'Describe what should fill the mask.');
      return;
    }
    const hasPaint = maskStrokes.some((s) => s.paint && s.points.length >= 2);
    if (!hasPaint) {
      toast('info', 'Paint a region first.');
      return;
    }
    setMaskBusy(true);
    patchElement(target.id, { loading: true, loadingLabel: 'Inpainting…' } as Partial<CanvasElement>);
    try {
      const maskUrl = await buildMaskDataUrl({
        src: target.src,
        elementWidth: target.width,
        elementHeight: target.height,
        strokes: maskStrokes,
      });
      if (!maskUrl) {
        toast('error', 'Could not build the mask.');
        patchElement(target.id, { loading: false, loadingLabel: undefined } as Partial<CanvasElement>);
        setMaskBusy(false);
        return;
      }
      const res = await runJob({
        type: model.type,
        config: buildConfig(model, params, maskPrompt.trim()),
        inputs: [target.src, maskUrl],
        apiKey,
        format: params.outputFormat,
        trackCost,
      });
      if (!res.url) throw new Error('Prodia returned metadata without an image.');
      patchElement(target.id, {
        src: res.url,
        loading: false,
        loadingLabel: undefined,
        prompt: maskPrompt.trim(),
        modelType: model.type,
      } as Partial<CanvasElement>);
      reportAsset('done', {
        url: res.url,
        outputs: res.outputs,
        metadata: res.metadata,
        mimeType: res.mimeType,
        prompt: maskPrompt.trim(),
        modelType: model.type,
        modelLabel: model.label,
        family: model.family,
        price: res.price?.dollars ?? null,
      });
      toast('success', 'Inpaint complete');
      exitMaskMode();
    } catch (err) {
      patchElement(target.id, { loading: false, loadingLabel: undefined } as Partial<CanvasElement>);
      toast('error', jobErrorMessage(err));
    } finally {
      setMaskBusy(false);
    }
  }, [
    elements,
    maskTargetId,
    maskModelId,
    maskPrompt,
    maskStrokes,
    params,
    apiKey,
    trackCost,
    patchElement,
    reportAsset,
    toast,
    exitMaskMode,
  ]);

  /* ── z-order ───────────────────────────────────────────────────────────── */
  const reorder = useCallback((id: string, to: 'front' | 'back' | 'forward' | 'backward') => {
    setElements((els) => {
      const idx = els.findIndex((e) => e.id === id);
      if (idx < 0) return els;
      const next = [...els];
      const [item] = next.splice(idx, 1);
      if (to === 'front') next.push(item);
      else if (to === 'back') next.unshift(item);
      else if (to === 'forward') next.splice(Math.min(next.length, idx + 1), 0, item);
      else next.splice(Math.max(0, idx - 1), 0, item);
      return next;
    });
  }, []);

  const duplicateSelected = useCallback(() => {
    setElements((els) => {
      const dups: CanvasElement[] = [];
      const newIds: string[] = [];
      const out = [...els];
      for (const e of els) {
        if (selectedIds.includes(e.id)) {
          const copy = { ...e, id: uid(e.type), x: e.x + 28, y: e.y + 28 } as CanvasElement;
          dups.push(copy);
          newIds.push(copy.id);
        }
      }
      if (newIds.length) setSelectedIds(newIds);
      return [...out, ...dups];
    });
  }, [selectedIds]);

  /* ── keyboard ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!inMaskMode) setSelectedIds(elements.map((el) => el.id));
        return;
      }
      if (e.key === 'Escape') {
        if (inMaskMode) exitMaskMode();
        else if (showGenerate) setShowGenerate(false);
        else {
          setSelectedIds([]);
          setEditingTextId(null);
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inMaskMode && selectedIds.length) {
        e.preventDefault();
        removeElements(selectedIds);
        return;
      }
      // tool hotkeys
      if (!meta && !inMaskMode) {
        const map: Record<string, ToolId> = {
          v: 'select',
          h: 'hand',
          u: 'image',
          t: 'text',
          r: 'rect',
          o: 'ellipse',
          g: 'generate',
        };
        const t = map[e.key.toLowerCase()];
        if (t) {
          handleTool(t);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, selectedIds, inMaskMode, showGenerate, duplicateSelected, removeElements, exitMaskMode]);

  /* ── tool selection ────────────────────────────────────────────────────── */
  const handleTool = useCallback(
    (t: ToolId) => {
      if (inMaskMode && t !== 'select') return;
      if (t === 'image') {
        fileInputRef.current?.click();
        setTool('select');
        return;
      }
      if (t === 'generate') {
        setShowGenerate((v) => !v);
        setTool('select');
        return;
      }
      setTool(t);
      setShowGenerate(false);
    },
    [inMaskMode],
  );

  /* ── export ────────────────────────────────────────────────────────────── */
  const exportBoard = useCallback(
    (selectionOnly: boolean) => {
      const stage = stageRef.current;
      if (!stage) return;
      // hide transformer for clean export
      const tr = trRef.current;
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();

      const targets = selectionOnly
        ? elements.filter((e) => selectedIds.includes(e.id) && !e.hidden)
        : elements.filter((e) => !e.hidden);
      const box = elementsAABB(targets);

      let dataUrl: string;
      if (box && targets.length) {
        const pad = 0;
        dataUrl = stage.toDataURL({
          pixelRatio: 2,
          x: box.x * vp.scale + vp.x - pad,
          y: box.y * vp.scale + vp.y - pad,
          width: box.width * vp.scale + pad * 2,
          height: box.height * vp.scale + pad * 2,
        });
      } else {
        dataUrl = stage.toDataURL({ pixelRatio: 2 });
      }

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `pixio-canvas-${Date.now()}.png`;
      a.click();

      // restore transformer selection
      window.setTimeout(() => {
        const nodes = selectedIds.map((id) => nodeRefs.current[id]).filter((n): n is Konva.Node => !!n);
        tr?.nodes(nodes);
        tr?.getLayer()?.batchDraw();
      }, 30);
      toast('success', selectionOnly ? 'Exported selection' : 'Exported board');
    },
    [elements, selectedIds, vp, toast],
  );

  /* ── grid lines (computed for the visible viewport) ────────────────────── */
  const grid = useMemo(() => buildGrid(vp, size.width, size.height), [vp, size.width, size.height]);

  /* ── contextual AI popover anchor (screen px) ──────────────────────────── */
  const aiAnchor = useMemo(() => {
    if (!selectedImage || inMaskMode || editingTextId) return null;
    // top-center of the element's rotated bounding box, in screen space
    const corners = elementCorners(selectedImage).map((c) => stageToScreen(c, vp));
    const minX = Math.min(...corners.map((c) => c.x));
    const maxX = Math.max(...corners.map((c) => c.x));
    const minY = Math.min(...corners.map((c) => c.y));
    return { x: (minX + maxX) / 2, y: minY };
  }, [selectedImage, vp, inMaskMode, editingTextId]);

  /* ── inline text editing overlay position ──────────────────────────────── */
  const editingText = editingTextId ? elements.find((e) => e.id === editingTextId) : null;

  /* ── cursor ────────────────────────────────────────────────────────────── */
  const cursor = inMaskMode
    ? 'crosshair'
    : tool === 'hand'
    ? 'grab'
    : tool === 'text' || tool === 'rect' || tool === 'ellipse'
    ? 'crosshair'
    : 'default';

  const zoomPct = Math.round(vp.scale * 100);

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <div className="root" data-theme={theme}>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          onPickFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />

      {/* top toolbar */}
      <header className="topbar">
        <div className="brand">
          <span className="logo" />
          <span className="bname">Canvas</span>
        </div>

        <div className="tcenter">
          <div className="zoomwrap">
            <IconButton title="Zoom out" size={32} onClick={() => zoomBy(0.85)}>
              <Minus size={15} />
            </IconButton>
            <span className="zpct">{zoomPct}%</span>
            <IconButton title="Zoom in" size={32} onClick={() => zoomBy(1.18)}>
              <Plus size={15} />
            </IconButton>
            <IconButton title="Fit to content" size={32} onClick={() => fitToContent()}>
              <Maximize size={15} />
            </IconButton>
          </div>
        </div>

        <div className="tright">
          <button type="button" className="tbtn" onClick={() => exportBoard(true)} disabled={!selectedIds.length}>
            <Download size={15} /> Selection
          </button>
          <button type="button" className="tbtn primary" onClick={() => exportBoard(false)} disabled={!elements.length}>
            <Download size={15} /> Export PNG
          </button>
        </div>
      </header>

      <div className="body">
        {/* left tool rail */}
        <nav className="rail">
          {TOOLS.map((t) => (
            <div key={t.id} className="railitem">
              <IconButton
                title={`${t.label} (${t.key})`}
                active={
                  (t.id === 'generate' && showGenerate) ||
                  (t.id !== 'generate' && t.id !== 'image' && tool === t.id)
                }
                disabled={inMaskMode && t.id !== 'select'}
                size={44}
                onClick={() => handleTool(t.id)}
              >
                {t.icon}
              </IconButton>
            </div>
          ))}
          <div className="raildiv" />
          <div className="railitem">
            <IconButton title="Duplicate (⌘D)" size={44} disabled={!selectedIds.length || inMaskMode} onClick={duplicateSelected}>
              <Copy size={18} />
            </IconButton>
          </div>
          <div className="railitem">
            <IconButton
              title="Delete (⌫)"
              size={44}
              danger
              disabled={!selectedIds.length || inMaskMode}
              onClick={() => removeElements(selectedIds)}
            >
              <Trash2 size={18} />
            </IconButton>
          </div>

          {/* generate flyout */}
          {showGenerate && (
            <div className="flyout">
              <GeneratePanel
                prompt={genPrompt}
                setPrompt={setGenPrompt}
                busy={genBusy}
                onClose={() => setShowGenerate(false)}
                onGenerate={handleGenerate}
              />
            </div>
          )}
        </nav>

        {/* stage */}
        <div
          className="stagewrap"
          ref={containerRef}
          style={{ cursor }}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            scaleX={vp.scale}
            scaleY={vp.scale}
            x={vp.x}
            y={vp.y}
            draggable={tool === 'hand' && !inMaskMode}
            onWheel={onWheel}
            onMouseDown={onStageMouseDown}
            onMouseMove={onStageMouseMove}
            onMouseUp={endStroke}
            onTouchStart={onStageMouseDown as any}
            onTouchMove={onStageMouseMove as any}
            onTouchEnd={endStroke}
            onDragEnd={(e) => {
              // stage pan committed
              if (e.target === stageRef.current) {
                setVp((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
              }
            }}
          >
            {/* grid layer (non-interactive) */}
            <Layer listening={false}>
              {grid.vertical.map((x, i) => (
                <Line key={`v${i}`} points={[x, grid.top, x, grid.bottom]} stroke={gridStroke} strokeWidth={1 / vp.scale} />
              ))}
              {grid.horizontal.map((y, i) => (
                <Line key={`h${i}`} points={[grid.left, y, grid.right, y]} stroke={gridStroke} strokeWidth={1 / vp.scale} />
              ))}
            </Layer>

            {/* content layer */}
            <Layer>
              {elements.map((el) => (
                <CanvasNode
                  key={el.id}
                  el={el}
                  selected={selectedIds.includes(el.id)}
                  draggable={tool === 'select' && !inMaskMode && !el.locked}
                  onSelect={onNodeSelect(el.id)}
                  onChange={(patch) => patchElement(el.id, patch)}
                  registerRef={registerRef}
                  onDblClick={el.type === 'text' ? () => setEditingTextId(el.id) : undefined}
                  maskMode={inMaskMode && el.id === maskTargetId}
                  maskStrokes={el.id === maskTargetId ? maskStrokes : []}
                  accentColor={accentColor}
                />
              ))}

              {/* selection transformer */}
              {!inMaskMode && !editingTextId && (
                <Transformer
                  ref={trRef}
                  rotateEnabled
                  borderStroke={accentColor}
                  borderStrokeWidth={1.5}
                  anchorStroke={accentColor}
                  anchorFill="#fff"
                  anchorSize={9}
                  anchorCornerRadius={5}
                  rotateAnchorOffset={24}
                  borderDash={[4, 4]}
                  padding={2}
                  ignoreStroke
                  flipEnabled={false}
                  boundBoxFunc={(oldBox, newBox) => (newBox.width < 12 || newBox.height < 12 ? oldBox : newBox)}
                />
              )}
            </Layer>
          </Stage>

          {/* contextual AI popover */}
          {aiAnchor && selectedImage && (
            <AIPopover
              screen={aiAnchor}
              containerWidth={size.width}
              state={{ busy: aiBusy, label: aiLabel }}
              onAction={onAIAction}
            />
          )}

          {/* inline text editor */}
          {editingText && editingText.type === 'text' && (
            <InlineTextEditor
              element={editingText}
              vp={vp}
              onCommit={(text) => {
                patchElement(editingText.id, { text } as Partial<CanvasElement>);
                setEditingTextId(null);
              }}
              onCancel={() => setEditingTextId(null)}
            />
          )}

          {/* mask toolbar */}
          {inMaskMode && (
            <MaskToolbar
              brushSize={maskBrush}
              setBrushSize={setMaskBrush}
              mode={maskMode}
              setMode={setMaskMode}
              prompt={maskPrompt}
              setPrompt={setMaskPrompt}
              modelId={maskModelId}
              setModelId={setMaskModelId}
              hasStrokes={maskStrokes.some((s) => s.paint && s.points.length >= 2)}
              busy={maskBusy}
              onClear={() => setMaskStrokes([])}
              onRun={runInpaint}
              onExit={exitMaskMode}
            />
          )}

          {/* empty-state hint */}
          {!elements.length && !showGenerate && (
            <div className="empty">
              <div className="ecard">
                <Sparkles size={26} />
                <h3>Start your canvas</h3>
                <p>
                  Upload or generate an image, then click it to edit with AI — instruction edits, background removal,
                  upscaling, and brush-mask inpainting.
                </p>
                <div className="ebtns">
                  <button type="button" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={15} /> Upload
                  </button>
                  <button type="button" className="solid" onClick={() => setShowGenerate(true)}>
                    <Wand2 size={15} /> Generate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* toasts */}
          <div className="toasts">
            {toasts.map((t) => (
              <div key={t.id} className={`toast ${t.kind}`}>
                {t.text}
              </div>
            ))}
          </div>
        </div>

        {/* right inspector */}
        <PropertiesPanel
          elements={elements}
          selectedIds={selectedIds}
          onSelect={selectOne}
          onPatch={patchElement}
          onDelete={(id) => removeElements([id])}
          onReorder={reorder}
          onToggleHidden={(id) => {
            const el = elements.find((e) => e.id === id);
            if (el) patchElement(id, { hidden: !el.hidden } as Partial<CanvasElement>);
          }}
          onToggleLock={(id) => {
            const el = elements.find((e) => e.id === id);
            if (el) patchElement(id, { locked: !el.locked } as Partial<CanvasElement>);
          }}
        />
      </div>

      {/* ── styles ──────────────────────────────────────────────────────── */}
      <style jsx>{`
        .root {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          min-height: 480px;
          background: ${TOKENS.bg};
          color: ${TOKENS.text};
          font-family: ${TOKENS.font};
          overflow: hidden;
          border-radius: ${TOKENS.radius}px;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 16px;
          flex: 0 0 auto;
          background: linear-gradient(180deg, ${TOKENS.panel}, color-mix(in srgb, var(--pink) 8%, var(--bg)));
          border-bottom: 1px solid ${TOKENS.line};
          z-index: 20;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 200px;
        }
        .logo {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: ${TOKENS.accent};
          box-shadow: 0 4px 14px color-mix(in srgb, var(--pink) 40%, transparent);
        }
        .bname {
          font-weight: 800;
          font-size: 15px;
          letter-spacing: -0.01em;
        }
        .tcenter {
          flex: 1 1 auto;
          display: flex;
          justify-content: center;
        }
        .zoomwrap {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--ghost);
          border: 1px solid ${TOKENS.line};
          border-radius: 12px;
          padding: 4px 6px;
        }
        .zpct {
          min-width: 50px;
          text-align: center;
          font-size: 12.5px;
          font-weight: 700;
          color: ${TOKENS.text};
          font-variant-numeric: tabular-nums;
        }
        .tright {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 270px;
          justify-content: flex-end;
        }
        .tbtn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 13px;
          border-radius: ${TOKENS.radiusSm}px;
          border: 1px solid ${TOKENS.line};
          background: var(--ghost);
          color: ${TOKENS.text};
          font-family: ${TOKENS.font};
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.14s ease;
        }
        .tbtn:hover:not(:disabled) {
          border-color: ${TOKENS.lineStrong};
          background: color-mix(in srgb, var(--pink) 14%, transparent);
          transform: translateY(-1px);
        }
        .tbtn.primary {
          background: ${TOKENS.accent};
          border-color: transparent;
          color: #fff;
          box-shadow: 0 8px 20px color-mix(in srgb, var(--pink) 28%, transparent);
        }
        .tbtn.primary:hover:not(:disabled) {
          filter: brightness(1.06);
        }
        .tbtn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .body {
          flex: 1 1 auto;
          display: flex;
          min-height: 0;
        }
        .rail {
          position: relative;
          flex: 0 0 auto;
          width: 64px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 14px 0;
          background: linear-gradient(180deg, ${TOKENS.panel}, ${TOKENS.bg});
          border-right: 1px solid ${TOKENS.line};
          z-index: 18;
        }
        .railitem {
          display: flex;
        }
        .raildiv {
          width: 28px;
          height: 1px;
          background: ${TOKENS.line};
          margin: 4px 0;
        }
        .flyout {
          position: absolute;
          left: 74px;
          top: 60px;
          z-index: 40;
        }
        .stagewrap {
          position: relative;
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          background: radial-gradient(
              1200px 700px at 50% -10%,
              color-mix(in srgb, var(--pink) 10%, transparent),
              transparent 60%
            ),
            ${TOKENS.bg};
        }
        .empty {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .ecard {
          pointer-events: auto;
          width: 380px;
          text-align: center;
          padding: 30px 28px;
          border-radius: ${TOKENS.radius}px;
          background: ${TOKENS.panel};
          border: 1px solid ${TOKENS.line};
          backdrop-filter: blur(14px);
          box-shadow: ${TOKENS.shadow};
        }
        .ecard :global(svg) {
          color: ${TOKENS.pink};
        }
        .ecard h3 {
          margin: 12px 0 8px;
          font-size: 18px;
          font-weight: 800;
        }
        .ecard p {
          margin: 0 0 18px;
          font-size: 13px;
          line-height: 1.55;
          color: ${TOKENS.muted};
        }
        .ebtns {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .ebtns button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          border-radius: ${TOKENS.radiusSm}px;
          border: 1px solid ${TOKENS.line};
          background: var(--ghost);
          color: ${TOKENS.text};
          font-family: ${TOKENS.font};
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.14s ease;
        }
        .ebtns button:hover {
          transform: translateY(-1px);
          border-color: ${TOKENS.lineStrong};
        }
        .ebtns button.solid {
          background: ${TOKENS.accent};
          border-color: transparent;
          color: #fff;
          box-shadow: 0 8px 20px color-mix(in srgb, var(--pink) 30%, transparent);
        }
        .ebtns button :global(svg) {
          color: inherit;
        }
        .toasts {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          z-index: 70;
          pointer-events: none;
        }
        .toast {
          padding: 9px 16px;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 600;
          color: ${TOKENS.text};
          background: ${TOKENS.panel};
          border: 1px solid ${TOKENS.lineStrong};
          box-shadow: ${TOKENS.shadow};
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          animation: toastin 0.22s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes toastin {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
        }
        .toast.error {
          border-color: ${TOKENS.danger};
          background: rgba(251, 113, 133, 0.16);
        }
        .toast.success {
          border-color: ${TOKENS.mint};
          background: rgba(52, 211, 153, 0.14);
        }

        /* responsive */
        @media (max-width: 900px) {
          .brand { width: auto; }
          .bname { display: none; }
        }
        @media (max-width: 680px) {
          .topbar { height: 50px; padding: 0 10px; }
          .rail { width: 50px; padding: 10px 0; gap: 6px; }
          .flyout { left: 60px; top: 56px; right: 8px; }
          .tcenter { gap: 4px; }
        }
        @media (max-width: 520px) {
          .tright .tbtn:not(.primary) { font-size: 0; padding: 8px; }
          .tright .tbtn svg { width: 16px; height: 16px; }
        }
      `}</style>
    </div>
  );
};

/* ── inline text editor (HTML textarea overlaid on the stage) ─────────────── */
const InlineTextEditor: React.FC<{
  element: CanvasElement & { type: 'text' };
  vp: Viewport;
  onCommit: (text: string) => void;
  onCancel: () => void;
}> = ({ element, vp, onCommit, onCancel }) => {
  const [val, setVal] = useState(element.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  const screen = stageToScreen({ x: element.x, y: element.y }, vp);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  return (
    <textarea
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommit(val);
        }
      }}
      style={{
        position: 'absolute',
        left: screen.x,
        top: screen.y,
        width: element.width * vp.scale,
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: 'top left',
        fontSize: element.fontSize * vp.scale,
        fontFamily: element.fontFamily,
        fontWeight: element.fontStyle.includes('bold') ? 700 : 400,
        fontStyle: element.fontStyle.includes('italic') ? 'italic' : 'normal',
        lineHeight: element.lineHeight,
        letterSpacing: element.letterSpacing,
        textAlign: element.align,
        color: element.fill,
        background: 'color-mix(in srgb, var(--panel) 90%, transparent)',
        border: `1px solid ${TOKENS.lineStrong}`,
        borderRadius: 8,
        outline: 'none',
        padding: 0,
        margin: 0,
        resize: 'none',
        overflow: 'hidden',
        zIndex: 45,
        boxShadow: '0 0 0 3px color-mix(in srgb, var(--pink) 18%, transparent)',
      }}
    />
  );
};

/* ── grid generation ──────────────────────────────────────────────────────── */
function buildGrid(vp: Viewport, w: number, h: number) {
  // choose a grid step that stays visually ~40-90px on screen
  let step = 80;
  const screenStep = () => step * vp.scale;
  while (screenStep() < 36) step *= 2;
  while (screenStep() > 120) step /= 2;

  const left = (0 - vp.x) / vp.scale;
  const top = (0 - vp.y) / vp.scale;
  const right = (w - vp.x) / vp.scale;
  const bottom = (h - vp.y) / vp.scale;

  const vertical: number[] = [];
  const horizontal: number[] = [];
  const startX = Math.floor(left / step) * step;
  const startY = Math.floor(top / step) * step;
  for (let x = startX; x <= right; x += step) vertical.push(x);
  for (let y = startY; y <= bottom; y += step) horizontal.push(y);
  // safety cap to avoid runaway loops at extreme zoom-out
  return {
    vertical: vertical.slice(0, 400),
    horizontal: horizontal.slice(0, 400),
    left,
    top,
    right,
    bottom,
  };
}

export default CanvasStudio;
