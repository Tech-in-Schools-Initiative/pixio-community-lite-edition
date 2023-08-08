import { useState } from 'react';
import axios from 'axios';
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import { CircularProgress } from '@material-ui/core';
import { Button } from '@material-ui/core';


const prohibitedWords = ['nude', 'naked', 'pussy'];

export default function HomePage() {
  const toggleSelectAllImages = () => {
    // Check if all images are currently selected
    const allSelected = imageUrls.every((image) => image.selected);
  
    if (allSelected) {
      // If all images are selected, deselect all
      setImageUrls(imageUrls.map((image) => ({ ...image, selected: false })));
    } else {
      // If not all images are selected, select all
      setImageUrls(imageUrls.map((image) => ({ ...image, selected: true })));
    }
  };
  
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [aspect_ratio, setaspect_ratio] = useState('');
  const [sampler, setSampler] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [buttonText, setButtonText] = useState('Generate Images');
  const toggleModelSelection = (model) => {
    if (selectedModels.includes(model)) {
      setSelectedModels(selectedModels.filter(selectedModel => selectedModel !== model));
    } else {
      setSelectedModels([...selectedModels, model]);
    }
  };

  const modelMap = {
    'Absolute Reality 1.6': 'absolutereality_V16.safetensors [37db0fc3]', 
    'Absolute Reality 1.8': 'absolutereality_v181.safetensors [3d9d4d2b]',
    'Analog Diffusion v1.0': 'analog-diffusion-1.0.ckpt [9ca13f02]',
    'Anything v5': 'anythingV5_PrtRE.safetensors [893e49b9]',
    'Anything v3.0': 'anythingv3_0-pruned.ckpt [2700c435]',
    'Anything v4.5': 'anything-v4.5-pruned.ckpt [65745d25]',
    'Deliberate v2': 'deliberate_v2.safetensors [10ec4b29]',
    'Dreamshaper 7': 'dreamshaper_7.safetensors [5cf5ae06]',
    'Dreamlike Diffusion 1.0': 'dreamlike-diffusion-1.0.safetensors [5c9fd6e0]',
    'Dreamlike Diffusion 2.0': 'dreamlike-diffusion-2.0.safetensors [fdcf65e7]',
    'Dreamshaper 8': 'dreamshaper_8.safetensors [9d40847d]',
    'Dreamshaper 6 BakedVae': 'dreamshaper_6BakedVae.safetensors [114c8abb]',
    'Eimis Anime Diffusion': 'EimisAnimeDiffusion_V1.ckpt [4f828a15]',
    'Elddreths Vivid Mix': 'elldreths-vivid-mix.safetensors [342d9d26]',
    'Lyriel v16': 'lyriel_v16.safetensors [68fceea2]',
    'Meinamix MeinaV9': 'meinamix_meinaV9.safetensors [2ec66ab0]',
    'meinamix meinaV11': 'meinamix_meinaV11.safetensors [b56ce717]',   
    'mechamix V1': 'mechamix_v10.safetensors [ee685731]',
    'Openjourney V4': 'openjourney_V4.ckpt [ca2f377f]',
    'Orange Mix AOM3A3': 'AOM3A3_orangemixs.safetensors [9600da17]',
    'portraitplus V1.0': 'portraitplus_V1.0.safetensors [1400e684]',
    'Realistic Vision v1.4': 'Realistic_Vision_V1.4-pruned-fp16.safetensors [8d21810b]',
    'Realistic Vision V4.0': 'Realistic_Vision_V4.0.safetensors [29a7afaa]',
    'Realistic Vision V5.0': 'Realistic_Vision_V5.0.safetensors [614d1063]',
    'redshift diffusion V10': 'redshift_diffusion-V10.safetensors [1400e684]',
    'Rev Animated v122': 'revAnimated_v122.safetensors [3f4fefd9]',
    'SD 1.4': 'sdv1_4.ckpt [7460a6fa]',
    'SD 1.5': 'v1-5-pruned-emaonly.ckpt [81761151]',
    'Shonins Beautiful v10': 'shoninsBeautiful_v10.safetensors [25d8c546]',
    'Theallys Mix II Churned': 'theallys-mix-ii-churned.safetensors [5d9225a4]',
    'Timeless 1.0': 'timeless-1.0.ckpt [7c4971d4]',
    };
    
  const models = Object.keys(modelMap);



  const handleGenerateImage = async () => {
    setButtonText('Loading...');
    setLoading(true);
    setError(null);

    // Perform prompt moderation
    const isPromptSafe = performPromptModeration(prompt);
    const isNegativePromptSafe = performPromptModeration(negativePrompt);
    if (!isPromptSafe || !isNegativePromptSafe) {
      setError('The prompt or negative prompt contains inappropriate content. Please revise your input.');
      setLoading(false);
      setButtonText('Generate Image');
      return;
    }

    try {
      const newImageUrls = [];
      for (const model of selectedModels) {
        const response = await axios.post('/api/generateImage', {
          prompt,
          negativePrompt,
          model: modelMap[model],
          upscale: true,
          aspect_ratio, // add this line
          sampler, // and this line
        });

        const imageUrl = response.data.imageUrl;
        newImageUrls.push({ imageUrl, selected: false });
      }
      setImageUrls(newImageUrls);
    } catch (error) {
      // Check if error is a rate limit error
      if (error.response && error.response.status === 429) {
        setError('You have exceeded the rate limit. Please try again later.');
      } else {
        setError('There was a problem generating the image. Please try again.');
      }
    } finally {
      setLoading(false);
      setButtonText('Generate Image');
    }
  };

  // Perform prompt moderation
  const performPromptModeration = (text) => {
    const words = text.toLowerCase().split(' ');

    for (const word of words) {
      if (prohibitedWords.includes(word)) {
        return false; // Prompt contains prohibited word
      }
    }

    return true; // Prompt is safe
  };
  
  const handleSendToDiscord = async () => {
    const selectedImageUrls = imageUrls.filter((image) => image.selected).map((image) => image.imageUrl);
    if (selectedImageUrls.length === 0) {
      return;
    }
    try {
      for (const imageUrl of selectedImageUrls) {
        await axios.post('/api/postToDiscord', { message: prompt, imageUrl });
      }
    } catch (error) {
      setError('There was a problem sending the image to Discord. Please try again.');
    }
  };

  const handleOpenLightbox = (index) => {
    setLightboxOpen(true);
    setLightboxIndex(index);
  };
  const selectAllModels = () => {
    setSelectedModels(models);
  };
  const handleToggleImageSelection = (index) => {
    const updatedImageUrls = [...imageUrls];
    updatedImageUrls[index].selected = !updatedImageUrls[index].selected;
    setImageUrls(updatedImageUrls);
    if (lightboxOpen && updatedImageUrls[index].selected) {
      setLightboxOpen(false);
    }
  };

  return (
    
    <div className="flex flex-col items-center justify-center min-h-screen py-2 w-full">
    <h1 className="text-4xl font-bold mb-8">👀Pixio</h1>
    {error && <p className="text-red-500 mb-4">{error}</p>}
    <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md mb-8">
     
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="prompt">
          Prompt
        </label>
        <input
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Enter your prompt"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="prompt"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="negative-prompt">
          Negative Prompt
        </label>
        <input
          type="text"
          value={negativePrompt}
          onChange={(event) => setNegativePrompt(event.target.value)}
          placeholder="Enter your negative prompt"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="negative-prompt"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="models">
          Models
        </label>
        <div className="flex flex-wrap">
          <Button
            variant="outlined"
            color="primary"
            onClick={selectAllModels}
            className="m-1"
          >
            Select All
          </Button>
          {models.map((model) => (
            <Button
              key={model}
              variant={selectedModels.includes(model) ? "contained" : "outlined"}
              color={selectedModels.includes(model) ? "primary" : "default"}
              onClick={() => toggleModelSelection(model)}
              className="m-1"
            >
              {model}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex justify-between mb-4">
  <div className="w-1/2 pr-2">
    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="aspect-ratio">
      Aspect Ratio
    </label>
    <select
      value={aspect_ratio}
      onChange={(event) => setaspect_ratio(event.target.value)}
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      id="aspect-ratio"
    >
      <option value="square">square</option>
      <option value="portrait">portrait</option>
      <option value="landscape">landscape</option>
    </select>
  </div>
  <div className="w-1/2 pl-2">
    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sampler">
      Sampler
    </label>
    <select
      value={sampler}
      onChange={(event) => setSampler(event.target.value)}
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      id="sampler"
    >
      <option value="DDIM">DDIM</option>
      <option value="Heun">Heun</option>
      <option value="Euler">Euler</option>
      <option value="DPM++ 2M Karras">DPM++ 2M Karras</option>
    </select>
  </div>
</div>


      {selectedModels.length > 0 && (
        <div className="mb-4 text-red-500">
          {selectedModels.length === models.length
            ? '⏳ Generation can take up to 4 minutes. Please be patient. 🙏'
            : '⏳ Generation may take a few seconds with 1 model selected. With all models selected, it can take up to 4 minutes. Please be patient. 🙏'}
            {' '}
            🚫 Remember, some prompts can generate NSFW content, so watch out what you type. 👀
        </div>
      )}
      <button
        onClick={handleGenerateImage}
        disabled={loading}
        className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:shadow-outline relative"
      >
        {loading && (
          <CircularProgress
            size={24}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          />
        )}
        <span style={{ marginLeft: loading ? '30px' : '0' }}>{buttonText}</span>
      </button>
      <button
        onClick={handleSendToDiscord}
        disabled={imageUrls.every((image) => !image.selected)}
        className="mt-4 w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 focus:outline-none focus:shadow-outline"
      >
        Send to Gallery
      </button>
<button
  onClick={toggleSelectAllImages}
  className="mt-4 w-full bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 focus:outline-none focus:shadow-outline"
>
  Toggle Select All Images
</button>

      <button className="mt-4 w-full bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700 focus:outline-none focus:shadow-outline">
        <a href="/gallery" className="block text-center">
          View Gallery
        </a>
      </button>
      
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-6xl mx-auto">
      {imageUrls.map((image, index) => (
        <div
          key={index}
          className={`relative rounded-lg overflow-hidden cursor-pointer ${
            image.selected ? 'border-2 border-blue-500' : ''
          }`}
          onClick={() => handleOpenLightbox(index)}
        >
          <img src={image.imageUrl} alt="Generated image" className="w-full h-auto" />
          <div className="absolute top-2 right-2">
            <input
              type="checkbox"
              checked={image.selected}
              onChange={() => handleToggleImageSelection(index)}
              className="m-2"
            />
          </div>
        </div>
      ))}
    </div>
    {lightboxOpen && (
      <Lightbox
        mainSrc={imageUrls[lightboxIndex].imageUrl}
        nextSrc={imageUrls[(lightboxIndex + 1) % imageUrls.length].imageUrl}
        prevSrc={imageUrls[(lightboxIndex + imageUrls.length - 1) % imageUrls.length].imageUrl}
        onCloseRequest={() => setLightboxOpen(false)}
        onMovePrevRequest={() =>
          setLightboxIndex((lightboxIndex + imageUrls.length - 1) % imageUrls.length)
        }
        onMoveNextRequest={() => setLightboxIndex((lightboxIndex + 1) % imageUrls.length)}
      />
    )}
  </div>
  );
}
