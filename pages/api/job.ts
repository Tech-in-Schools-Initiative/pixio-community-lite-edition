// ──────────────────────────────────────────────────────────────────────────
// Pixio · Unified Prodia job endpoint
// Speaks the v2/job protocol for both pure-JSON jobs (txt2img/txt2vid) and
// multipart jobs that carry binary `input` images (img2img/edit/inpaint/
// upscale/removebg/img2vid). Optional exact cost tracking via ?price=true.
// ──────────────────────────────────────────────────────────────────────────

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: { sizeLimit: '40mb' },
    responseLimit: '40mb',
  },
};

const VIDEO_TOKENS = ['txt2vid', 'img2vid', 'vid2vid', 'aud2vid', 'segment.video'];
const isVideoType = (type: string) => VIDEO_TOKENS.some((token) => type.includes(token));
const isVectorType = (type: string) => type.includes('txt2vec');
const isClassificationType = (type: string) => type.includes('img2label');
const isMultipartOutputType = (type: string) =>
  type.includes('segment') ||
  type.includes('img2label.v2') ||
  type.includes('remove-background') ||
  type.includes('mask-background') ||
  type.includes('birefnet');

const imageMime = (format?: string) => {
  if (format === 'png') return 'image/png';
  if (format === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const extFromMime = (mime: string) => {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('flac')) return 'flac';
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('json')) return 'json';
  return 'jpg';
};

/** Turn a data URL or remote URL into bytes + mime. */
async function toBytes(src: string): Promise<{ buffer: Buffer; mime: string }> {
  const dataMatch = /^data:([^;,]+);base64,([\s\S]*)$/.exec(src);
  if (dataMatch) {
    return { mime: dataMatch[1], buffer: Buffer.from(dataMatch[2], 'base64') };
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Could not fetch input image (${res.status}).`);
  const mime = res.headers.get('content-type') || 'image/png';
  return { mime, buffer: Buffer.from(await res.arrayBuffer()) };
}

function dataUrl(mime: string, buffer: Buffer) {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, config: jobConfig = {}, inputs = [], apiKey: bodyKey, format, trackCost } = req.body ?? {};
  const apiKey = bodyKey || process.env.PRODIA_KEY;

  if (!apiKey) return res.status(401).json({ message: 'No Prodia API key. Add yours in the app.' });
  if (!type) return res.status(400).json({ message: 'Missing job type.' });

  const video = isVideoType(type);
  const acceptMime = video
    ? 'video/mp4'
    : isVectorType(type)
      ? 'image/svg+xml'
      : isClassificationType(type)
        ? 'application/json'
        : imageMime(format);
  const hasInputs = Array.isArray(inputs) && inputs.length > 0;
  const wantMultipart = Boolean(trackCost) || isMultipartOutputType(String(type));
  const acceptHeader = wantMultipart ? 'multipart/form-data' : acceptMime;
  const url = `https://inference.prodia.com/v2/job${trackCost ? '?price=true' : ''}`;

  try {
    let prodiaRes: Response;

    if (hasInputs) {
      // Multipart request: one `job` part (job.json) + one `input` part per image.
      const form = new FormData();
      const files = await Promise.all(
        inputs.map(async (src: string, i: number) => {
          const { buffer, mime } = await toBytes(src);
          return { buffer, mime, filename: `input-${i}.${extFromMime(mime)}` };
        }),
      );
      const configWithInputs = { ...jobConfig };
      if (String(type).includes('aud2vid') && files[0]) configWithInputs.audio = files[0].filename;
      if ((String(type).includes('vid2vid') || String(type).includes('segment.video')) && files[0]) {
        configWithInputs.video = files[0].filename;
      }
      form.append(
        'job',
        new Blob([JSON.stringify({ type, config: configWithInputs })], { type: 'application/json' }),
        'job.json',
      );
      for (const file of files) {
        form.append('input', new Blob([new Uint8Array(file.buffer)], { type: file.mime }), file.filename);
      }
      prodiaRes = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, Accept: acceptHeader },
        body: form,
      });
    } else {
      prodiaRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: acceptHeader,
        },
        body: JSON.stringify({ type, config: jobConfig }),
      });
    }

    if (!prodiaRes.ok) {
      const errText = await prodiaRes.text();
      // Prodia embeds the real reason as the last `state.history[].message`
      // (or a top-level `error`/`message`). Dig it out instead of dumping the
      // raw multipart envelope.
      let detail = '';
      const re = /"message":"((?:[^"\\]|\\.)*)"/g;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(errText))) detail = mm[1];
      if (!detail) {
        const top = /"error":"((?:[^"\\]|\\.)*)"/.exec(errText);
        detail = top ? top[1] : errText.replace(/\s+/g, ' ').slice(0, 300);
      }
      try { detail = JSON.parse(`"${detail}"`); } catch { /* leave as-is */ }
      return res.status(prodiaRes.status).json({
        message: `Prodia ${prodiaRes.status}: ${detail || 'job failed'}`,
        error: detail,
      });
    }

    const contentType = prodiaRes.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await prodiaRes.formData();
      const jobPart = formData.get('job');
      let job: any = null;
      if (typeof jobPart === 'string') job = JSON.parse(jobPart);
      else if (jobPart) job = JSON.parse(await jobPart.text());

      const outputParts = formData.getAll('output').filter((p): p is File => typeof p !== 'string');
      const decoded: string[] = [];
      let metadata: Record<string, unknown> | null = null;

      for (const part of outputParts) {
        const mime = part.type || acceptMime;
        const name = 'name' in part ? String(part.name) : '';
        const isJson = mime.includes('json') || name.endsWith('.json');
        if (isJson) {
          try {
            const parsed = JSON.parse(await part.text());
            metadata = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? ({ labels: parsed, ...parsed } as Record<string, unknown>)
              : { value: parsed };
          } catch {
            metadata = { text: await part.text() };
          }
          continue;
        }
        decoded.push(dataUrl(mime, Buffer.from(await part.arrayBuffer())));
      }

      return res.status(200).json({
        url: decoded[0] ?? null,
        maskUrl: decoded[1] ?? null,
        outputs: decoded,
        metadata,
        video,
        mimeType: outputParts.find((part) => !(part.type || '').includes('json'))?.type || acceptMime,
        price: job?.price ?? null,
        jobId: job?.id ?? null,
      });
    }

    // Raw binary response.
    if (contentType.includes('application/json')) {
      const job = await prodiaRes.json();
      return res.status(200).json({
        url: null,
        maskUrl: null,
        outputs: [],
        metadata: job?.config?.labels ? { labels: job.config.labels, ...job } : job,
        video,
        mimeType: 'application/json',
        price: job?.price ?? null,
        jobId: job?.id ?? null,
      });
    }

    const buffer = Buffer.from(await prodiaRes.arrayBuffer());
    return res.status(200).json({
      url: dataUrl(acceptMime, buffer),
      maskUrl: null,
      outputs: [dataUrl(acceptMime, buffer)],
      metadata: null,
      video,
      mimeType: acceptMime,
      price: null,
      jobId: null,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message ?? 'Job failed.' });
  }
}
