// ──────────────────────────────────────────────────────────────────────────
// Pixio · Studio generation hook
// Runs the currently-selected models for the current prompt and streams the
// results into the global asset gallery. Used by the classic studio surface.
// ──────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { getModel, isPromptAllowed } from '../prodia/catalog';
import { buildConfig } from '../prodia/config';
import { jobErrorMessage, runJob } from '../prodia/client';
import { useStudio } from './store';
import type { StudioAsset } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

export function useGenerate() {
  const params = useStudio((s) => s.params);
  const selectedTypes = useStudio((s) => s.selectedTypes);
  const apiKey = useStudio((s) => s.apiKey);
  const trackCost = useStudio((s) => s.trackCost);
  const addAsset = useStudio((s) => s.addAsset);
  const updateAsset = useStudio((s) => s.updateAsset);
  const pushPrompt = useStudio((s) => s.pushPrompt);
  const noteModelsUsed = useStudio((s) => s.noteModelsUsed);

  /** Validate + launch. Returns an error string, or null if it started. */
  return useCallback((): string | null => {
    const prompt = params.prompt.trim();
    if (!apiKey) return 'Add your Prodia API key to generate.';
    if (!prompt) return 'Write a prompt to continue.';
    if (!isPromptAllowed(prompt) || !isPromptAllowed(params.negativePrompt)) {
      return 'Prompt contains prohibited content.';
    }
    if (!selectedTypes.length) return 'Select at least one model.';

    pushPrompt(prompt);
    noteModelsUsed(selectedTypes);

    selectedTypes.forEach((type) => {
      const model = getModel(type);
      if (!model) return;
      const id = uid();
      const asset: StudioAsset = {
        id,
        status: 'running',
        prompt,
        modelType: model.type,
        modelLabel: model.label,
        family: model.family,
        source: 'studio',
        isVideo: model.medium === 'video',
        createdAt: Date.now(),
      };
      addAsset(asset);

      runJob({
        type: model.type,
        config: buildConfig(model, params),
        format: params.outputFormat,
        trackCost,
        apiKey: apiKey || undefined,
      })
        .then((res) =>
          updateAsset(id, {
            status: 'done',
            url: res.url ?? undefined,
            isVideo: res.video,
            outputs: res.outputs,
            metadata: res.metadata,
            mimeType: res.mimeType,
            price: res.price?.dollars ?? null,
          }),
        )
        .catch((err) => updateAsset(id, { status: 'error', error: jobErrorMessage(err) }));
    });

    return null;
  }, [params, selectedTypes, apiKey, trackCost, addAsset, updateAsset, pushPrompt, noteModelsUsed]);
}
