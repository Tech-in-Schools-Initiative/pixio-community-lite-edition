import { NextApiRequest, NextApiResponse } from 'next';
import { Prodia } from "pixio-prodia";

const defaultSettings = {
  steps: 30,
  cfg_scale: 20,
  upscale: false,
  sampler: 'DDIM',
  aspect_ratio: 'square'
};

async function createImageGenerationJob(prodia, options) {
  console.log('Creating image generation job with options:', options);
  let job = await prodia.createJob(options);

  console.log('Created job:', job);

  while (job.status !== "succeeded" && job.status !== "failed") {
    await new Promise((resolve) => setTimeout(resolve, 250));
    job = await prodia.getJob(job.job);
    console.log('Updated job status:', job.status);
  }

  console.log('Job status:', job.status);
  return job;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    prodiaKey,
    model,
    prompt,
    negativePrompt,
    seed,
    steps,
    cfg_scale,
    upscale,
    sampler,
    aspect_ratio
  } = req.body;

  const prodia = new Prodia(prodiaKey);
  const options = {
    model: model || 'deliberate_v2.safetensors [10ec4b29]',
    prompt: prompt || 'puppy in the clouds 4k',
    negative_prompt: negativePrompt || 'unnatural, unrealistic, cartoon, illustration, painting, drawing, unreal engine, black and white, monochrome, oversaturated, low saturation, surreal, underexposed, overexposed, jpeg artifacts, conjoined, aberrations, multiple levels, harsh lighting, anime, sketches, twisted, video game, photoshop, creative, UI, abstract, collapsed, rotten, extra windows, disfigured, disproportionate, bad anatomy, bad proportions, ugly, out of frame, mangled, asymmetric, cross-eyed, depressed, immature, stuffed animal, out of focus, high depth of field, cloned face, cloned head, age spot, skin blemishes, collapsed eyeshadow, asymmetric ears, imperfect eyes, floating hair, unnatural, conjoined, missing limb, missing arm, missing leg, poorly drawn face, poorly drawn feet, poorly drawn hands, floating limb, disconnected limb, extra limb, malformed limbs, malformed hands, poorly rendered face, poor facial details, poorly rendered hands, double face, unbalanced body, unnatural body, lacking body, childish, long body, cripple, old, fat, cartoon, 3D, weird colors, unnatural skin tone, unnatural skin, stiff face, fused hand, skewed eyes, mustache, beard, surreal, cropped head, group of people,pixelated,noisy,distorted,overexposed,underexposed,caricature,unnatural colors,oversaturated,undersaturated,too dark,too light,lack of detail,exaggerated features,unbalanced composition,fuzzy,sketch-like,discolored,flat lighting,cartoon,deformed,ugly,blurry,low quality,low resolution,low res,low resolution,low res',
    seed: seed || -1,
    steps: steps || defaultSettings.steps,
    cfg_scale: cfg_scale || defaultSettings.cfg_scale,
    upscale: upscale !== undefined ? upscale : defaultSettings.upscale,
    sampler: sampler || defaultSettings.sampler,
    aspect_ratio: aspect_ratio || defaultSettings.aspect_ratio
  };

  try {
    let imageGenerationJob = await createImageGenerationJob(prodia, options);

    if (imageGenerationJob.status !== "succeeded") {
      throw new Error("Image generation job failed");
    }

    console.log('Image generation job succeeded:', imageGenerationJob);
    res.status(200).json({ imageUrl: imageGenerationJob.imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate image", error: error.message });
  }
};