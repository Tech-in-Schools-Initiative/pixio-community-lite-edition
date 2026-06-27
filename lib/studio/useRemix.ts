// ──────────────────────────────────────────────────────────────────────────
// Pixio · Remix actions
// The verbs behind the universal remix bar — continue creating from any output:
// Vary · Upscale · Remove BG · Animate · Edit/Send to Canvas · Send to Nodes.
// ──────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { jobErrorMessage, runJob } from '../prodia/client';
import { buildConfig } from '../prodia/config';
import {
  CLASSIFY_MODELS,
  FACE_RESTORE_MODELS,
  IMG2VID_MODELS,
  SEGMENT_MODELS,
  UTILITY_MODELS,
  VECTOR_MODELS,
  VID2VID_MODELS,
  getModel,
} from '../prodia/catalog';
import type { GenerationParams, ProdiaModel } from '../prodia/types';
import { useStudio } from './store';
import type { StudioAsset } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);
const UPSCALE = UTILITY_MODELS.find((m) => m.operation === 'upscale');
const REMOVEBG = UTILITY_MODELS.find((m) => m.operation === 'removebg');
const SEGMENT = SEGMENT_MODELS[0];
const CLASSIFY = CLASSIFY_MODELS.find((m) => m.id.includes('nsfw')) ?? CLASSIFY_MODELS[0];
const FACE_RESTORE = FACE_RESTORE_MODELS[0];
const VECTORIZE = VECTOR_MODELS[0];
const ANIMATE = IMG2VID_MODELS[0];
const TRANSFORM_VIDEO = VID2VID_MODELS[0];

export function useRemix() {
  const params = useStudio((s) => s.params);
  const apiKey = useStudio((s) => s.apiKey);
  const trackCost = useStudio((s) => s.trackCost);
  const addAsset = useStudio((s) => s.addAsset);
  const updateAsset = useStudio((s) => s.updateAsset);
  const sendToCanvas = useStudio((s) => s.sendToCanvas);
  const sendToNodes = useStudio((s) => s.sendToNodes);

  const run = useCallback(
    (model: ProdiaModel, opts: { inputs?: string[]; prompt?: string; paramsOverride?: Partial<GenerationParams> }) => {
      const id = uid();
      const p = { ...params, ...opts.paramsOverride };
      addAsset({
        id, status: 'running', prompt: opts.prompt ?? '',
        modelType: model.type, modelLabel: model.label, family: model.family,
        source: 'studio', isVideo: model.medium === 'video', createdAt: Date.now(),
      });
      runJob({
        type: model.type,
        config: buildConfig(model, p, opts.prompt),
        inputs: opts.inputs,
        format: params.outputFormat,
        trackCost,
        apiKey: apiKey || undefined,
      })
        .then((r) => updateAsset(id, {
          status: 'done',
          url: r.url ?? undefined,
          isVideo: r.video,
          outputs: r.outputs,
          metadata: r.metadata,
          mimeType: r.mimeType,
          price: r.price?.dollars ?? null,
        }))
        .catch((e) => updateAsset(id, { status: 'error', error: jobErrorMessage(e) }));
    },
    [params, apiKey, trackCost, addAsset, updateAsset],
  );

  const vary = useCallback((a: StudioAsset) => {
    const m = getModel(a.modelType);
    if (!m || m.inputs > 0) return; // only re-roll generation models
    run(m, { prompt: a.prompt, paramsOverride: { seed: Math.floor(Math.random() * 1_000_000_000) } });
  }, [run]);

  const upscale = useCallback((a: StudioAsset) => { if (a.url && !a.isVideo && UPSCALE) run(UPSCALE, { inputs: [a.url] }); }, [run]);
  const removeBg = useCallback((a: StudioAsset) => { if (a.url && !a.isVideo && REMOVEBG) run(REMOVEBG, { inputs: [a.url] }); }, [run]);
  const segment = useCallback((a: StudioAsset) => { if (a.url && !a.isVideo && SEGMENT) run(SEGMENT, { inputs: [a.url], prompt: a.prompt }); }, [run]);
  const classify = useCallback((a: StudioAsset) => { if (a.url && !a.isVideo && CLASSIFY) run(CLASSIFY, { inputs: [a.url] }); }, [run]);
  const faceRestore = useCallback((a: StudioAsset) => { if (a.url && !a.isVideo && FACE_RESTORE) run(FACE_RESTORE, { inputs: [a.url], prompt: a.prompt }); }, [run]);
  const vectorize = useCallback((a: StudioAsset) => {
    const prompt = a.prompt || params.prompt || 'minimal vector mark in pink and purple';
    if (VECTORIZE) run(VECTORIZE, { prompt });
  }, [run, params.prompt]);
  const animate = useCallback((a: StudioAsset) => { if (a.url && !a.isVideo && ANIMATE) run(ANIMATE, { inputs: [a.url], prompt: a.prompt || 'subtle, natural cinematic motion' }); }, [run]);
  const transformVideo = useCallback((a: StudioAsset) => {
    if (a.url && a.isVideo && TRANSFORM_VIDEO) run(TRANSFORM_VIDEO, { inputs: [a.url], prompt: params.prompt || a.prompt || 'make it cinematic and polished' });
  }, [run, params.prompt]);

  const toCanvas = useCallback((a: StudioAsset) => { if (a.url) sendToCanvas({ url: a.url, isVideo: a.isVideo }); }, [sendToCanvas]);
  const toNodes = useCallback((a: StudioAsset) => { if (a.url && !a.isVideo) sendToNodes(a.url); }, [sendToNodes]);

  return { vary, upscale, removeBg, segment, classify, faceRestore, vectorize, animate, transformVideo, toCanvas, toNodes };
}
