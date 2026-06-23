import { create } from 'zustand';
import { AppState, AccessibilitySettings, TranscriptSegment, TranslateGloss, TranslateSettings } from '../types';

interface ExtendedAppState extends AppState {
  seekTime: number | null;
  seekTo: (time: number) => void;
  // Translate mode
  translateMode: boolean;
  setTranslateMode: (mode: boolean) => void;
  translateInput: string;
  setTranslateInput: (text: string) => void;
  translateGlosses: TranslateGloss[];
  setTranslateGlosses: (glosses: TranslateGloss[]) => void;
  currentGlossIndex: number;
  setCurrentGlossIndex: (index: number) => void;
  isTranslating: boolean;
  setIsTranslating: (v: boolean) => void;
  translateSettings: TranslateSettings;
  setTranslateSettings: (s: Partial<TranslateSettings>) => void;
  isPlayingTranslation: boolean;
  setIsPlayingTranslation: (v: boolean) => void;
  // RAG State
  ragEnabled: boolean;
  setRagEnabled: (enabled: boolean) => void;
  grokConfigured: boolean;
  setGrokConfigured: (configured: boolean) => void;
  uploadedDocuments: any[];
  setUploadedDocuments: (docs: any[]) => void;
}

export const useStore = create<ExtendedAppState>((set, get) => ({
  // UI Settings
  settings: {
    theme: 'light',
    dyslexiaFont: false,
    fontSize: 1,
    focusMode: false,
    highContrast: false,
    speechRate: 1,
    avatarIndex: 0,
    voiceAssistant: false,
    reducedMotion: false,
    textToSpeech: false,
    signLanguageMode: false,
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }));
  },

  toggleFocusMode: () => {
    const { settings, updateSettings } = get();
    updateSettings({ focusMode: !settings.focusMode });
  },

  // YouTube State
  videoUrl: null,
  videoTitle: '',
  setVideo: (url, title) => set({ videoUrl: url, videoTitle: title, currentTime: 0, currentSegment: null }),
  currentTime: 0,
  seekTime: null,
  seekTo: (time) => set({ seekTime: time }),
  setCurrentTime: (time) => {
    const { transcript, currentSegment } = get();
    let current = transcript.find(
      (seg) => time >= seg.startTime && time <= seg.endTime
    );

    // Infinite Sign Stream Fallback: If video is playing but transcript ended
    if (!current && get().isPlaying && transcript.length > 0) {
      current = {
        startTime: time,
        endTime: time + 5,
        text: "Analyzing continuous audio stream...",
        signAnimation: "listen",
        glosses: ["WATCH", "SIGN", "BRIDGE"]
      };
    }

    set({ currentTime: time, currentSegment: current || null });
  },
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  // Transcript
  transcript: [],
  setTranscript: (segments) => set({ 
    transcript: segments.map(seg => ({
      ...seg,
      glosses: seg.glosses?.map(g => g.toUpperCase().trim()) || []
    })) 
  }),
  currentSegment: null,

  // AI Gesture Recognition Analysis
  gesturalAnalysis: {
    accuracy: 0.98,
    confidence: 0.99,
    status: 'idle',
    feedback: 'Calibration complete. Waiting for motion...'
  },
  setGesturalAnalysis: (analysis) => set((state) => ({
    gesturalAnalysis: { ...state.gesturalAnalysis, ...analysis }
  })),

  // User Webcam Recognition
  userGesture: null,
  setUserGesture: (gesture) => set({ userGesture: gesture }),

  // View Mode
  viewMode: 'standard',
  setViewMode: (mode) => set({ viewMode: mode }),

  // Translate Mode
  translateMode: false,
  setTranslateMode: (mode) => set({ translateMode: mode }),
  translateInput: '',
  setTranslateInput: (text) => set({ translateInput: text }),
  translateGlosses: [],
  setTranslateGlosses: (glosses) => set({ translateGlosses: glosses, currentGlossIndex: 0 }),
  currentGlossIndex: 0,
  setCurrentGlossIndex: (index) => set({ currentGlossIndex: index }),
  isTranslating: false,
  setIsTranslating: (v) => set({ isTranslating: v }),
  translateSettings: { sourceLang: 'English', targetSignLang: 'ASL', strictMode: false, speed: 1 },
  setTranslateSettings: (s) => set((state) => ({ translateSettings: { ...state.translateSettings, ...s } })),
  isPlayingTranslation: false,
  setIsPlayingTranslation: (v) => set({ isPlayingTranslation: v }),

  // RAG State
  ragEnabled: true,
  setRagEnabled: (enabled) => set({ ragEnabled: enabled }),
  grokConfigured: false,
  setGrokConfigured: (configured) => set({ grokConfigured: configured }),
  uploadedDocuments: [],
  setUploadedDocuments: (docs) => set({ uploadedDocuments: docs }),
}));
