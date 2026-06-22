/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Translate Service — Converts text to sign language glosses via Gemini AI
 * Inspired by Kozha Translate's NLP pipeline (spaCy → HamNoSys → SiGML),
 * but using Gemini for the NLP step and Synaptoo's own avatar for rendering.
 */

import { GoogleGenAI } from "@google/genai";
import { TranslateGloss } from "../types";
import { SIGN_LEXICON } from "../lib/signLexicon";

let aiClient: any = null;
let lastUsedKey: string | null = null;
let lastRequestTime = 0;
const MIN_REQUEST_GAP = 4500; // 4.5 seconds between requests (Stay under 15 RPM)

function getAI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  
  if (!aiClient || apiKey !== lastUsedKey) {
    if (!apiKey) {
      console.warn("VITE_GEMINI_API_KEY not set. Translation will use offline fallback.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
    lastUsedKey = apiKey;
  }
  return aiClient;
}

/** All glosses we have actual poses for */
const KNOWN_GLOSSES = new Set(Object.keys(SIGN_LEXICON));

/** Finger-spell a word into individual letter glosses */
function fingerSpell(word: string): TranslateGloss[] {
  return word
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((letter) => ({
      gloss: `FS:${letter}`,
      word: letter,
      reviewed: true,
      duration: 0.4,
    }));
}

/**
 * Simple offline tokenizer fallback when Gemini is unavailable.
 * Splits text into words and maps them to glosses.
 */
function offlineTokenize(text: string, strictMode: boolean): TranslateGloss[] {
  const words = text
    .replace(/[^\w\s'-]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const glosses: TranslateGloss[] = [];

  for (const word of words) {
    const upper = word.toUpperCase().replace(/[^A-Z]/g, "");
    if (!upper) continue;

    if (KNOWN_GLOSSES.has(upper)) {
      glosses.push({
        gloss: upper,
        word,
        reviewed: true,
        duration: 0.8,
      });
    } else if (strictMode) {
      // Strict mode: finger-spell unknown words
      glosses.push(...fingerSpell(word));
    } else {
      // Lenient mode: still show the gloss (avatar will use hash-based fallback)
      glosses.push({
        gloss: upper,
        word,
        reviewed: false,
        duration: 0.8,
      });
    }
  }

  return glosses;
}

export const translateService = {
  /**
   * Translate text into sign language glosses using Gemini AI.
   */
  translateToGlosses: async (
    text: string,
    sourceLang: string = "English",
    targetSignLang: string = "ASL",
    strictMode: boolean = false
  ): Promise<TranslateGloss[]> => {
    // Basic rate limit guard
    const now = Date.now();
    const waitTime = Math.max(0, MIN_REQUEST_GAP - (now - lastRequestTime));
    if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
    lastRequestTime = Date.now();

    const ai = getAI();

    if (!ai) {
      // Offline fallback
      return offlineTokenize(text, strictMode);
    }

    try {
      const knownGlossList = Array.from(KNOWN_GLOSSES).join(", ");

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert sign language linguist specializing in ${targetSignLang}.

The user typed the following text in ${sourceLang}:
"${text}"

Task: Convert this into a sequence of sign language glosses suitable for a 3D avatar to perform.

Rules:
1. Break the sentence into individual sign glosses (usually one per concept/word).
2. Use UPPERCASE for each gloss.
3. Omit grammar particles that don't have signs (articles "a", "the", etc.) unless they change meaning.
4. For proper nouns or words without a standard sign, use "FS:" prefix for finger-spelling (e.g. "FS:A", "FS:L", "FS:E", "FS:X").
5. Reorder glosses to follow ${targetSignLang} grammar (e.g. ASL often uses Topic-Comment order).
6. Here are the glosses we have reviewed poses for: ${knownGlossList}
7. Mark each gloss as "reviewed": true if it's in the above list, otherwise false.
8. Set a reasonable duration (0.4-1.2 seconds) based on sign complexity.

Return a valid JSON array:
[{"gloss": "HELLO", "word": "hello", "reviewed": true, "duration": 0.8}]

Return ONLY the JSON array, nothing else.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI response");

      // More robust JSON extraction
      let cleaned = responseText.trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) throw new Error("AI did not return an array");

      // Validate and apply strict mode
      const validated: TranslateGloss[] = parsed.map((item: any) => {
        const gloss = String(item.gloss || "").toUpperCase();
        const isReviewed = KNOWN_GLOSSES.has(gloss) || gloss.startsWith("FS:");

        return {
          gloss,
          word: String(item.word || ""),
          reviewed: isReviewed,
          duration: Math.max(0.3, Math.min(1.5, Number(item.duration) || 0.8)),
        };
      });

      // In strict mode, finger-spell unreviewed glosses
      if (strictMode) {
        const result: TranslateGloss[] = [];
        for (const g of validated) {
          if (!g.reviewed && !g.gloss.startsWith("FS:")) {
            result.push(...fingerSpell(g.word || g.gloss));
          } else {
            result.push(g);
          }
        }
        return result;
      }

      return validated;
    } catch (error) {
      console.error("Translation AI error, falling back to offline:", error);
      return offlineTokenize(text, strictMode);
    }
  },

  /** Available source languages */
  sourceLanguages: [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "nl", label: "Nederlands" },
    { code: "pl", label: "Polski" },
    { code: "el", label: "Ελληνικά" },
    { code: "hi", label: "हिन्दी" },
    { code: "kk", label: "Қазақша" },
  ],

  /** Available target sign languages */
  targetSignLanguages: [
    { code: "asl", label: "ASL (American)" },
    { code: "bsl", label: "BSL (British)" },
    { code: "isl", label: "ISL (Indian)" },
    { code: "dgs", label: "DGS (German)" },
    { code: "lsf", label: "LSF (French)" },
    { code: "pjm", label: "PJM (Polish)" },
    { code: "ngt", label: "NGT (Dutch)" },
  ],
};
