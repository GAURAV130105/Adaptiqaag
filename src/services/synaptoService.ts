import { GoogleGenAI } from "@google/genai";
import { TranscriptSegment } from "../types";

export interface SynaptoMessage {
  role: 'user' | 'model';
  text: string;
  videoResults?: {
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
  }[];
}

// Lazy initialization of the AI client
let aiClient: any = null;
let lastUsedKey: string | null = null;
let lastRequestTime = 0;
const MIN_REQUEST_GAP = 4500; // 4.5 seconds between requests (Stay under 15 RPM)

function getAI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  
  if (!aiClient || apiKey !== lastUsedKey) {
    if (!apiKey) {
      console.warn("No Gemini API key found (VITE_GEMINI_API_KEY or GEMINI_API_KEY). Chatbot will be disabled.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
    lastUsedKey = apiKey;
  }
  return aiClient;
}

/** Maps a raw Gemini API error into a clear user-facing message */
function parseGeminiError(err: any): string {
  const msg: string = err?.message || err?.toString() || 'Unknown error';
  const status: number = err?.status || err?.httpErrorCode || 0;

  if (status === 400 || msg.includes('API_KEY_INVALID') || msg.includes('not valid') || msg.includes('keyInvalid'))
    return '❌ Invalid API key. Open .env and replace VITE_GEMINI_API_KEY with a valid key from https://aistudio.google.com/apikey';
  if (status === 403 || msg.includes('PERMISSION_DENIED') || msg.includes('permission_denied'))
    return '❌ API key lacks permission. Enable the Gemini API for this key in Google Cloud Console.';
  if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('rate limit'))
    return '⏳ Gemini quota exceeded. Wait a moment and try again, or upgrade your API plan.';
  if (status === 503 || msg.includes('UNAVAILABLE') || msg.includes('503'))
    return '🔌 Gemini service temporarily unavailable. Please try again in a few seconds.';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch'))
    return '🌐 Network error. Check your internet connection and try again.';
  return `⚠️ AI Error: ${msg}`;
}

export const synaptoService = {
  /**
   * Quick check: returns null if OK, or an error string if the key/network is broken.
   */
  async validateKey(): Promise<string | null> {
    // Basic rate limit guard
    const now = Date.now();
    const waitTime = Math.max(0, MIN_REQUEST_GAP - (now - lastRequestTime));
    if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
    lastRequestTime = Date.now();

    const ai = getAI();
    if (!ai) return "No API key found. Set VITE_GEMINI_API_KEY in your .env file.";
    try {
      await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: "Say: OK" }] }],
        config: { temperature: 0, maxOutputTokens: 4 }
      });
      return null; // all good
    } catch (err: any) {
      return parseGeminiError(err);
    }
  },

  /**
   * Generates a context-aware response from the Synapto AI Guide
   */
  async getResponse(
    userMessage: string,
    history: SynaptoMessage[],
    context: { transcript?: TranscriptSegment[], currentSegment?: TranscriptSegment | null }
  ) {
    // Basic rate limit guard
    const now = Date.now();
    const waitTime = Math.max(0, MIN_REQUEST_GAP - (now - lastRequestTime));
    if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
    lastRequestTime = Date.now();

    const ai = getAI();
    if (!ai) throw new Error("No API key found. Set VITE_GEMINI_API_KEY in your .env file.");

    // Format conversation history for Gemini SDK
    const contents = history
      .filter(m => m.text && m.text.trim()) // skip empty messages
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    const contextPrompt = `[System Instructions]
You are "Synapto", an AI accessibility guide. Be supportive, patient, and inclusive.
Explain complex concepts simply. Keep answers concise (2-4 sentences max).
Currently playing segment: "${context.currentSegment?.text || 'None'}"`;

    contents.push({
      role: 'user',
      parts: [{ text: `${contextPrompt}\n\nUser: ${userMessage}` }]
    });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: { temperature: 0.7, topP: 0.8, topK: 40 }
      });
      return response.text || "I'm here to help — could you rephrase that?";
    } catch (err: any) {
      throw new Error(parseGeminiError(err));
    }
  }
};
