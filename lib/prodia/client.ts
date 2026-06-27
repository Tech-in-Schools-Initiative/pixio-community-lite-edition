// ──────────────────────────────────────────────────────────────────────────
// Pixio · Browser client
// Thin wrappers around the API routes. Everything image/video flows through
// runJob(); AI helpers degrade gracefully when no model key is configured.
// ──────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import type { RunJobRequest, RunJobResponse } from './types';

const KEY_STORAGE = 'PIXIO_API_KEY';

export const loadApiKey = (): string =>
  (typeof window !== 'undefined' && localStorage.getItem(KEY_STORAGE)) || '';

export const saveApiKey = (key: string) => {
  if (typeof window !== 'undefined') localStorage.setItem(KEY_STORAGE, key);
};

/** Run a single Prodia job and return its decoded output. */
export async function runJob(req: RunJobRequest): Promise<RunJobResponse> {
  const apiKey = req.apiKey ?? loadApiKey();
  const { data } = await axios.post('/api/job', { ...req, apiKey: apiKey || undefined });
  if (!data?.url && !data?.metadata) throw new Error(data?.message ?? 'Prodia returned no output.');
  return data as RunJobResponse;
}

export interface PromptVariant {
  title: string;
  prompt: string;
  rationale: string;
}

/** Ask the assistant to rewrite/expand a prompt into 3 variants. */
export async function assistPrompt(prompt: string, medium: string, surface = 'studio'): Promise<PromptVariant[]> {
  const { data } = await axios.post('/api/assist', { prompt, medium, surface });
  return data?.variants ?? [];
}

/** Describe an image into a ready-to-use generation prompt. */
export async function describeImage(image: string, intent = 'recreate'): Promise<string> {
  const { data } = await axios.post('/api/vision', { image, intent });
  return data?.prompt ?? '';
}

/** Friendly error string from any thrown axios/runtime error. */
export function jobErrorMessage(err: any): string {
  return (
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    err?.message ??
    'Generation failed'
  );
}
