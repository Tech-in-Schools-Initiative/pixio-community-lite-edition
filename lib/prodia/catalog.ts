// ──────────────────────────────────────────────────────────────────────────
// Pixio · Prodia model catalog
// Every model is tagged with an `operation` + `inputs` count so the node graph,
// the canvas editor and the classic studio can all reason about it uniformly.
// Type strings verified against docs.prodia.com job-types (Jun 2026).
// ──────────────────────────────────────────────────────────────────────────

import type { MediaMode, ModelFamily, Operation, ProdiaModel } from './types';

const slug = (type: string) => type.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

type ModelSeed = Omit<ProdiaModel, 'id'> & { id?: string };
const m = (seed: ModelSeed): ProdiaModel => ({ ...seed, id: seed.id ?? slug(seed.type) });

// Families resolve to the two accent variables so the whole UI stays on-palette
// with whatever accent the user picks. Primary (--pink) vs secondary (--violet).
export const FAMILY_COLORS: Record<ModelFamily, string> = {
  FLUX: 'var(--pink)',
  'FLUX Kontext': 'var(--violet)',
  'Google AI': 'var(--violet)',
  'Stable Diffusion': 'var(--pink)',
  ByteDance: 'var(--violet)',
  Recraft: 'var(--pink)',
  Qwen: 'var(--violet)',
  Utility: 'var(--pink)',
  'Google Veo': 'var(--violet)',
  Wan: 'var(--pink)',
  Kling: 'var(--violet)',
  'Sora 2': 'var(--pink)',
  Pruna: 'var(--violet)',
  Runway: 'var(--pink)',
  SAM: 'var(--violet)',
  BiRefNet: 'var(--pink)',
  ViT: 'var(--violet)',
  'Face Restore': 'var(--pink)',
};

export interface OperationMeta {
  key: Operation;
  label: string;
  short: string;
  medium: MediaMode;
  /** does this op consume an image input? */
  needsImage: boolean;
  /** does the prompt act as an instruction rather than a description? */
  instruction: boolean;
  accent: string;
  blurb: string;
}

export const OPERATIONS: Record<Operation, OperationMeta> = {
  txt2img: { key: 'txt2img', label: 'Text → Image', short: 'Generate', medium: 'image', needsImage: false, instruction: false, accent: 'var(--pink)', blurb: 'Generate a brand-new image from a prompt.' },
  img2img: { key: 'img2img', label: 'Image → Image', short: 'Restyle', medium: 'image', needsImage: true, instruction: false, accent: 'var(--violet)', blurb: 'Reimagine an existing image guided by a prompt.' },
  edit: { key: 'edit', label: 'Instruction Edit', short: 'Edit', medium: 'image', needsImage: true, instruction: true, accent: 'var(--pink)', blurb: 'Edit an image with a natural-language instruction.' },
  inpaint: { key: 'inpaint', label: 'Inpaint', short: 'Inpaint', medium: 'image', needsImage: true, instruction: false, accent: 'var(--violet)', blurb: 'Repaint the masked region from a prompt.' },
  upscale: { key: 'upscale', label: 'Upscale', short: 'Upscale', medium: 'image', needsImage: true, instruction: false, accent: 'var(--pink)', blurb: 'Increase resolution and restore detail.' },
  removebg: { key: 'removebg', label: 'Remove Background', short: 'Cutout', medium: 'image', needsImage: true, instruction: false, accent: 'var(--violet)', blurb: 'Cut the subject out of its background.' },
  segment: { key: 'segment', label: 'Segment', short: 'Segment', medium: 'image', needsImage: true, instruction: true, accent: 'var(--pink)', blurb: 'Extract object masks with SAM or BiRefNet.' },
  classify: { key: 'classify', label: 'Classify', short: 'Labels', medium: 'image', needsImage: true, instruction: false, accent: 'var(--violet)', blurb: 'Return ViT labels or NSFW scores for an image.' },
  facerestore: { key: 'facerestore', label: 'Face Restore', short: 'Restore', medium: 'image', needsImage: true, instruction: false, accent: 'var(--pink)', blurb: 'Repair degraded faces and portraits.' },
  vectorize: { key: 'vectorize', label: 'Text to Vector', short: 'Vector', medium: 'image', needsImage: false, instruction: false, accent: 'var(--violet)', blurb: 'Generate scalable SVG art from a prompt.' },
  txt2vid: { key: 'txt2vid', label: 'Text → Video', short: 'Animate', medium: 'video', needsImage: false, instruction: false, accent: 'var(--pink)', blurb: 'Generate a video clip from a prompt.' },
  img2vid: { key: 'img2vid', label: 'Image → Video', short: 'Animate', medium: 'video', needsImage: true, instruction: false, accent: 'var(--violet)', blurb: 'Bring a still image to life as video.' },
  vid2vid: { key: 'vid2vid', label: 'Video to Video', short: 'Transform', medium: 'video', needsImage: false, instruction: true, accent: 'var(--pink)', blurb: 'Transform an existing video with a prompt.' },
  aud2vid: { key: 'aud2vid', label: 'Audio to Video', short: 'Audio video', medium: 'video', needsImage: false, instruction: true, accent: 'var(--violet)', blurb: 'Generate a video from an audio track plus prompt.' },
};

