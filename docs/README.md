# Pixio Community Lite Edition

Introducing Pixio Community Lite Edition, a cutting-edge web application designed to breathe life into your creativity. Imagine being able to transform simple textual prompts into stunning visual art. With Pixio, that imagination becomes a reality.

Built on the foundation of various advanced AI models, Pixio Community Lite Edition empowers users to generate stable and visually captivating images by merely entering a prompt. Whether you're an artist looking to explore new horizons or a hobbyist seeking to express yourself in a novel way, Pixio offers a seamless experience that caters to your artistic desires.

Here's how it works:
1. **Enter Your Prompt**: Start with a thought, an idea, or even a mood. Type it into Pixio, and watch as the platform interprets your words.
2. **Select Your Model**: Choose from a range of AI models, each with its unique style and capability. From abstract to realistic, Pixio has it all.
3. **Generate and Admire**: With a click of a button, your prompt becomes a visual masterpiece. It's art at the speed of thought.
4. **Share and Connect**: Want to showcase your creation? Pixio allows you to send your generated images directly to a Discord channel, bridging creativity and community.

Pixio Community Lite Edition is more than just a tool; it's a community of creators, innovators, and dreamers. It's where words meet art, and imagination meets reality. Join us today, and take the first step on a journey filled with endless creative possibilities.


# New UI coming soon!

