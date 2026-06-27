// ──────────────────────────────────────────────────────────────────────────
// Pixio · Vision → prompt
// Turns an image into a ready-to-use generation prompt. Uses OpenAI vision when
// a key is present; otherwise returns a graceful placeholder.
// ──────────────────────────────────────────────────────────────────────────

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const intentHint = (intent: string) => {
  if (intent === 'edit') return 'Describe it so it can be edited with an instruction model.';
  if (intent === 'variation') return 'Describe it so a model can produce close variations.';
  return 'Describe it as a single vivid prompt that would recreate the image.';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { image, intent = 'recreate' } = req.body ?? {};
  if (!image) return res.status(400).json({ message: 'Missing image.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('openai api')) {
    return res.status(200).json({
      source: 'local',
      prompt: 'A richly detailed scene, cinematic lighting, sharp focus, high dynamic range, professional color grade',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.5',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: `Write one concise, comma-separated image generation prompt (max 60 words). ${intentHint(intent)} Output only the prompt.` },
              { type: 'input_image', image_url: image },
            ],
          },
        ],
      }),
    });
    if (!response.ok) {
      return res.status(200).json({ source: 'local', warning: await response.text(), prompt: 'A detailed, cinematic scene, sharp focus, dramatic lighting' });
    }
    const data = await response.json();
    const text =
      data.output_text ??
      (data.output ?? []).flatMap((i: any) => i.content ?? []).map((p: any) => p.text).filter(Boolean).join(' ');
    return res.status(200).json({ source: 'openai', prompt: (text || '').trim() });
  } catch (error: any) {
    return res.status(200).json({ source: 'local', warning: error.message, prompt: 'A detailed, cinematic scene, sharp focus, dramatic lighting' });
  }
}
