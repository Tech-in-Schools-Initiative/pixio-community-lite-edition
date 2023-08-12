require('dotenv').config()
import {  FaSun, FaMoon, FaGithub, FaQuestionCircle, FaLink, FaLifeRing, FaTwitter } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import { CircularProgress, Button } from '@material-ui/core';
import Autocomplete from 'react-autocomplete';
import Select from 'react-select';
import { components } from 'react-select';
import React, { useRef } from 'react';


const modelDetails = {
  'Absolute Reality 1.6': { label: 'Absolute Reality 1.6', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/0375afda-d837-4cf9-a0f1-958810ab300d/width=1120/26072207-5775662-(masterpiece),%20(extremely%20intricate_1.3),,%20(realistic),%20portrait%20of%20a%20girl,%20the%20most%20beautiful%20in%20the%20world,%20(medieval%20armor),%20m.jpeg', is18Plus: false, description: 'Great for humans and animals and fantasy' },
  'Absolute Reality 1.8': { label: 'Absolute Reality 1.8', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/0375afda-d837-4cf9-a0f1-958810ab300d/width=1120/26072207-5775662-(masterpiece),%20(extremely%20intricate_1.3),,%20(realistic),%20portrait%20of%20a%20girl,%20the%20most%20beautiful%20in%20the%20world,%20(medieval%20armor),%20m.jpeg', is18Plus: false, description: 'Amazing at high detail images' },
  'Analog Diffusion v1.0': { label: 'Analog Diffusion v1.0', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/540d46ed-6dd6-402e-4b9f-a2b4bc82d800/width=450/out2-03.jpeg', is18Plus: false, description: 'Almost indistinguishable from real photographs.' },
  'Anything v5': { label: 'Anything v5', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/2bf8c914-7bac-4645-b5e9-9c17b8889a1d/width=700/00000-3014210268.jpeg', is18Plus: true, description: 'Really great for Anime and art.' },
  'Anything v3.0': { label: 'Anything v3.0', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/c38dc610-697c-4df3-9235-1b8ec89885bd/width=450/10791-number-seed.jpeg', is18Plus: true, description: 'General Art and Digital art.' },
  'Anything v4.5': { label: 'Anything v4.5', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e4deb0f1-035f-41b8-4ded-a7049096be00/width=450/384040.jpeg', is18Plus: true, description: 'Fantasy anime and comic style.' },
  'Deliberate v2': { label: 'Deliberate v2', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/40943b9c-ede2-48c0-77d7-b48fee661d00/width=768/150224.jpeg', is18Plus: false, description: 'Great results  detailed prompts' },
  'Dreamshaper 7': { label: 'Dreamshaper 7', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/a78a4bd3-b662-4587-893b-207a3abf9ec9/width=450/01576-132340236-8k%20portrait%20of%20beautiful%20cyborg%20with%20brown%20hair,%20intricate,%20elegant,%20highly%20detailed,%20majestic,%20digital%20photography,%20art%20by%20artg.jpeg', is18Plus: false, description: 'Amazing for artistic or creative prompting.' },
  'Dreamlike Diffusion 1.0': { label: 'Dreamlike Diffusion 1.0', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/b784f763-c457-499b-83d5-3814bea2af00/width=1024/1.jpg-01.jpeg', is18Plus: false, description: 'Good colors and style.' },
  'Dreamlike Diffusion 2.0': { label: 'Dreamlike Diffusion 2.0', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/8f00b26d-3deb-48d0-6c42-aac525a70800/width=1024/2.jpg-00.jpeg', is18Plus: false, description: 'Good colors and style.' },
  'Dreamshaper 8': { label: 'Dreamshaper 8', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/dd9b038c-bd15-43ab-86ab-66e145ad7ff2/width=450/26072158-132340247-8k%20portrait%20of%20beautiful%20cyborg%20with%20brown%20hair,%20intricate,%20elegant,%20highly%20detailed,%20majestic,%20digital%20photography,%20art%20by%20artg_ed.jpeg', is18Plus: true, description: 'Dreamshaper series trained on SD XL' },
  'Dreamshaper 6': { label: 'Dreamshaper 6', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/dc17400a-8fe6-44f1-a874-077112735f14/width=1536/xl_upscaled_00793_.jpeg', is18Plus: false, description: 'Fantastic at creative animals and wildlife.' },
  'Eimis Anime': { label: 'Eimis Anime', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/2ff70747-90cf-4ffb-a548-7139f3487390/width=450/02582-1548498048-0000.jpeg', is18Plus: false, description: 'Amazing new age anime model.' },
  'Elddreths Vivid Mix': { label: 'Elddreths Vivid Mix', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/7324d161-457e-4d54-0f74-11a390410700/width=450/13402-401903071-award%20winning%20waist%20up%20photo%20of%20a%20rugged%20dark%20science%20fiction%20space%20marine,%20wearing%20scratched%20and%20dented%20space%20marine%20gear,%20midd.jpeg', is18Plus: false, description: 'description coming soon.' },
  'Lyriel v16': { label: 'Lyriel v16', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/c028d3fe-669c-44c0-9eac-b9d67f729492/width=450/00014-1261263585.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Meinamix MeinaV9': { label: 'Meinamix MeinaV9', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/406fed25-61de-491e-a30e-77f9efe0321e/width=450/00050.jpeg', is18Plus: false, description: 'Description coming soon' },
  'meinamix meinaV11': { label: 'meinamix meinaV11', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/d0c38bc9-bc80-458a-93f6-550cac33b7ab/width=450/00001.jpeg', is18Plus: false, description: 'Description coming soon' },
  'mechamix V1': { label: 'mechamix V1', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/82ad9f25-41e1-4021-8beb-f2020282e805/width=450/00140-2799398995.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Openjourney V4': { label: 'Openjourney V4', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/3cd864b8-d684-43b6-1402-cae9ee2e1200/width=512/301518.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Orange Mix': { label: 'Orange Mix', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/8e43c79f-1a34-46a5-0708-c031a8ede200/width=450/175095.jpeg', is18Plus: false, description: 'Description coming soon' },
  'portraitplus V1.0': { label: 'portraitplus V1.0', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/574ec1e7-d7ab-4d0c-3f6e-da02d3145200/width=450/03.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Realistic Vision v1.4': { label: 'Realistic Vision v1.4', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/8e8f5d72-27e9-4096-bbaf-9ce268a80c00/width=450/00153-389638894.0.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Realistic Vision V4.0': { label: 'Realistic Vision V4.0', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/81b987ea-f450-45c1-8d17-40c0bf55b60c/width=1024/00000-3839617620.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Realistic Vision V5.0': { label: 'Realistic Vision V5.0', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/624cc2f7-e78f-44ac-9b35-9db11246da35/width=640/00000-3379275068.jpeg', is18Plus: false, description: 'Description coming soon' },
  'redshift diffusion V10': { label: 'redshift diffusion V10', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/1a9410d9-1a04-457d-1966-e5ec08bbaf00/width=450/peopl-01.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Rev Animated v122': { label: 'Rev Animated v122', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/13303d08-1b18-4b89-728f-82aa3b4aaa00/width=450/00009-735323561.jpeg', is18Plus: false, description: 'Description coming soon' },
  'SD 1.4': { label: 'SD 1.4', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/39e05a22-6bc5-4201-e96e-307b937c1600/width=450/peopl-06.jpeg', is18Plus: false, description: 'Description coming soon' },
  'SD 1.5': { label: 'SD 1.5', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/1c1d4f13-21b0-4068-acd0-51a3ec1c18bc/width=450/26072218-2067885436-(anime%20coloring,%20anime%20screencap,%20ghibli,%20mappa,%20anime%20style),%201girl,%20hatsune%20miku,%20white%20gown,%20angel,%20angel%20wings,%20golden%20halo,.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Shonins Beautiful v10': { label: 'Shonins Beautiful v10', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/3184b8c0-1a01-4b33-8599-cfe09bfc49ab/width=1536/00028-2059916058.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Theallys Mix II Churned': { label: 'Theallys Mix II Churned', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/69abd7aa-45a8-4e84-a0dd-63e2094c93a1/width=450/149471-943806964-30-DPM++%202M%20Karras-1408-serenity_v1.jpeg', is18Plus: false, description: 'Description coming soon' },
  'Timeless 1.0': { label: 'Timeless 1.0', image: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/69abd7aa-45a8-4e84-a0dd-63e2094c93a1/width=450/149471-943806964-30-DPM++%202M%20Karras-1408-serenity_v1.jpeg', is18Plus: false, description: 'Description coming soon' },
};



const allOption = { value: 'all', label: 'Select All' };
const modelOptions = Object.keys(modelDetails).map((key) => ({
  value: key,
  label: modelDetails[key].label,
  image: modelDetails[key].image,
  is18Plus: modelDetails[key].is18Plus,
  description: modelDetails[key].description,
}));

const prohibitedWords = ['nude', 'naked', 'pussy'];

// Define your suggestions for autocomplete here
const suggestions = [
  // Add your suggestions for autocomplete
];

const getSuggestions = (value) => {
  const inputValue = value.trim().toLowerCase();
  const inputLength = inputValue.length;
  return inputLength === 0 ? [] : suggestions.filter(suggestion =>
    suggestion.toLowerCase().slice(0, inputLength) === inputValue
  );
};
const ProdiaKeyModal = ({ setProdiaKey, setShowProdiaKeyModal }) => {
  const [key, setKey] = useState('');

  const handleInputChange = (e) => {
    setKey(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('NEXT_PUBLIC_PRODIA_KEY', key);
    setProdiaKey(key);
    setShowProdiaKeyModal(false);
  };


  return (
    <div 
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: '1000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'opacity 0.3s ease',
      }}
    >
      <form 
        onSubmit={handleSubmit} 
        style={{
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          width: '50%', 
          maxWidth: '600px'  // Prevent the modal from getting too wide on large screens
        }}
      >
        <h2>Prodia Key</h2>
        <p>You can obtain a Prodia key from the official Pixio website. Register for an account and follow the instructions to obtain your key.</p>
        <label style={{display: 'block', marginBottom: '10px'}}>
          Key:
          <input 
            type="text" 
            value={key} 
            onChange={handleInputChange} 
            required 
            style={{
              width: '100%',
              padding: '12px 20px',
              margin: '8px 0',
              boxSizing: 'border-box',
              border: '2px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#f8f8f8',
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            backgroundColor: '#007BFF',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'inline-block',
            fontSize: '16px',
            margin: '4px 2px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          Submit
        </button>
      </form>
    </div>
  );
};


  
export default function HomePage() {
  const [prodiaKey, setProdiaKey] = useState('');
  const [darkMode, setDarkMode] = useState(false);
    // Handle dark mode changes
    useEffect(() => {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, [darkMode]);
  
  const [showProdiaKeyModal, setShowProdiaKeyModal] = useState(true); // Add this line
  useEffect(() => {
    const storedKey = localStorage.getItem('NEXT_PUBLIC_PRODIA_KEY');
    console.log('Stored key:', storedKey); // Add this line
    if (storedKey) {
      setProdiaKey(storedKey);
      setShowProdiaKeyModal(false);
    } else {
      const envKey = process.env.NEXT_PUBLIC_PRODIA_KEY;
      console.log('Env key:', envKey); // And this line
      if (envKey) {
        setProdiaKey(envKey);
        setShowProdiaKeyModal(false);
      }
    }
  }, []);
  
  const [prompt, setPrompt] = useState('');
  const [previewVisible, setPreviewVisible] = useState(null);
  const [seed, setSeed] = useState(-1); // or any default value for seed
  const [steps, setSteps] = useState(30); // or any default value for steps
  const [cfg_scale, setCfg_scale] = useState(20); // or any default value for cfg_scale
  const [upscale, setUpscale] = useState(false); // or any default value for upscale
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [aspect_ratio, setaspect_ratio] = useState('');
  const [sampler, setSampler] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [rawText, setRawText] = useState('');
  const [buttonText, setButtonText] = useState('Generate Images');
  const toggleModelSelection = (model) => {
    if (selectedModels.includes(model)) {
      setSelectedModels(selectedModels.filter(selectedModel => selectedModel !== model));
    } else {
      setSelectedModels([...selectedModels, model]);
    }
  };

  // const modelImages = {
  //   'Absolute Reality 1.6': 'https://images.prodia.xyz/9c602f83-643c-4283-a1f3-eae7f5507fa2.png',
  
  // };
  
  

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
    const modelOptions = Object.keys(modelDetails).map((key) => ({
      value: key,
      label: modelDetails[key].label,
      image: modelDetails[key].image,
      is18Plus: modelDetails[key].is18Plus,
      description: modelDetails[key].description,
    }));
    
    

  const toggleSelectAllImages = () => {
    const areAllSelected = imageUrls.every((image) => image.selected);
    const updatedImageUrls = imageUrls.map((image) => ({ ...image, selected: !areAllSelected }));
    setImageUrls(updatedImageUrls);
  };
  
// Add this to your component to handle image clicks
const handleImageClick = (index) => {
  setLightboxIndex(index);
  setLightboxOpen(true);
};

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
          upscale: upscale,
          aspect_ratio, // add this line
          sampler, // and this line
          prodiaKey,
          seed:seed,
          cfg_scale:cfg_scale,
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
  const downloadImage = (url, filename) => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'image.png';
        a.click();
        window.URL.revokeObjectURL(url);
      });
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
  const [selectAll, setSelectAll] = useState(false);

  const selectAllModels = () => {
    setSelectedModels(models);
  };

  const handleSelectAllClick = () => {
    if (selectAll) {
      setSelectedModels([]); // Deselect all
    } else {
      setSelectedModels(modelOptions.map((option) => option.value)); // Select all
    }
    setSelectAll(!selectAll);
  };
  
  const CustomOption = (props) => {
    return (
      <components.Option {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={props.data.image} alt={props.data.label} style={{ width: '40px', height: '40px', marginRight: '8px' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {props.data.is18Plus && <div style={{ color: 'white', backgroundColor: 'red', padding: '2px 4px', fontSize: '10px', borderRadius: '3px', marginRight: '5px' }}>18+</div>}
              <span style={{ fontWeight: 'bold' }}>{props.data.label}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'gray' }}>{props.data.description}</div>
          </div>
        </div>
      </components.Option>
    );
  };
  const handleChange = (selected) => {
    if (selected.some(item => item.value === 'all')) {
        setSelectedModels(Object.keys(modelDetails));
    } else {
        setSelectedModels(selected ? selected.map(item => item.value) : []);
    }
  };
  
  const handlePaste = async (event) => {
    // Prevent the default paste action
    event.preventDefault();
  
    // Use navigator.clipboard to read the clipboard text
    try {
      const pastedText = await navigator.clipboard.readText();
      console.log('Pasted text:', pastedText);
  
      // Splitting at "Negative prompt:" to separate the main prompt and the rest
      const negativePromptIndex = pastedText.indexOf('Negative prompt:');
      const mainPrompt = pastedText.substring(0, negativePromptIndex).trim();
      const rest = pastedText.substring(negativePromptIndex + 'Negative prompt:'.length).trim();
  
      const negativePromptParts = rest.split('\n');
      const negativePrompt = negativePromptParts[0].trim();
  
      // Extracting other parameters by splitting them at "," and ":"
      const parameters = {};
      const lines = negativePromptParts[1].split(', ');
      for (let i = 0; i < lines.length; i++) {
        const [key, value] = lines[i].split(': ');
        if (key && value) {
          parameters[key.trim()] = value.trim();
        }
      }
  
      // Now you can use mainPrompt, negativePrompt, and parameters to set the state in your component
      setPrompt(mainPrompt); // Set the main prompt
      setNegativePrompt(negativePrompt);
      setSteps(Number(parameters['Steps']));
      setSampler(parameters['Sampler']);
      setCfg_scale(Number(parameters['CFG scale']));
      setSeed(Number(parameters['Seed']));
      // You can continue extracting other parameters in a similar way
    } catch (err) {
      console.error('Failed to read clipboard text:', err);
    }
  };
  
  
  

  
  const CustomValueContainer = ({ children, ...props }) => (
    <div {...props} className="flex flex-wrap">
      {children}
    </div>
  );
  const selectRef = useRef(null);

  const CustomMultiValue = (props) => (
    <div className="flex align-center" style={{ marginRight: '4px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <img src={props.data.image} alt={props.data.label} style={{ width: '20px', height: '20px', marginRight: '4px' }} />
      <div>{props.children}</div>
      <div onClick={props.removeProps.onClick} style={{ marginLeft: '4px', cursor: 'pointer' }}>×</div>
    </div>
  );
  
  const [searchValue, setSearchValue] = useState(''); // define the state for search value

const handleSelect = (value) => {
  // find the selected model by its label
  const selectedModel = modelOptions.find((option) => option.label === value);
  
  if (selectedModel) {
    // add the selected model to the selectedModels array
    setSelectedModels([...selectedModels, selectedModel.value]);
  }

  setSearchValue(''); // clear the search value
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
<div className={`flex flex-col items-start min-h-screen w-full py-0 ${darkMode ? 'dark' : ''}`}>
  {/* Dark mode toggle button */}
  {showProdiaKeyModal && <ProdiaKeyModal setProdiaKey={setProdiaKey} setShowProdiaKeyModal={setShowProdiaKeyModal} />} 

  <header className="w-full p-4 mb-4 bg-black text-white flex justify-around items-center">
    {/* Icons */}
    <a href="https://github.com/Tech-in-Schools-Inititaitive/pixio-community-lite-edition" target="_blank" rel="noopener noreferrer">
      <FaGithub size={24} />
    </a>
    <a href="https://docs-three-jet.vercel.app/" target="_blank" rel="noopener noreferrer">
      <FaQuestionCircle size={24} />
    </a>
    <a href="https://pixio.myapps.ai" target="_blank" rel="noopener noreferrer">
      <FaLink size={24} />
    </a>
    <a href="https://myapps.ai" target="_blank" rel="noopener noreferrer">
      <FaLifeRing size={24} />
    </a>
    <a href="https://x.com/tsi_org" target="_blank" rel="noopener noreferrer">
      <FaTwitter size={24} />
    </a>

    <button onClick={() => setDarkMode(!darkMode)} className="bg-black-700 dark:bg-black-700 text-white-800 dark:text-gray-300 px-4 py-2 rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-300">
      {darkMode ? '' : ''} {darkMode ? <FaSun size={24} /> : <FaMoon size={24} />}
    </button>

      </header>
  
      <div className="flex flex-col lg:flex-row w-full">
        {/* Left Side (UI/UX Inputs) */}
  <div className="w-full lg:w-450px lg:pr-2 flex flex-col items-center mb-8 lg:mb-0 bg-white shadow-md rounded-lg p-6">
    <h1 className="text-4xl font-bold mb-8 text-center">👀Pixio</h1>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          
          <div className="flex flex-wrap justify-center w-full">
            <div className="bg-white shadow-md rounded-lg p-6 w-full md:max-w-md mb-8">
              {/* Prompt Input */}

              <div className="mb-4">
  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="prompt">
    Prompt
  </label>
  <textarea
  value={prompt}
  onChange={(event) => setPrompt(event.target.value)}
  placeholder="Enter your prompt"
  className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${darkMode ? 'text-white' : 'text-gray-700'}`}
  style={darkMode ? { backgroundColor: '#262626' } : {}}
  id="prompt"
  rows={3}
/>
</div>
<div className="mb-4">
  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="negative-prompt">
    Negative Prompt
  </label>
  <textarea
  value={negativePrompt}
  onChange={(event) => setNegativePrompt(event.target.value)}
  placeholder="Enter your negative prompt"
  className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${darkMode ? 'text-white' : 'text-gray-700'}`}
  style={darkMode ? { backgroundColor: '#262626' } : {}}
  id="negative-prompt"
  rows={3}
/>
</div> 
<div className="mb-4">
  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="raw-text">
    Civit AI Prompt Paste
  </label>
  <textarea
    value={rawText}
    onChange={(event) => setRawText(event.target.value)}
    className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${darkMode ? 'text-white' : 'text-gray-700'}`}
    id="raw-text"
    rows={3}
  />
  <button onClick={handlePaste} className="mt-2 bg-green-500 text-white px-4 py-2 rounded">
    Extract and Fill
  </button>
</div>
{/* Model Selection */}
<div className="mb-4">
  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="models">
    Models
  </label>
  <button
    onClick={handleSelectAllClick}
    className={`px-4 py-2 rounded-full transition-all duration-300 ${
      darkMode
        ? 'bg-black-700 text-white-800 hover:bg-gray-600'
        : 'bg-gray-200 text-black-700 hover:bg-gray-300'
    }`}
  >
    {selectAll ? 'Deselect All' : 'Select All'}
  </button>
  {selectedModels.length < modelOptions.length && (
 <Autocomplete
 inputProps={{
  style: {
    width: '300px',
    padding: '10px',
    border: darkMode ? '1px solid #555' : '1px solid #ccc', // Different border color in dark mode
    borderRadius: '4px',
    backgroundColor: darkMode ? '#333' : '#fff', // Different background color in dark mode
    color: darkMode ? '#fff' : '#000', // Different text color in dark mode
  },
  placeholder: 'Search models...',

 }}
 items={modelOptions.filter(option => !selectedModels.includes(option.label))}
 shouldItemRender={(item, value) => item.label.toLowerCase().indexOf(value.toLowerCase()) > -1}
 getItemValue={(item) => item.label}
 renderItem={(item, highlighted) =>
  <div
    key={item.label}
    style={{
      backgroundColor: highlighted ? (darkMode ? '#444' : '#eee') : (darkMode ? '#333' : '#fff'), // Different background color in dark mode
      // ... rest of the styles
      display: 'flex',
      alignItems: 'center',
      padding: '5px',
      zIndex: 5000,
    }}
   >
     <img
       src={modelDetails[item.label].image} // Use the image from modelDetails
       alt={item.label}
       style={{ width: '20px', height: '20px', marginRight: '10px' }}
     />
     <div style={{ display: 'flex', flexDirection: 'column' }}>
       <strong>{item.label}</strong> {/* Model name in bold */}
       <div>{modelDetails[item.label].description}</div> {/* Description */}
     </div>
     {modelDetails[item.label].is18Plus && <span style={{ marginLeft: '10px', color: 'red' }}>18+</span>}
   </div>
 }
 value={searchValue}
 onChange={(e) => setSearchValue(e.target.value)}
 onSelect={(value) => {
   handleSelect(value);
   setSearchValue(""); // Clear the search field after selection
 }}
 wrapperStyle={{ position: 'relative', display: 'inline-block', zIndex: 1 }}
/>

)}


</div>
<div className="mt-4 flex flex-wrap">
  {selectedModels.map((modelName, index) => (
    <div key={index} className="w-1/2 flex items-center mb-2 cursor-pointer relative">
      <div className="flex items-center">
        <img
          src={modelDetails[modelName].image}
          alt={modelName}
          style={{ width: '50px', height: '65px' }}
          onMouseEnter={() => setPreviewVisible(index)}
          onMouseLeave={() => setPreviewVisible(null)}
        />
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{modelName}</span>
        <button
          onClick={() => {
            const newSelectedModels = selectedModels.filter(model => model !== modelName);
            setSelectedModels(newSelectedModels);
          }}
          className={`ml-2 px-1 ${darkMode ? 'text-white' : 'text-black'}`}
        >
          ⛔️
        </button>
      </div>
      {/* Full-size preview container */}
      <div
        style={{ display: previewVisible === index ? 'block' : 'none' }}
        className="absolute left-full top-0 transform -translate-y-1/2 bg-white border p-2 z-10"
      >
        <img
          src={modelDetails[modelName].image}
          alt={`${modelName} full-size`}
          className="w-auto h-auto max-w-lg max-h-lg"
        />
      </div>
    </div>
  ))}
</div>





              {/* Aspect Ratio and Sampler Inputs */}

 <div className="flex"> {/* Added this flex container */}
  <div className="w-1/2 pr-2">
    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="aspect-ratio">
      Aspect Ratio
    </label>
    <select
    onPaste={handlePaste}
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
  <div className="w-1/2 pr-4">
    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sampler">
      Sampler
    </label>
    <select
    onPaste={handlePaste}
      value={sampler}
      onChange={(event) => setSampler(event.target.value)}
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      id="sampler"
    >
      <option value="DDIM">DDIM</option>
      <option value="Heun">Heun</option>
      <option value="Euler">Euler</option>
      <option value="Euler a">Euler a</option>
      <option value="DPM++ 2M Karras">DPM++ 2M Karras</option>
      <option value="DPM++ SDE Karras">DPM++ SDE Karras</option>
    </select>
  </div>
  

  <div className="w-1/2 pl-2">
    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="steps">
      Steps
    </label>
    <input
     onPaste={handlePaste}
      type="number"
      value={steps}
      onChange={(event) => setSteps(Number(event.target.value))}
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      id="steps"
    />
  </div>
</div>
<div className="flex">
  <div className="w-1/4 pr-2">
    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cfg-scale">
      CFG Scale
    </label>
    <input
     onPaste={handlePaste}
      type="number"
      value={cfg_scale}
      onChange={(event) => setCfg_scale(Number(event.target.value))}
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      id="cfg-scale"
    />
  </div>
  <div className="w-1/2 pr-2"> {/* Changed this from w-1/2 to w-1/4 */}
    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="seed">
      Seed
    </label>
    <input
     onPaste={handlePaste}
      type="number"
      value={seed}
      onChange={(event) => setSeed(Number(event.target.value))}
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      id="seed"
      min="-1"
    />
  </div>
  <div className="w-1/2 pl-2">
    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="upscale">
      Upscale
    </label>
    <input
     onPaste={handlePaste}
      type="checkbox"
      checked={upscale}
      onChange={(event) => setUpscale(event.target.checked)}
      className="mt-2"
      id="upscale"
    />
  </div>
</div>
</div>

              {/* Generation and Gallery Buttons */}
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
                Generate Image
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
                  View Gallery (Coming Soon)
                </a>
              </button>
  
              <button className="mt-4 w-full bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700 focus:outline-none focus:shadow-outline">
                <a href="/gallery" className="block text-center">
                  Prompt Builder (Coming Soon)
                </a>
              </button>
            </div>
            <br></br>
            <h1 className="text-1xl font-bold mb-8 text-center">Built by Tech in Schools Initiative.</h1>
          </div>

  
{/* Right Side (Image Gallery) */}
<div className="flex-grow pl-2 lg:pl-0 pr-6"> {/* Use flex-grow to take up remaining width */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
    {imageUrls.map((image, index) => (
      <div
        key={index}
        className={`relative rounded-lg overflow-hidden cursor-pointer ${image.selected ? 'border-2 border-blue-500' : ''}`}
        onClick={() => handleOpenLightbox(index)}
      >
        <div style={{ paddingBottom: '100%' }} className="relative">
          <img src={image.imageUrl} alt="Generated image" className="absolute w-full h-full object-cover top-0 left-0" />
          {/* <div className="absolute top-2 right-2">
            <input
              type="checkbox"
              checked={image.selected}
              onChange={() => handleToggleImageSelection(index)}
              className="m-2"
            />
          </div> */}
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
           onMovePrevRequest={() => setLightboxIndex((lightboxIndex + imageUrls.length - 1) % imageUrls.length)}
           onMoveNextRequest={() => setLightboxIndex((lightboxIndex + 1) % imageUrls.length)}
           toolbarButtons={[
             <button
               onClick={() => downloadImage(imageUrls[lightboxIndex].imageUrl, `${prompt}.jpg`)}
               className="text-white p-1 rounded hover:bg-blue-700 focus:outline-none"
               style={{ backgroundColor: 'green', fontSize: '12px', fontWeight: 'normal', height: '33px',width: '90px', lineHeight: '24px' }}
             >
               Download
             </button>,
             // other default toolbar buttons can be added here
           ]}
         />
          )}
        </div>
      </div>
    </div>
  );
}