![image](https://github.com/rossman22590/pixio-community-lite/assets/6137292/932f8e7a-0c37-4f0e-a30e-d0f7b1495777)


## Technologies Used

- React: A JavaScript library for building user interfaces.
- Axios: A popular library for making HTTP requests.
- react-image-lightbox: A React component for displaying images in a lightbox.
- Material-UI: A popular React UI framework that provides pre-built components.
- discord.js: A powerful JavaScript library for interacting with the Discord API.
- Prodia: An AI model API for image generation.
- OpenAI: A leading provider of AI models and APIs.
- Upstash: A serverless Redis database for caching and data storage.
- Vercel: A cloud platform for deploying and hosting web applications.
- Next.js: A React framework for building server-rendered and statically exported applications.
- Tailwind CSS: A utility-first CSS framework for building responsive designs.

## Demo

To see a live demo of Pixio Community Lite Edition, you can visit the following link: [Demo](https://pixio-community-lite.vercel.app/)

## Getting Started

To get a local copy of Pixio Community Lite Edition up and running, follow these steps:

1. Clone the repository
2. Navigate to the project directory
3. Install the dependencies: `npm install`
4. Start the development server: `npm start`
5. Open your web browser and visit: `http://localhost:3000`

## Usage

Macro crisp quality, head, solo focus, sharp focus, complex 3d render ultra-detailed, an extremely delicate and beautiful girl, ((half body portrait:1.1)), looking at viewer, 18 yo, blonde with a bun, emerald green eyes, (silver plate mail that has gold outlines:1.3), real soft lustrous human skin, perfect skin, vibrant details, hyper realistic, beautiful background (medieval castle interior:1.2), octane render, 8k, best quality, masterpiece, extremely detailed, CG ,unity, wallpaper, (realistic, photo-realistic:1.37), Amazing, finely detail, physically-based rendering, masterpiece, best quality, official art, extremely detailed CG unity 8k wallpaper,


Prompt 1: epic realistic,bright sunny day, daylight on mars, mars, outside,bright sky, (((sexy spacesuit, havey boots, sexy woman, see-through helmet, straps, belts, black jeans, full body, zoomed out, detailed costume, utility belt))) long slender legs 80mm, sexy woman wearing an astronaut helmet. (((winona ryder,sci-fi, science fiction, spacex fashion, beautiful face))) ((pretty face)),mars background daylight, (((full body, athletic body, action pose, sexy detailed spacesuit, slender long legs))) dusty atmosphere, fog john singer sarget, blue pallette, mars background, (hyperrealism, soft light, sharp:1.2), soft light, sharp, (cinematic, teal and orange:0.85), (muted colors, dim colors, soothing tones:1.3), low saturation, (hyperdetailed:1.2), (intricate details:1.12), hdr, (intricate details, hyperdetailed:1.15), faded, (neutral colors:1.2), art, (hdr:1.5), (muted colors:1.1), (pastel:0.2), hyperdetailed, (artstation:1.4), warm lights, dramatic light, (intricate details:1.2), vignette, natural background, rutkowski

bad face, no identical eyes, bad hands, bad drawed mouth, bad detailed eyes, bad mouth,bad quality, deformities, lowres, polar lowres, bad anatomy, bad face, bad hands, bad body, bad feet, bad proportions, {bad leg}, {more legs}, worst quality, low quality, normal quality, gross proportions, blurry, poorly drawn, text,error, missing fingers, missing arms, missing legs, short legs, extra digit, indoors, out of frame, [petite], low background, distorted perspective, canvas frame, cartoon, 3d, ((disfigured)), ((bad art)), ((deformed)),((extra limbs)),((close up)),((b&w)), wierd colors, blurry, (((duplicate))), ((morbid)), ((mutilated)), [out of frame], extra fingers, mutated hands, ((poorly drawn hands)), ((poorly drawn face)), (((mutation))), (((deformed))), ((ugly)), blurry, ((bad anatomy)), (((bad proportions))), ((extra limbs)), cloned face, (((disfigured))), out of frame, ugly, extra limbs, (bad anatomy), gross proportions, (malformed limbs), ((missing arms)), ((missing legs)), (((extra arms))), (((extra legs))), mutated hands, (fused fingers), (too many fingers), (((long neck))), Photoshop, video game, ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, mutation, mutated, extra limbs, extra legs, extra arms, disfigured, deformed, cross-eye, body out of frame, blurry, bad art, bad anatomy, 3d render, canvas frame, cartoon, 3d, ((disfigured)), ((bad art)), ((deformed)),((extra limbs)),((close up)),((b&w)), wierd colors, blurry, (((duplicate))), ((morbid)), ((mutilated)), [out of frame], extra fingers, mutated hands, ((poorly drawn hands)), ((poorly drawn face)), (((mutation))), (((deformed))), ((ugly)), blurry, ((bad anatomy)), (((bad proportions))), ((extra limbs)), cloned face, (((disfigured))), out of frame, ugly, extra limbs, (bad anatomy), gross proportions, (malformed limbs), ((missing arms)), ((missing legs)), (((extra arms))), (((extra legs))), mutated hands, (fused fingers), (too many fingers), (((long neck))), ugly

cfg is 7 
Karras sampler
steps 13

1. Enter a prompt in the "Prompt" input field.
2. Enter a negative prompt in the "Negative Prompt" input field.
3. Select one or more AI models from the available options.
4. Click the "Generate Image" button to generate images based on the selected models.
5. Optionally, click on generated images to open them in a lightbox.
6. Select the images you want to send to Discord by checking the corresponding checkboxes.
7. Click the "Send to Gallery" button to send the selected images to Discord.

## Prompt Moderation

Pixio Community Lite Edition performs prompt moderation to ensure that the entered prompts do not contain inappropriate content. It checks for prohibited words such as "nude," "naked," and "pussy." If a prompt contains any of these prohibited words, the generation process will be canceled, and an error message will be displayed.

## Models

Pixio Community Lite Edition supports the following AI models for image generation:

- Analog Diffusion v1.0
- Anything v3.0
- Anything v4.5
- Anything V5
- Orange Mix AOM3A3
- Deliberate v2
- Dreamlike Diffusion 1.0
- Dreamlike Diffusion 2.0
- Dreamshaper 5 BakedVae
- Dreamshaper 6 BakedVae
- Elddreths Vivid Mix
- Lyriel v15
- Meinamix MeinaV9
- Openjourney V4
- Portrait+ 1.0
- Realistic Vision V2.0
- Rev Animated v122
- Riffusion Model v1
- SDV1 4
- Pruned Emaonly v1-5
- Shonins Beautiful v10
- Theallys Mix II Churned
- Timeless 1.0

Feel free to add more models to the `modelMap` object in the code.

## Deployment

To deploy Pixio Community Lite Edition to a production environment, follow these steps:

1. Build the production-ready code: `npm run build`
2. Deploy the generated `build` folder to Vercel or your preferred hosting service.

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports
