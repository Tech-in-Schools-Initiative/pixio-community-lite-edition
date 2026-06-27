// ──────────────────────────────────────────────────────────────────────────
// Pixio · Prompt assistant
// Rewrites a prompt into three directed variants. Uses OpenAI when a key is
// present, otherwise returns strong local heuristics so the feature always works.
// ──────────────────────────────────────────────────────────────────────────

import type { NextApiRequest, NextApiResponse } from 'next';

type PromptVariant = { title: string; prompt: string; rationale: string };

const fallbackVariants = (prompt: string, medium: string): PromptVariant[] => {
  const base = prompt.trim() || 'A striking, high-end AI studio scene';
  const finish =
    medium === 'video'
      ? 'smooth camera motion, coherent temporal detail, cinematic pacing'
      : 'precise composition, crisp detail, balanced studio lighting, editorial finish';
  return [
    { title: 'Cinematic', prompt: `${base}, cinematic framing, volumetric light, tactile materials, ${finish}, natural color grade`, rationale: 'Adds lens, light and finish cues without changing the subject.' },
    { title: 'Editorial', prompt: `${base}, magazine-grade product photography, clean negative space, premium surfaces, sharp focal point, ${finish}`, rationale: 'Tightens it into a usable launch/marketing image.' },
    { title: 'Bold', prompt: `${base}, daring art direction, dramatic contrast, saturated accent palette, confident silhouette, ${finish}`, rationale: 'Pushes a more distinctive, scroll-stopping look.' },
  ];
};

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['variants'],
  properties: {
    variants: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'prompt', 'rationale'],
        properties: { title: { type: 'string' }, prompt: { type: 'string' }, rationale: { type: 'string' } },
      },
    },
  },
};

const outputText = (data: any): string => {
  if (typeof data.output_text === 'string') return data.output_text;
  return (data.output ?? [])
    .flatMap((item: any) => item.content ?? [])
    .map((part: any) => part.text)
    .filter(Boolean)
    .join('\n');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { prompt = '', medium = 'image', surface = 'studio' } = req.body ?? {};
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.includes('openai api')) {
    return res.status(200).json({ source: 'local', variants: fallbackVariants(prompt, medium) });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        input: [
          { role: 'system', content: 'You rewrite generative-media prompts for a Prodia studio. Return exactly three variants. Preserve intent, add concrete visual direction, avoid unsafe sexual content.' },
          { role: 'user', content: JSON.stringify({ prompt, medium, surface }) },
        ],
        text: { format: { type: 'json_schema', name: 'pixio_prompt_variants', strict: true, schema } },
      }),
    });
    if (!response.ok) {
      return res.status(200).json({ source: 'local', warning: await response.text(), variants: fallbackVariants(prompt, medium) });
    }
    const data = await response.json();
    const parsed = JSON.parse(outputText(data));
    return res.status(200).json({ source: 'openai', variants: parsed.variants });
  } catch (error: any) {
    return res.status(200).json({ source: 'local', warning: error.message, variants: fallbackVariants(prompt, medium) });
  }
}
