import { NextApiRequest, NextApiResponse } from 'next';
const { Prodia } = require('prodia.js');

const prodia = new Prodia(process.env.PRODIA_KEY);

const defaultSettings = {
  steps: 30,
  cfg_scale: 20,
  upscale: true,
  sampler: 'DDIM',
  aspect_ratio: 'square'
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const {
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

  // Preparing options for image generation
  const options = {
    model: model || 'deliberate_v2.safetensors [10ec4b29]',
    prompt: prompt || 'puppy',
    negativePrompt: negativePrompt, // Negative prompt
    seed: seed || -1,
    steps: steps || defaultSettings.steps,
    cfgScale: cfg_scale || defaultSettings.cfg_scale, // cfg_scale to cfgScale
    upscale: upscale !== undefined ? upscale : defaultSettings.upscale,
    sampler: sampler || defaultSettings.sampler,
    aspectRatio: aspect_ratio || defaultSettings.aspect_ratio // aspect_ratio to aspectRatio
  };

  try {
    // Call the generateImage method from the Prodia class to start the image generation process
    let imageGenerationJob = await prodia.generateImage(options);
    
    // Polling job status
    while (imageGenerationJob.status !== "succeeded" && imageGenerationJob.status !== "failed") {
      await new Promise((resolve) => setTimeout(resolve, 250));
      imageGenerationJob = await prodia.getJob(imageGenerationJob.job); // Assuming getJob is a method in Prodia class
    }

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