// ── Text → Image ──────────────────────────────────────────────────────────
export const TXT2IMG_MODELS: ProdiaModel[] = [
  m({ label: 'FLUX Schnell', type: 'inference.flux-fast.schnell.txt2img.v2', family: 'FLUX', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'Fast', desc: 'Fastest FLUX — built for quick iteration.' }),
  m({ label: 'FLUX Dev', type: 'inference.flux.dev.txt2img.v2', family: 'FLUX', medium: 'image', operation: 'txt2img', inputs: 0, desc: 'High quality, excellent prompt adherence.' }),
  m({ label: 'FLUX Pro 1.1', type: 'inference.flux.pro11.txt2img.v1', family: 'FLUX', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'Pro', desc: 'Premium Black Forest Labs quality.' }),
  m({ label: 'FLUX Pro Ultra', type: 'inference.flux.pro11ultra.txt2img.v1', family: 'FLUX', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'Ultra', desc: 'Highest resolution, maximum detail.' }),
  m({ label: 'FLUX 2 Dev', type: 'inference.flux-2.dev.txt2img.v1', family: 'FLUX', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'New', desc: 'Next-gen FLUX with exceptional realism.' }),
  m({ label: 'FLUX 2 Pro', type: 'inference.flux-2.pro.txt2img.v1', family: 'FLUX', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'New', desc: 'FLUX 2 professional — stunning detail.' }),
  m({ label: 'FLUX 2 Max', type: 'inference.flux-2.max.txt2img.v1', family: 'FLUX', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'Max', desc: 'Best-in-class FLUX 2 quality.' }),
  m({ label: 'FLUX 2 Flex', type: 'inference.flux-2.flex.txt2img.v1', family: 'FLUX', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'New', desc: 'Flexible FLUX 2 text-to-image.' }),
  m({ label: 'Gemini 3 Pro', type: 'inference.gemini-3-pro.txt2img.v1', family: 'Google AI', medium: 'image', operation: 'txt2img', inputs: 0, badge: '4K', desc: 'Google multimodal intelligence, up to 4K.' }),
  m({ label: 'Gemini 3.1 Flash', type: 'inference.gemini-3-1-flash.txt2img.v1', family: 'Google AI', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'Fast', desc: 'Gemini at speed — fast and capable.' }),
  m({ label: 'Nano Banana', type: 'inference.nano-banana.txt2img.v2', family: 'Google AI', medium: 'image', operation: 'txt2img', inputs: 0, desc: 'Google lightweight — fast and expressive.' }),
  m({ label: 'SDXL', type: 'inference.sdxl.txt2img.v1', family: 'Stable Diffusion', medium: 'image', operation: 'txt2img', inputs: 0, desc: 'Open-source powerhouse with style presets.' }),
  m({ label: 'SD 1.5', type: 'inference.sd15.txt2img.v1', family: 'Stable Diffusion', medium: 'image', operation: 'txt2img', inputs: 0, desc: 'Classic Stable Diffusion, huge community.' }),
  m({ label: 'Seedream 4.5', type: 'inference.seedream-4-5.txt2img.v1', family: 'ByteDance', medium: 'image', operation: 'txt2img', inputs: 0, desc: 'ByteDance photorealism at its best.' }),
  m({ label: 'Seedream 5 Lite', type: 'inference.seedream-5-0.lite.txt2img.v1', family: 'ByteDance', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'New', desc: 'Latest ByteDance, ultra high resolution.' }),
  m({ label: 'Recraft V4 Pro', type: 'inference.recraft.v4.pro.txt2img.v1', family: 'Recraft', medium: 'image', operation: 'txt2img', inputs: 0, badge: 'Pro', desc: 'Native text rendering, 40+ styles.' }),
  m({ label: 'Recraft V4', type: 'inference.recraft.v4.txt2img.v1', family: 'Recraft', medium: 'image', operation: 'txt2img', inputs: 0, desc: 'Clean vector-friendly generation.' }),
];

