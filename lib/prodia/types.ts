// ──────────────────────────────────────────────────────────────────────────
// Pixio · Prodia type system
// The single source of truth for media modes, operations, models and params.
// ──────────────────────────────────────────────────────────────────────────

export type MediaMode = 'image' | 'video';
export type InputKind = 'image' | 'video' | 'audio';
export type OutputKind = 'image' | 'video' | 'vector' | 'masks' | 'labels';

/**
 * Capability category for a model. Drives which params/handles the UI exposes.
 * The real Prodia operation token lives inside `ProdiaModel.type`.
 */
export type Operation =
  | 'txt2img' // text -> image
  | 'img2img' // image (+text) -> image, freeform restyle
  | 'edit' // instruction edit (Kontext / Qwen / Seedream): image + instruction -> image
  | 'inpaint' // image + mask (+text) -> image
  | 'upscale' // image -> larger image
  | 'removebg' // image -> cutout (+ mask)
  | 'segment' // image/video -> segmentation masks
  | 'classify' // image -> labels (+ passthrough image)
  | 'facerestore' // image -> restored face image
  | 'vectorize' // text -> SVG vector
  | 'txt2vid' // text -> video
  | 'img2vid' // image (+text) -> video
  | 'vid2vid' // video (+text) -> video
  | 'aud2vid'; // audio (+text) -> video

export type ModelFamily =
  | 'FLUX'
  | 'FLUX Kontext'
  | 'Google AI'
  | 'Stable Diffusion'
  | 'ByteDance'
  | 'Recraft'
  | 'Qwen'
  | 'Utility'
  | 'Google Veo'
  | 'Wan'
  | 'Kling'
  | 'Sora 2'
  | 'Pruna'
  | 'Runway'
  | 'SAM'
  | 'BiRefNet'
  | 'ViT'
  | 'Face Restore';

export interface ProdiaModel {
  /** Stable slug derived from the type string. */
  id: string;
  label: string;
  /** Prodia inference type string, e.g. `inference.flux.dev.txt2img.v2`. */
  type: string;
  family: ModelFamily;
  medium: MediaMode;
  operation: Operation;
  inputKind?: InputKind;
  outputKind?: OutputKind;
  desc: string;
  badge?: string;
  defaults?: JobConfig;
  /**
   * Number of binary input images the job expects:
   * 0 = txt2img / txt2vid, 1 = img2img / edit / upscale / removebg / img2vid,
   * 2 = inpaint (image + mask). Edit models that accept extra references may
   * pass more, but 1 is the required minimum.
   */
  inputs: number;
}

/** Raw Prodia job config payload. */
export interface JobConfig {
  prompt?: string;
  negative_prompt?: string;
  [key: string]: unknown;
}

/** Exact cost of a single job, returned when `?price=true`. */
export interface PriceInfo {
  product?: string;
  dollars?: number;
}

/**
 * The complete parameter surface a user can tune. `buildConfig` projects the
 * relevant subset onto each model based on its family/operation.
 */
export interface GenerationParams {
  prompt: string;
  negativePrompt: string;
  steps: number;
  guidance: number;
  seed: number;
  width: number;
  height: number;
  style: string;
  strength: number;
  aspectRatio: string;
  resolution: string;
  duration: number;
  generateAudio: boolean;
  outputFormat: 'jpeg' | 'png' | 'webp';
  promptUpsampling: boolean;
  safetyTolerance: number;
}

export function createDefaultParams(): GenerationParams {
  return {
    prompt: '',
    negativePrompt: '',
    steps: 25,
    guidance: 7,
    seed: -1,
    width: 1024,
    height: 1024,
    style: '',
    strength: 0.65,
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 6,
    generateAudio: false,
    outputFormat: 'png',
    promptUpsampling: false,
    safetyTolerance: 2,
  };
}

/** Request shape sent from the browser to `/api/job`. */
export interface RunJobRequest {
  type: string;
  config: JobConfig;
  /** Data URLs (or http URLs) for image inputs; the server turns these into
   *  multipart `input` parts. For inpaint: [image, mask]. */
  inputs?: string[];
  apiKey?: string;
  format?: GenerationParams['outputFormat'];
  trackCost?: boolean;
}

/** Response shape returned by `/api/job`. */
export interface RunJobResponse {
  url: string | null;
  /** Secondary output (e.g. the mask from remove-background). */
  maskUrl?: string | null;
  /** All binary media outputs in response order. Segmentation can return many. */
  outputs?: string[];
  /** Parsed JSON outputs such as ViT labels. */
  metadata?: Record<string, unknown> | null;
  video: boolean;
  mimeType: string;
  price?: PriceInfo | null;
  jobId?: string | null;
}
