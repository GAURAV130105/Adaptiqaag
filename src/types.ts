
export type ThemeMode = 'light' | 'dark' | 'high-contrast';
export type DyslexiaMode = 'standard' | 'dyslexic';
export type ViewMode = 'standard' | 'interpretation';

export interface AccessibilitySettings {
  theme: ThemeMode;
  dyslexiaFont: boolean;
  fontSize: number; // 1 to 3
  focusMode: boolean;
  highContrast: boolean;
  speechRate: number;
  avatarIndex?: number;
  voiceAssistant?: boolean;
  reducedMotion?: boolean;
  textToSpeech?: boolean;
  signLanguageMode?: boolean;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  signAnimation?: string; // Reference to .fbx/.glb animation name
  glosses?: string[]; // Array of core concepts for sequential signing
}

export interface GestureAnalysis {
  accuracy: number;
  confidence: number;
  status: 'idle' | 'analyzing' | 'perfect' | 'drift' | 'low-fidelity';
  feedback: string;
}

export interface AppState {
  // UI Settings
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  toggleFocusMode: () => void;

  // YouTube / Sync State
  videoUrl: string | null;
  videoTitle: string;
  setVideo: (url: string, title: string) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  // Transcript Data
  transcript: TranscriptSegment[];
  setTranscript: (segments: TranscriptSegment[]) => void;
  currentSegment: TranscriptSegment | null;

  // AI Gesture Recognition Analysis
  gesturalAnalysis: GestureAnalysis;
  setGesturalAnalysis: (analysis: Partial<GestureAnalysis>) => void;

  // User Webcam Recognition
  userGesture: string | null;
  setUserGesture: (gesture: string | null) => void;

  // View Mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export interface TranslateGloss {
  gloss: string;
  word: string;
  reviewed: boolean;
  duration: number;
}

export interface TranslateSettings {
  sourceLang: string;
  targetSignLang: string;
  strictMode: boolean;
  speed: number;
}