// ── Text → Vector (SVG) ──────────────────────────────────────────────────────
export const VECTOR_MODELS: ProdiaModel[] = [
  m({ label: 'Recraft V4 Vector', type: 'inference.recraft.v4.txt2vec.v1', family: 'Recraft', medium: 'image', operation: 'vectorize', inputs: 0, outputKind: 'vector', desc: 'Prompt-to-SVG vector artwork for logos and icons.' }),
  m({ label: 'Recraft V4 Pro Vector', type: 'inference.recraft.v4.pro.txt2vec.v1', family: 'Recraft', medium: 'image', operation: 'vectorize', inputs: 0, outputKind: 'vector', badge: 'Pro', desc: 'Higher quality SVG generation with Recraft V4 Pro.' }),
];

// ── Instruction Edit + Image → Image ────────────────────────────────────────
export const EDIT_MODELS: ProdiaModel[] = [
  m({ label: 'FLUX Kontext Pro', type: 'inference.flux-kontext.pro.img2img.v1', family: 'FLUX Kontext', medium: 'image', operation: 'edit', inputs: 1, badge: 'Edit', desc: 'Instruction-guided editing — "make the sky stormy".' }),
  m({ label: 'FLUX Kontext Max', type: 'inference.flux-kontext.max.img2img.v1', family: 'FLUX Kontext', medium: 'image', operation: 'edit', inputs: 1, badge: 'Max', desc: 'Maximum-quality instruction editing.' }),
  m({ label: 'FLUX Fast Kontext', type: 'inference.flux-fast.dev-kontext.img2img.v1', family: 'FLUX Kontext', medium: 'image', operation: 'edit', inputs: 1, badge: 'Fast', desc: 'Snappy instruction edits for fast loops.' }),
  m({ label: 'Qwen Image Edit Plus', type: 'inference.qwen.image-edit.plus.lightning.img2img.v2', family: 'Qwen', medium: 'image', operation: 'edit', inputs: 1, badge: 'New', desc: 'Precise multi-reference editing, 20B params.' }),
  m({ label: 'Qwen Image Edit', type: 'inference.qwen.image-edit.lightning.img2img.v1', family: 'Qwen', medium: 'image', operation: 'edit', inputs: 1, desc: 'Fast lightning Qwen editing.' }),
  m({ label: 'Seedream 4 Edit', type: 'inference.seedream-4.img2img.v1', family: 'ByteDance', medium: 'image', operation: 'edit', inputs: 1, desc: 'ByteDance 4K-grade image editing.' }),
  m({ label: 'FLUX 2 Pro Restyle', type: 'inference.flux-2.pro.img2img.v1', family: 'FLUX', medium: 'image', operation: 'img2img', inputs: 1, badge: 'Pro', desc: 'FLUX 2 Pro image-to-image restyling.' }),
  m({ label: 'FLUX 2 Max Restyle', type: 'inference.flux-2.max.img2img.v1', family: 'FLUX', medium: 'image', operation: 'img2img', inputs: 1, badge: 'Max', desc: 'FLUX 2 Max image-to-image restyling.' }),
  m({ label: 'FLUX Dev Restyle', type: 'inference.flux.dev.img2img.v2', family: 'FLUX', medium: 'image', operation: 'img2img', inputs: 1, desc: 'FLUX Dev image-to-image restyling.' }),
  m({ label: 'FLUX Schnell Restyle', type: 'inference.flux.schnell.img2img.v2', family: 'FLUX', medium: 'image', operation: 'img2img', inputs: 1, badge: 'Fast', desc: 'Fast FLUX image-to-image restyling.' }),
  m({ label: 'SD 1.5 Restyle', type: 'inference.sd15.img2img.v1', family: 'Stable Diffusion', medium: 'image', operation: 'img2img', inputs: 1, desc: 'Classic SD 1.5 image-to-image, strength control.' }),
];

