# Pixio Studio

The open-source AI media studio for Prodia.

Pixio gives you three connected creative surfaces in one Next.js app:

- Studio: fast model runs, parallel outputs, remix actions, cost tracking.
- Canvas: a Canva-style AI design board powered by Konva.
- Nodes: a React Flow workflow graph for chaining models like a lightweight ComfyUI.

Bring your own Prodia API key, run locally, or deploy it for a team. Keys entered in the UI are stored in the browser. A server-side `PRODIA_KEY` can also be configured as an optional fallback for hosted deployments.

![Pixio Studio](https://pixiomedia.nyc3.digitaloceanspaces.com/uploads/1782546670680-823e0743-3ff2-4252-98d9-6f45c5bd00b8.png)

## Contents

- [Features](#features)
- [How The App Works](#how-the-app-works)
- [Supported AI Operations](#supported-ai-operations)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Deploy](#deploy)
- [Vercel Deployment](#vercel-deployment)
- [Docker Deployment](#docker-deployment)
- [Generic Node Deployment](#generic-node-deployment)
- [Production Notes](#production-notes)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Features

- Three modes: Studio, Canvas, and Nodes.
- Prodia v2 inference through a single app route: `POST /api/job`.
- Image, video, audio, SVG, masks, labels, and utility operations.
- Multipart upload pipeline for input-based jobs.
- Shared gallery across surfaces with local persistence.
- Model catalog with operation metadata and defaults.
- Exact Prodia cost tracking through `?price=true`.
- AI prompt remix and image-to-prompt helpers when `OPENAI_API_KEY` is set.
- Browser-only Prodia key storage for bring-your-own-key use.
- Optional server-side Prodia fallback key for deployed instances.
- Pink/purple accent-driven UI with light and dark modes.
- Keyboard shortcuts and command palette.
- React Flow node graph with typed ports and connection validation.
- Konva canvas with text, shapes, upload, AI actions, mask/inpaint flow, and PNG export.

## How The App Works

Pixio is a Next.js Pages Router app.

The browser talks to local API routes:

- `pages/api/job.ts` proxies Prodia v2 inference jobs.
- `pages/api/assist.ts` rewrites prompts with OpenAI when configured.
- `pages/api/vision.ts` creates image-to-prompt descriptions with OpenAI when configured.

The UI is split into three modes:

- `components/studio/RegularSurface.tsx` for Studio.
- `components/studio/canvas/CanvasStudio.tsx` for Canvas.
- `components/studio/nodes/NodeStudio.tsx` for Nodes.

The model and operation registry lives in:

- `lib/prodia/catalog.ts`
- `lib/prodia/config.ts`
- `lib/prodia/client.ts`
- `lib/graph/registry.ts`
- `lib/graph/engine.ts`

## Supported AI Operations

The current catalog covers the core creative operations plus utility and analysis jobs:

| Operation | Examples | Surfaces |
|---|---|---|
| `txt2img` | FLUX, Stable Diffusion, Gemini, Seedream, Recraft | Studio, Canvas, Nodes |
| `img2img` | FLUX restyle, SD restyle | Studio, Canvas, Nodes |
| `edit` | FLUX Kontext, Qwen Image Edit, Seedream Edit | Studio, Canvas, Nodes |
| `inpaint` | SDXL/SD inpaint with mask input | Canvas, Nodes |
| `upscale` | HYPIR upscale | Studio, Canvas, Nodes |
| `removebg` | Remove Background | Studio, Canvas, Nodes |
| `segment` | SAM2, SAM3, BiRefNet | Studio, Canvas, Nodes |
| `classify` | ViT labels, NSFW labels | Studio, Canvas, Nodes |
| `facerestore` | Face Restore | Studio, Canvas, Nodes |
| `vectorize` | Recraft text-to-SVG | Studio, Canvas, Nodes |
| `txt2vid` | Veo, Wan, Kling, Sora 2, Pruna | Studio, Nodes |
| `img2vid` | Veo Animate, Sora 2 Pro Animate, Pruna Animate | Studio, Nodes |
| `vid2vid` | Runway Gen-4 video transform | Nodes |
| `aud2vid` | Pruna audio-to-video | Nodes |

Model availability and pricing are controlled by Prodia. If a model changes upstream, update `lib/prodia/catalog.ts` and the corresponding config defaults in `lib/prodia/config.ts`.

## Requirements

- Node.js 20 recommended.
- npm 10+ recommended.
- A Prodia API key for generation.
- Optional OpenAI API key for prompt remix and vision helpers.

## Quick Start

```bash
git clone https://github.com/rossman22590/pixio-community-lite-edition.git
cd pixio-community-lite-edition
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:3000
```

Paste a Prodia API key in the app with the `API key` button. The browser stores it in `localStorage` under `PIXIO_API_KEY`.

If port `3000` is already taken:

```bash
npm run dev -- -p 3001
```

Then open:

```text
http://localhost:3001
```

## Environment Variables

All variables are optional for local use. The app works with a Prodia key pasted into the UI.

| Variable | Required | Purpose |
|---|---:|---|
| `PRODIA_KEY` | No | Server-side fallback key used only when the request body has no API key. Useful for hosted/team deployments. |
| `OPENAI_API_KEY` | No | Enables AI prompt remix in `/api/assist` and image-to-prompt in `/api/vision`. |
| `OPENAI_MODEL` | No | Overrides the OpenAI model used by `/api/assist`. |
| `OPENAI_VISION_MODEL` | No | Overrides the OpenAI model used by `/api/vision`. |

Example `.env`:

```bash
PRODIA_KEY=your_prodia_key_here
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-5.5
OPENAI_VISION_MODEL=gpt-5.5
```

Security model:

- If a user pastes a Prodia key in the UI, that key is sent only to your own `/api/job` route and then to Prodia.
- If `PRODIA_KEY` is set on the server, users can generate without entering their own key.
- Do not expose `PRODIA_KEY` as `NEXT_PUBLIC_PRODIA_KEY`.
- Do not commit `.env`.

## Available Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run type-check
```

Runs TypeScript.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Runs the production build after `npm run build`.

## Deploy

Before deploying, verify locally:

```bash
npm run type-check
npm run build
```

Decide how hosted users will authenticate with Prodia:

- Bring-your-own-key: do not set `PRODIA_KEY`; users paste their own Prodia key in the UI.
- Shared hosted key: set `PRODIA_KEY` in the hosting provider's environment variables.
- Hybrid: set `PRODIA_KEY`, but users can still paste their own key to override it for their browser session.

For public deployments, bring-your-own-key is the safest default. A shared `PRODIA_KEY` lets anyone with access to the app spend against that key unless you add auth/rate limiting.

## Vercel Deployment

1. Push this repo to GitHub.
2. Create a new Vercel project from the repo.
3. Use the Next.js framework preset.
4. Keep the default install/build settings unless you have customized them:

```text
Install command: npm install
Build command: npm run build
Output directory: .next
```

5. Add environment variables in the Vercel project settings:

```text
PRODIA_KEY=optional_server_side_fallback
OPENAI_API_KEY=optional_openai_key
OPENAI_MODEL=optional_model_override
OPENAI_VISION_MODEL=optional_model_override
```

6. Deploy.

After deployment:

- Open the site.
- Press `API key`.
- Paste a Prodia key if you did not set `PRODIA_KEY`.
- Run a small image model first, such as FLUX Schnell, to verify `/api/job`.

Serverless timeout note:

`/api/job` proxies the Prodia response through a Next API route. Image jobs are usually a better fit for serverless hosts. Long video jobs can exceed some platform request limits. If video jobs time out on your host, deploy with Docker or another Node runtime with longer request timeouts.

## Docker Deployment

Build the image:

```bash
docker build -t pixio-studio .
```

Run with bring-your-own-key mode:

```bash
docker run --rm -p 3000:3000 pixio-studio
```

Run with a server-side Prodia fallback key:

```bash
docker run --rm -p 3000:3000 \
  -e PRODIA_KEY=your_prodia_key_here \
  -e OPENAI_API_KEY=your_openai_key_here \
  pixio-studio
```

PowerShell single-line version:

```powershell
docker run --rm -p 3000:3000 -e PRODIA_KEY=$env:PRODIA_KEY -e OPENAI_API_KEY=$env:OPENAI_API_KEY pixio-studio
```

Open:

```text
http://localhost:3000
```

## Generic Node Deployment

Use this for a VPS, Render, Railway, Fly.io, Azure App Service, or any host that runs a persistent Node process.

```bash
npm install
npm run build
npm run start
```

Set:

```bash
NODE_ENV=production
PORT=3000
PRODIA_KEY=optional_server_side_fallback
OPENAI_API_KEY=optional_openai_key
```

Put the app behind HTTPS in production. Prodia and OpenAI keys should be configured as environment variables or entered by users in the browser, never committed to the repo.

## Production Notes

### API route limits

The job route config currently allows:

```ts
bodyParser: { sizeLimit: '40mb' }
responseLimit: '40mb'
```

This is enough for normal image inputs and many generated outputs. Large video/audio jobs can exceed host limits. If that happens, use a host with larger body/response/time limits or move media transfer to object storage.

### Cost control

When `trackCost` is enabled, Pixio requests Prodia pricing with `?price=true` and displays per-job costs in the UI. On public deployments with a shared `PRODIA_KEY`, add your own auth or rate limits before inviting users.

### Keys and privacy

Browser-entered Prodia keys are stored in `localStorage`, not in the repo or database. Generated media and prompt history are stored locally in the browser through the app's local persistence layer.

### OpenAI helpers are optional

Without `OPENAI_API_KEY`, prompt remix and vision fall back to local heuristics. Generation still works as long as a Prodia key is available.

### Static export is not supported

This app needs API routes. Do not deploy it as a static-only export.

## Troubleshooting

### `No Prodia API key. Add yours in the app.`

Either paste a key in the UI or set `PRODIA_KEY` on the server.

### `Prodia 4xx` or model errors

Check:

- The selected model exists in `lib/prodia/catalog.ts`.
- The job type string matches Prodia's current type.
- Required inputs are connected in Nodes or selected in Canvas.
- The prompt is allowed by the local prompt guard.

### Upload or edit jobs fail

Input-based jobs are sent as multipart requests with a JSON `job` part and one or more binary `input` parts. Check image/audio/video file size and format. The current API route body limit is `40mb`.

### Video jobs time out

Use Docker or a persistent Node host with longer request limits. Some serverless platforms are not a good fit for long-running video generation responses.

### `Cannot find module .next/server/pages/_document.js`

Delete the build cache and rebuild:

```powershell
Remove-Item -Recurse -Force .next
npm run build
npm run dev
```

On macOS/Linux:

```bash
rm -rf .next
npm run build
npm run dev
```

### `ENOENT node_modules/react/index.js`

Reinstall dependencies:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

On macOS/Linux:

```bash
rm -rf node_modules
npm install
```

### Browserlist warning during build

The build can still succeed. To refresh browser data:

```bash
npx update-browserslist-db@latest
```

## Architecture

```text
components/studio/
  ApiKeyModal.tsx
  CommandPalette.tsx
  CompareView.tsx
  Inspector.tsx
  RegularSurface.tsx
  RemixBar.tsx
  SettingsMenu.tsx
  Sidebar.tsx
  canvas/
    CanvasStudio.tsx
    CanvasNodes.tsx
    AIPopover.tsx
    GeneratePanel.tsx
    MaskToolbar.tsx
    PropertiesPanel.tsx
  nodes/
    NodeStudio.tsx
    NodeTypes.tsx
    shared.tsx

lib/
  canvas/
    geometry.ts
    mask.ts
    types.ts
    useImage.ts
  graph/
    engine.ts
    registry.ts
    store.ts
  prodia/
    catalog.ts
    client.ts
    config.ts
    types.ts
  studio/
    store.ts
    theme.ts
    useGenerate.ts
    useRemix.ts

pages/
  index.tsx
  api/
    job.ts
    assist.ts
    vision.ts
```

## Contributing

Good first areas:

- Add or update Prodia model definitions in `lib/prodia/catalog.ts`.
- Add operation defaults in `lib/prodia/config.ts`.
- Improve Canvas actions in `components/studio/canvas/AIPopover.tsx`.
- Improve graph execution in `lib/graph/engine.ts`.
- Add UI polish while keeping colors driven by CSS variables from `lib/studio/theme.ts`.

Before opening a PR:

```bash
npm run type-check
npm run build
```

## License

MIT. See [LICENSE](./LICENSE).
