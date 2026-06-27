// ──────────────────────────────────────────────────────────────────────────
// Pixio · Prodia config builder
// Projects the user's GenerationParams onto the exact config object each
// model/operation expects. Unknown fields are simply omitted.
// ──────────────────────────────────────────────────────────────────────────

import type { GenerationParams, JobConfig, ProdiaModel } from './types';

const has = (s: string) => (needle: string) => s.includes(needle);

/**
 * Build the `config` payload for a Prodia job.
 * @param model   the target model
 * @param params  current generation params
 * @param promptOverride  optional prompt (e.g. an inline edit instruction)
 */
export function buildConfig(
  model: ProdiaModel,
  params: GenerationParams,
  promptOverride?: string,
): JobConfig {
  const t = has(model.type);
  const prompt = (promptOverride ?? params.prompt).trim();
  const config: JobConfig = { ...(model.defaults ?? {}) };

  const promptCapable =
    model.operation === 'txt2img' ||
    model.operation === 'img2img' ||
    model.operation === 'edit' ||
    model.operation === 'inpaint' ||
    model.operation === 'upscale' ||
    model.operation === 'txt2vid' ||
    model.operation === 'img2vid' ||
    model.operation === 'vid2vid' ||
    model.operation === 'aud2vid' ||
    model.operation === 'vectorize' ||
    (model.operation === 'segment' && (t('sam3') || t('segment.v2')));
  if (promptCapable && prompt) config.prompt = prompt;

  const neg = params.negativePrompt.trim();
  const negativeCapable =
    model.operation === 'txt2img' ||
    model.operation === 'img2img' ||
    model.operation === 'edit' ||
    model.operation === 'inpaint' ||
    model.operation === 'txt2vid' ||
    model.operation === 'img2vid';
  if (neg && negativeCapable) config.negative_prompt = neg;

  const seed = () => {
    if (params.seed !== -1) config.seed = params.seed;
  };

  switch (model.operation) {
    case 'txt2img': {
      if (model.family === 'Stable Diffusion') {
        config.steps = params.steps;
        config.guidance = params.guidance;
        seed();
        if (t('sdxl')) {
          config.width = params.width;
          config.height = params.height;
          if (params.style) config.style_preset = params.style;
        }
      } else if (t('flux') || t('kontext')) {
        seed();
      } else {
        seed();
      }
      break;
    }

    case 'edit': {
      // Instruction-edit models (Kontext / Qwen / Seedream).
      seed();
      if (t('kontext')) {
        config.prompt_upsampling = params.promptUpsampling;
        config.safety_tolerance = params.safetyTolerance;
        if (params.aspectRatio) config.aspect_ratio = params.aspectRatio;
      }
      break;
    }

    case 'img2img': {
      if (model.family === 'Stable Diffusion') {
        config.steps = params.steps;
        config.guidance = params.guidance;
        config.strength = params.strength;
        seed();
      } else if (t('flux')) {
        if (params.style) config.style_preset = params.style;
        seed();
      } else {
        seed();
      }
      break;
    }

    case 'inpaint': {
      config.steps = params.steps;
      config.guidance = params.guidance;
      seed();
      break;
    }

    case 'upscale': {
      // HYPIR upscale: prompt-optional restoration; pass an optional guide prompt
      // only if the user explicitly wrote one.
      if (prompt) config.prompt = prompt;
      break;
    }

    case 'removebg': {
      // No config needed beyond the input image.
      break;
    }

    case 'vectorize': {
      const ratioToSize: Record<string, string> = {
        '1:1': '1024x1024',
        '16:9': '1536x768',
        '9:16': '768x1536',
        '4:3': '1280x896',
        '3:4': '896x1280',
        '3:2': '1216x896',
        '2:3': '896x1216',
        '21:9': '1536x768',
        '9:21': '768x1536',
      };
      config.size = ratioToSize[params.aspectRatio] ?? '1024x1024';
      break;
    }

    case 'segment': {
      if (t('sam3') || t('segment.v2')) {
        if (!config.prompt) config.prompt = prompt || 'main subject';
        config.confidence_threshold = 0.5;
      }
      break;
    }

    case 'classify': {
      break;
    }

    case 'facerestore': {
      config.upscale = 1;
      break;
    }

    case 'txt2vid':
    case 'img2vid':
    case 'vid2vid':
    case 'aud2vid': {
      // img2vid models still require a prompt — supply a sensible motion default.
      if ((model.operation === 'img2vid' || model.operation === 'vid2vid') && !config.prompt) {
        config.prompt = 'subtle, natural cinematic motion';
      }
      if (model.operation === 'aud2vid' && !config.prompt) {
        config.prompt = 'cinematic music video synced to the audio';
      }
      if (t('veo')) {
        // Veo only accepts a strict subset: 16:9 | 9:16, duration 4 | 6 | 8.
        config.resolution = params.resolution === '1080p' ? '1080p' : '720p';
        config.aspect_ratio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
        const d = params.duration;
        config.duration_seconds = d <= 4 ? 4 : d <= 6 ? 6 : 8;
        if (t('v2')) config.generate_audio = params.generateAudio;
      } else if (t('seedance') || t('kling') || t('sora')) {
        config.aspect_ratio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
      } else if (model.operation === 'vid2vid') {
        const runwayAspect: Record<string, string> = {
          '16:9': '1280:720',
          '9:16': '720:1280',
          '4:3': '1104:832',
          '3:4': '832:1104',
          '1:1': '960:960',
          '21:9': '1584:672',
        };
        config.aspect_ratio = runwayAspect[params.aspectRatio] ?? '1280:720';
        config.public_figure_moderation = 'auto';
        seed();
      } else if (model.operation === 'aud2vid') {
        config.resolution = params.resolution === '1080p' ? '1080p' : '720p';
        config.aspect_ratio = ['16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '1:1'].includes(params.aspectRatio)
          ? params.aspectRatio
          : '16:9';
        config.fps = 24;
        config.prompt_upsampling = params.promptUpsampling;
        seed();
      }
      break;
    }
  }

  return config;
}

/** MIME type for an output, given a desired format + medium. */
export function outputMime(format: GenerationParams['outputFormat'], medium: 'image' | 'video') {
  if (medium === 'video') return 'video/mp4';
  if (format === 'png') return 'image/png';
  if (format === 'webp') return 'image/webp';
  return 'image/jpeg';
}