// ── Inpaint (image + mask) ──────────────────────────────────────────────────
export const INPAINT_MODELS: ProdiaModel[] = [
  m({ label: 'SDXL Inpaint', type: 'inference.sdxl.inpainting.v1', family: 'Stable Diffusion', medium: 'image', operation: 'inpaint', inputs: 2, desc: 'High-quality masked repaint with SDXL.' }),
  m({ label: 'SD 1.5 Inpaint', type: 'inference.sd15.inpainting.v1', family: 'Stable Diffusion', medium: 'image', operation: 'inpaint', inputs: 2, desc: 'Fast masked repaint with SD 1.5.' }),
];

// ── Utility: Upscale / Remove background ────────────────────────────────────
export const UTILITY_MODELS: ProdiaModel[] = [
  m({ label: 'HYPIR Upscale', type: 'inference.hypir.upscale.v1', family: 'Utility', medium: 'image', operation: 'upscale', inputs: 1, desc: 'Detail-restoring super-resolution upscaler.' }),
  m({ label: 'Remove Background', type: 'inference.remove-background.v1', family: 'Utility', medium: 'image', operation: 'removebg', inputs: 1, desc: 'Clean subject cutout + alpha mask.' }),
];

export const SEGMENT_MODELS: ProdiaModel[] = [
  m({ label: 'SAM 2 Segment Everything', type: 'inference.sam2.segment.v1', family: 'SAM', medium: 'image', operation: 'segment', inputs: 1, inputKind: 'image', outputKind: 'masks', badge: 'Auto', desc: 'Automatic object and region masks.' }),
  m({ label: 'SAM 3 Prompt Segment', type: 'inference.sam3.segment.v1', family: 'SAM', medium: 'image', operation: 'segment', inputs: 1, inputKind: 'image', outputKind: 'masks', badge: 'Prompt', desc: 'Text-prompted object masks with confidence control.' }),
  m({ label: 'BiRefNet Segment', type: 'inference.birefnet.segment.v1', family: 'BiRefNet', medium: 'image', operation: 'segment', inputs: 1, inputKind: 'image', outputKind: 'masks', desc: 'Crisp subject masks and cutout-style segmentation.' }),
];

