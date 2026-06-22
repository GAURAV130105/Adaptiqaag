# 🧠 Synaptoo — AI-Powered Accessible Learning Platform

> A real-time, accessibility-first YouTube learning platform with a 3D sign language avatar, AI chatbot, gesture recognition, and live sign language interpretation — built for the deaf, hard-of-hearing, and neurodivergent communities.

---

## 📋 Table of Contents

1. [What is Synaptoo?](#1-what-is-synaptoo)
2. [Live Features](#2-live-features)
3. [Tech Stack](#3-tech-stack)
4. [AI Services & Integrations](#4-ai-services--integrations)
5. [Project Architecture](#5-project-architecture)
6. [Component Reference](#6-component-reference)
7. [State Management](#7-state-management)
8. [Services Reference](#8-services-reference)
9. [Environment Setup](#9-environment-setup)
10. [Running the Project](#10-running-the-project)
11. [Accessibility Features](#11-accessibility-features)
12. [FAQ & Troubleshooting](#12-faq--troubleshooting)
13. [Known Limitations](#13-known-limitations)
14. [Roadmap](#14-roadmap)

---

## 1. What is Synaptoo?

**Synaptoo** is an AI-powered, accessibility-first web application that allows users to:

- Search and watch **YouTube videos** with real-time captioning
- Get **live sign language interpretation** via sign.mt and a procedural 3D avatar
- Interact with an **AI chatbot** (Synapto) that understands the current video context
- **Record their own gestures** via camera and get instant ASL A–Z recognition
- Use **text-to-sign-language translation** for any typed or spoken text
- Customize the entire interface for **dyslexia, low vision, high contrast, and focus needs**

The platform is designed to be a **cognitive bridge** — making video-based learning accessible to users who rely on sign language or have other accessibility needs.

---

## 2. Live Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🎬 YouTube Search | ✅ Live | Search bar + YouTube Data API v3 |
| 🤖 Synapto AI Chatbot | ✅ Live | Gemini 2.0 Flash-powered conversational AI |
| 🤟 3D Sign Language Avatar | ✅ Live | Procedural humanoid with GLB model support |
| 🌐 sign.mt Live Interpreter | ✅ Live | Embedded iframe + new-tab fallback |
| ✋ Gesture Recognition (A–Z) | ✅ Live | MediaPipe hand tracking + custom ASL logic |
| 🗣️ Text-to-Sign Translation | ✅ Live | Gemini AI gloss generation → avatar animation |
| 🎙️ Voice Commands | ✅ Live | Web Speech API wake-word "Synapto" |
| 🎨 Accessibility Controls | ✅ Live | Theme, dyslexia font, high contrast, focus mode |
| 📊 Transcript Sync | ✅ Live | AI-generated timed segments synced to playback |
| 📖 Sign Dictionary | ✅ Live | Built-in ASL reference gloss library |
| 👁️ View Mode Toggle | ✅ Live | Standard / Interpretation / Focus layouts |

---

## 3. Tech Stack

### Frontend Core

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.0.1 | UI framework |
| **TypeScript** | ~5.8.2 | Type safety |
| **Vite** | 6.2.3 | Build tool & dev server |
| **TailwindCSS** | 4.1.14 | Utility-first CSS |
| **Motion (Framer)** | 12.23.24 | Animations & transitions |

### 3D Engine

| Technology | Version | Purpose |
|------------|---------|---------|
| **Three.js** | 0.184.0 | 3D rendering engine |
| **@react-three/fiber** | 9.6.1 | React bindings for Three.js |
| **@react-three/drei** | 10.7.7 | GLTF loading, OrbitControls, Environment maps |
| **@react-three/postprocessing** | 3.0.4 | Bloom, SSAO, Vignette, ChromaticAberration |
| **postprocessing** | 6.39.1 | Core postprocessing library |
| **three-stdlib** | — | SkeletonUtils for GLTF model cloning |

### AI & ML

| Technology | Version | Purpose |
|------------|---------|---------|
| **@google/genai** | 1.52.0 | Gemini 2.0 Flash API (v1beta endpoint) |
| **@mediapipe/tasks-vision** | 0.10.35 | Real-time hand gesture recognition |

### State & Server

| Technology | Version | Purpose |
|------------|---------|---------|
| **Zustand** | 5.0.13 | Global state management |
| **Express** | 4.22.1 | Local dev server (server.ts) |
| **tsx** | 4.21.0 | TypeScript runner for Express |
| **dotenv** | 17.2.3 | Environment variable loading |

### UI & Icons

| Technology | Version | Purpose |
|------------|---------|---------|
| **Lucide React** | 0.546.0 | Icon library |
| **clsx** | 2.1.1 | Conditional class names |
| **tailwind-merge** | 3.5.0 | Tailwind class deduplication |
| **react-error-boundary** | 6.1.1 | Safe 3D canvas error isolation |

---

## 4. AI Services & Integrations

### Google Gemini 2.0 Flash

The backbone AI for all text intelligence tasks.

- **SDK:** `@google/genai` v1.52.0
- **Model:** `gemini-2.0-flash` (NOT `gemini-1.5-flash` — that model is not available on v1beta)
- **API endpoint:** v1beta (used automatically by the SDK)
- **Key:** `VITE_GEMINI_API_KEY`

| Service | Function | What Gemini Does |
|---------|----------|-----------------|
| `synaptoService` | `validateKey()` | Tests the API key on chatbot open |
| `synaptoService` | `getResponse()` | Conversational AI chatbot with video context |
| `aiService` | `searchVideos()` | Recommends 4 YouTube video IDs for a query |
| `aiService` | `processVideoContent()` | Generates 8–12 timed transcript segments with ASL glosses |
| `aiService` | `simplifyText()` | Summarizes text to Grade 5 reading level |
| `translateService` | `translateToSign()` | Converts text → ordered ASL gloss token list |

### YouTube Data API v3

- **Key:** `VITE_YOUTUBE_API_KEY`
- **Endpoint:** `https://www.googleapis.com/youtube/v3/search`
- Returns `{videoId, title, channelTitle, thumbnails}` items
- Free tier: 10,000 units/day (each search = 100 units)

### sign.mt

- External AI-powered sign language translation service
- Embedded via `<iframe src="https://rylo.com/sign/translate/?text=<encoded text>">`
- Updates in real-time as the video transcript segment changes
- If iframe is blocked: graceful fallback with "Open sign.mt Live" button

### MediaPipe Tasks Vision

- **Model:** `gesture_recognizer.task` (float16, loaded from Google CDN)
- **Delegate:** CPU (for cross-device compatibility)
- Runs on every animation frame via `GestureRecognizer.recognizeForVideo()`
- Supplemented by custom A–Z ASL geometry detection using 21-point hand landmarks

### Web Speech API (Browser Native)

- No API key required
- Wake word: say **"Synapto"** to activate listening
- Text-to-speech auto-reads chatbot responses
- Chromium-based browsers only (Chrome, Edge, Brave)

---

## 5. Project Architecture

```
d:\synaptoo\
├── server.ts               # Express dev server (serves Vite app)
├── vite.config.ts          # Vite configuration
├── .env                    # API keys
│
└── src/
    ├── App.tsx             # Root: layout, search bar, view modes
    ├── main.tsx            # React DOM entry point
    ├── types.ts            # TypeScript interfaces
    │
    ├── components/
    │   ├── AvatarScene.tsx           # 3D signing avatar (Three.js)
    │   ├── YouTubePlayer.tsx         # YouTube IFrame API player
    │   ├── SignMtInterpreter.tsx     # sign.mt iframe component
    │   ├── SynaptoChat.tsx           # AI chatbot floating widget
    │   ├── TranslatePanel.tsx        # Text-to-sign translation UI
    │   ├── UserGestureRecognizer.tsx # Webcam hand gesture recognizer
    │   ├── AccessibilityControls.tsx # Settings panel
    │   ├── SignDictionary.tsx        # ASL gloss reference
    │   └── ViewModeToggle.tsx        # Layout switcher
    │
    ├── services/
    │   ├── aiService.ts        # Gemini: transcripts, search, simplify
    │   ├── synaptoService.ts   # Gemini: chatbot + key validation
    │   └── translateService.ts # Gemini: text → ASL glosses
    │
    ├── store/
    │   └── useStore.ts         # Zustand global store
    │
    └── lib/
        └── signLexicon.ts      # Hand pose data for ASL glosses
```

**Data flow (video selection):**
```
User clicks video → handleSelectVideo(url)
  → aiService.processVideoContent(url)   [Gemini generates transcript]
  → store.setVideo(url, title)
  → store.setTranscript(segments)
  → YouTubePlayer loads video
  → AvatarScene signs the current gloss
  → SignMtInterpreter updates iframe URL with current text
```

---

## 6. Component Reference

### `App.tsx` — Root Layout
- YouTube search bar with debounced input + real-time dropdown
- `handleVideoSearch()` — calls YouTube Data API v3
- `handleSelectVideo(url)` — calls `aiService.processVideoContent()`, updates store
- **3 view modes:** Standard (side-by-side), Interpretation (sign focus), Focus (minimal)

### `AvatarScene.tsx` — 3D Sign Language Avatar
- Two avatar modes:
  - **ProceduralSigner** — custom-built humanoid geometry (always works)
  - **HumanoidAvatar** — loads GLB models (Michelle, Soldier from threejs.org)
- Signing animation driven by `TranscriptSegment.glosses`
- Morph target lip sync (ARKit visemes: `mouthOpen`, `jawOpen`, `eyeBlinkLeft`)
- Lexicon-aware arm/hand poses from `signLexicon.ts`
- Head tracking follows the mouse cursor
- Postprocessing: Bloom, SSAO, Vignette, ChromaticAberration

### `YouTubePlayer.tsx` — Video Engine
- Injects YouTube IFrame API script dynamically
- Polls `getCurrentTime()` every 50ms for smooth avatar sync
- Shows `UserGestureHUD` — overlays detected sign
- Cinematic CRT scanline + lens glare overlay

### `SynaptoChat.tsx` — AI Chatbot
- API key validation banner on first open (green ✓ / red ✗)
- Conversation context: passes current video segment to Gemini
- Intent detection: "find/learn/search" → video search; YouTube URL → load video
- Voice mode with wake word "Synapto"
- TTS auto-reads responses
- Rich video result cards (thumbnail + title + description)

### `SignMtInterpreter.tsx` — Live Sign Language Interpreter
- Embeds `sign.mt` iframe with text pre-filled via URL parameter
- Auto-updates as transcript segments change
- 12-second timeout → fallback UI with "Retry" and "Open sign.mt Live"
- Status badge: Live (green pulse) / inactive

### `UserGestureRecognizer.tsx` — Hand Gesture Recognition
- Opens webcam on "Enable Gesture Rec" click
- MediaPipe recognizes gestures + custom A–Z ASL geometry detection
- YOLO bounding box + hand skeleton drawn on canvas overlay
- Detected sign → `useStore.setUserGesture()` → shown in video HUD

### `TranslatePanel.tsx` — Text-to-Sign Translation
- Types text → Gemini generates gloss list with durations
- Avatar enters Translation Mode and cycles through glosses

### `AccessibilityControls.tsx` — Settings Panel
- **Chroma:** Light (Solis) / Dark (Nox)
- **Perception:** High Contrast, OpenDyslexic font
- **Cognition:** Focus Protocol
- **Scale:** 3 font sizes (α β γ)

### `SignDictionary.tsx` — ASL Reference
- Browse ASL gloss vocabulary by category
- Click a gloss → avatar demonstrates the sign

### `ViewModeToggle.tsx` — Layout Switcher
- Standard / Interpretation / Focus modes

---

## 7. State Management

All shared state in a single Zustand store (`src/store/useStore.ts`):

```typescript
// Video
videoUrl: string | null
videoTitle: string
isPlaying: boolean
currentTime: number
seekTime: number | null
isLoading: boolean

// Transcript
transcript: TranscriptSegment[]
currentSegment: TranscriptSegment | null

// Gesture
userGesture: string | null

// Translation Mode
translateMode: boolean
translateGlosses: GlossEntry[]
currentGlossIndex: number
isPlayingTranslation: boolean

// Settings
settings: {
  theme: 'light' | 'dark'
  highContrast: boolean
  dyslexiaFont: boolean
  focusMode: boolean
  fontSize: 1 | 2 | 3
  speechRate: number
}
```

**`TranscriptSegment` type:**
```typescript
interface TranscriptSegment {
  startTime: number  // seconds
  endTime: number    // seconds
  text: string       // spoken text
  glosses: string[]  // ASL gloss tokens e.g. ["HELLO", "WORLD"]
}
```

---

## 8. Services Reference

```typescript
// aiService.ts
aiService.simplifyText(text)           → Promise<string>
aiService.searchVideos(query)          → Promise<VideoResult[]>
aiService.processVideoContent(url)     → Promise<TranscriptSegment[]>

// synaptoService.ts
synaptoService.validateKey()           → Promise<string | null>
synaptoService.getResponse(msg, history, context) → Promise<string>

// translateService.ts
translateService.translateToSign(text, sourceLang, targetSignLang) → Promise<GlossEntry[]>
```

---

## 9. Environment Setup

Create `.env` in the project root:

```env
# Gemini AI — chatbot, transcript, search, translation
VITE_GEMINI_API_KEY="your_gemini_key_here"

# YouTube Data API v3 — search bar
VITE_YOUTUBE_API_KEY="your_youtube_key_here"
```

**Get Gemini key:** https://aistudio.google.com/apikey (free, 60 RPM)

**Get YouTube key:**
1. https://console.cloud.google.com → Enable "YouTube Data API v3"
2. Credentials → Create API Key

> ⚠️ **Important:** Use model `gemini-2.0-flash` with `@google/genai` v1.52.0.  
> `gemini-1.5-flash` returns a 404 on the v1beta endpoint used by this SDK.

---

## 10. Running the Project

```bash
npm install      # Install all dependencies
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # TypeScript type check
```

---

## 11. Accessibility Features

| User Need | Feature |
|-----------|---------|
| Deaf / Hard of Hearing | sign.mt live interpreter, 3D signing avatar, ASL gesture recognizer, Sign Dictionary |
| Low Vision | High Contrast mode (yellow-on-black), 3 font sizes, TTS responses |
| Dyslexia | OpenDyslexic font toggle, AI text simplification |
| Cognitive Load | Focus Protocol (hides non-essential UI), simplified transcripts |
| Motor / Input | Voice commands ("Synapto" wake word), large touch targets, keyboard navigation |

---

## 12. FAQ & Troubleshooting

**Q: "AI Connection Failed — models/gemini-1.5-flash is not found for API version v1beta"**
> The `@google/genai` v1.52.0 SDK uses the v1beta endpoint, which does NOT support `gemini-1.5-flash`. All services now use `gemini-2.0-flash`.

**Q: "Invalid API key" in chatbot**
> Get a new key at https://aistudio.google.com/apikey and update `VITE_GEMINI_API_KEY` in `.env`. Restart the dev server.

**Q: YouTube search shows no results**
> Verify `VITE_YOUTUBE_API_KEY` is set and "YouTube Data API v3" is enabled in your Google Cloud project.

**Q: Avatar is not animating**
> The avatar requires: (1) a video loaded, (2) AI transcript generated, (3) video playing. It only signs when a segment is active.

**Q: sign.mt shows blank / blocked page**
> Use the "Open sign.mt Live" button to open it in a new tab. The 12-second timeout auto-triggers the fallback.

**Q: Gesture recognizer fails to start**
> Ensure camera permission is granted and you have internet access (MediaPipe model loads from CDN). Uses CPU delegate for max compatibility.

**Q: Voice commands don't work**
> Web Speech API requires a Chromium browser (Chrome, Edge, Brave). Firefox and Safari are not supported. Grant microphone permission.

---

## 13. Known Limitations

| Limitation | Details |
|------------|---------|
| Transcript accuracy | AI-generated approximations, not real captions. Real captions need yt-dlp + Whisper backend. |
| sign.mt embedding | May be blocked by browser CSP. New-tab link is the reliable fallback. |
| Gesture accuracy | ~70% for static letters. J and Z require motion (fall back to I and index-up). |
| Gemini quota | Free: 15 RPM / 1M tokens/day. Heavy use may hit rate limits. |
| YouTube quota | 10,000 units/day. Each search = 100 units. |
| GLB model loading | Loads from threejs.org CDN. Procedural avatar is used if CDN fails. |
| Mobile performance | 3D canvas is GPU-intensive. May lag on older devices. |

---

## 14. Roadmap

- [ ] Real captions via yt-dlp + OpenAI Whisper backend
- [ ] Upload your own RPM avatar model
- [ ] Trained ASL classifier (replace geometric detection)
- [ ] Multi-language sign support (BSL, ISL, LSF, Auslan)
- [ ] Offline mode (cache Gemini responses + MediaPipe model)
- [ ] User accounts via Firebase Auth
- [ ] Subtitle overlay on video player
- [ ] Playlist queue with seamless avatar sync

---

*Built with ❤️ for inclusive learning — Synaptoo v1.0*