export const CLASSIFY_MODELS: ProdiaModel[] = [
  m({ id: 'inference-vit-img2label-v2-general', label: 'ViT Image Labels', type: 'inference.vit.img2label.v2', family: 'ViT', medium: 'image', operation: 'classify', inputs: 1, inputKind: 'image', outputKind: 'labels', defaults: { model: 'google/vit-base-patch16-224-in21k' }, desc: 'General image labels with confidence scores.' }),
  m({ id: 'inference-vit-img2label-v2-nsfw', label: 'ViT NSFW Detector', type: 'inference.vit.img2label.v2', family: 'ViT', medium: 'image', operation: 'classify', inputs: 1, inputKind: 'image', outputKind: 'labels', badge: 'NSFW', defaults: { model: 'Falconsai/nsfw_image_detection' }, desc: 'NSFW probability labels plus a passthrough image.' }),
];

export const FACE_RESTORE_MODELS: ProdiaModel[] = [
  m({ label: 'Face Restore', type: 'inference.facerestore.v1', family: 'Face Restore', medium: 'image', operation: 'facerestore', inputs: 1, inputKind: 'image', outputKind: 'image', desc: 'Repair soft, compressed, or degraded portraits.' }),
];

// ── Text → Video ────────────────────────────────────────────────────────────
export const TXT2VID_MODELS: ProdiaModel[] = [
  m({ label: 'Veo Fast + Audio', type: 'inference.veo.fast.txt2vid.v2', family: 'Google Veo', medium: 'video', operation: 'txt2vid', inputs: 0, badge: 'Audio', desc: '720p Google video with AI audio, 4–8s.' }),
  m({ label: 'Veo Fast', type: 'inference.veo.fast.txt2vid.v1', family: 'Google Veo', medium: 'video', operation: 'txt2vid', inputs: 0, badge: 'Fast', desc: '720p text-to-video, clean motion.' }),
  m({ label: 'Veo Standard', type: 'inference.veo.txt2vid.v2', family: 'Google Veo', medium: 'video', operation: 'txt2vid', inputs: 0, badge: '1080p', desc: '1080p high quality, Google DeepMind.' }),
  m({ label: 'Wan 2.2 Lightning', type: 'inference.wan2-2.lightning.txt2vid.v0', family: 'Wan', medium: 'video', operation: 'txt2vid', inputs: 0, badge: 'Fast', desc: '~22s, excellent motion quality.' }),
  m({ label: 'Seedance Lite', type: 'inference.seedance.lite.txt2vid.v1', family: 'ByteDance', medium: 'video', operation: 'txt2vid', inputs: 0, desc: 'ByteDance lightweight video generation.' }),
  m({ label: 'Seedance Pro', type: 'inference.seedance.pro.txt2vid.v1', family: 'ByteDance', medium: 'video', operation: 'txt2vid', inputs: 0, badge: '1080p', desc: '1080p ByteDance, up to 45 seconds.' }),
  m({ label: 'Kling', type: 'inference.kling.txt2vid.v1', family: 'Kling', medium: 'video', operation: 'txt2vid', inputs: 0, desc: 'Advanced camera control and motion.' }),
  m({ label: 'Sora 2', type: 'inference.sora-2.txt2vid.v1', family: 'Sora 2', medium: 'video', operation: 'txt2vid', inputs: 0, desc: 'OpenAI cinematic video generation.' }),
  m({ label: 'Sora 2 Pro', type: 'inference.sora-2.pro.txt2vid.v1', family: 'Sora 2', medium: 'video', operation: 'txt2vid', inputs: 0, badge: 'Pro', desc: 'Synchronized audio, 12s, premium quality.' }),
  m({ label: 'Pruna P-Video', type: 'inference.pruna.p-video.txt2vid.v1', family: 'Pruna', medium: 'video', operation: 'txt2vid', inputs: 0, desc: 'Pruna P-Video text-to-video endpoint.' }),
];

// ── Image → Video ────────────────────────────────────────────────────────────
export const IMG2VID_MODELS: ProdiaModel[] = [
  m({ label: 'Veo Animate', type: 'inference.veo.img2vid.v2', family: 'Google Veo', medium: 'video', operation: 'img2vid', inputs: 1, badge: '1080p', desc: 'Animate a still image with Google Veo.' }),
  m({ label: 'Veo Animate v1', type: 'inference.veo.img2vid.v1', family: 'Google Veo', medium: 'video', operation: 'img2vid', inputs: 1, desc: 'Earlier Veo image-to-video endpoint.' }),
  m({ label: 'Sora 2 Pro Animate', type: 'inference.sora-2.pro.img2vid.v1', family: 'Sora 2', medium: 'video', operation: 'img2vid', inputs: 1, badge: 'Pro', desc: 'Premium Sora 2 image-to-video.' }),
  m({ label: 'Pruna P-Video Animate', type: 'inference.pruna.p-video.img2vid.v1', family: 'Pruna', medium: 'video', operation: 'img2vid', inputs: 1, inputKind: 'image', desc: 'Pruna image-to-video generation.' }),
];

// ── Video / Audio → Video ────────────────────────────────────────────────────
export const VID2VID_MODELS: ProdiaModel[] = [
  m({ label: 'Runway Gen-4 Video Transform', type: 'inference.runway.gen4.vid2vid.v1', family: 'Runway', medium: 'video', operation: 'vid2vid', inputs: 1, inputKind: 'video', outputKind: 'video', badge: 'Gen4', desc: 'Transform an input video with a prompt.' }),
];

export const AUD2VID_MODELS: ProdiaModel[] = [
  m({ label: 'Pruna P-Video Audio', type: 'inference.pruna.p-video.aud2vid.v1', family: 'Pruna', medium: 'video', operation: 'aud2vid', inputs: 1, inputKind: 'audio', outputKind: 'video', desc: 'Generate video from an audio file and prompt.' }),
];

export const ALL_MODELS: ProdiaModel[] = [
  ...TXT2IMG_MODELS,
  ...VECTOR_MODELS,
  ...EDIT_MODELS,
  ...INPAINT_MODELS,
  ...UTILITY_MODELS,
  ...SEGMENT_MODELS,
  ...CLASSIFY_MODELS,
  ...FACE_RESTORE_MODELS,
  ...TXT2VID_MODELS,
  ...IMG2VID_MODELS,
  ...VID2VID_MODELS,
  ...AUD2VID_MODELS,
];

export const STUDIO_IMAGE_MODELS: ProdiaModel[] = [...TXT2IMG_MODELS, ...VECTOR_MODELS];
export const STUDIO_VIDEO_MODELS: ProdiaModel[] = TXT2VID_MODELS;

const BY_ID = new Map(ALL_MODELS.map((model) => [model.id, model]));
const BY_TYPE = new Map(ALL_MODELS.map((model) => [model.type, model]));

export const getModel = (idOrType: string): ProdiaModel | undefined =>
  BY_ID.get(idOrType) ?? BY_TYPE.get(idOrType);

export const modelsByOperation = (op: Operation): ProdiaModel[] =>
  ALL_MODELS.filter((model) => model.operation === op);

export const editModels = (): ProdiaModel[] =>
  ALL_MODELS.filter((model) => model.operation === 'edit' || model.operation === 'img2img');

export const familyColor = (family: ModelFamily): string => FAMILY_COLORS[family] ?? 'var(--pink)';

export const SDXL_STYLES = [
  'photographic', 'cinematic', 'digital-art', 'anime', '3d-model',
  'pixel-art', 'comic-book', 'fantasy-art', 'neon-punk', 'analog-film',
  'enhance', 'isometric', 'line-art', 'low-poly', 'origami', 'craft-clay',
];

export const ASPECT_RATIOS = ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'];
export const RESOLUTIONS = ['480p', '720p', '1080p'];

export const PROHIBITED_TERMS = ['nude', 'naked', 'pussy'];
export const isPromptAllowed = (value: string) =>
  !PROHIBITED_TERMS.some((term) => value.toLowerCase().includes(term));
