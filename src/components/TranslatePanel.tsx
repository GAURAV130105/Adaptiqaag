import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { translateService } from '../services/translateService';
import { SignMtInterpreter } from './SignMtInterpreter';
import { Mic, MicOff, Languages, Play, Pause, RotateCcw, Loader2, Shield, ShieldOff, ChevronDown, Zap, Waves, ExternalLink } from 'lucide-react';

export const TranslatePanel: React.FC = () => {
  const {
    translateInput, setTranslateInput,
    translateGlosses, setTranslateGlosses,
    currentGlossIndex, setCurrentGlossIndex,
    isTranslating, setIsTranslating,
    translateSettings, setTranslateSettings,
    isPlayingTranslation, setIsPlayingTranslation,
    settings,
  } = useStore();

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dark = settings.theme === 'dark';

  // Build the text that sign.mt should display.
  // When playing, show the current gloss word; otherwise show the full input.
  const interpreterText = isPlayingTranslation && translateGlosses.length > 0
    ? translateGlosses
        .slice(0, Math.max(currentGlossIndex + 1, 1))
        .map(g => g.word || g.gloss)
        .join(' ')
    : translateInput;

  // Speech recognition setup
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser'); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = translateSettings.sourceLang === 'English' ? 'en-US' : 'en-US';
    rec.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setTranslateInput(transcript);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
  }, [isRecording, translateSettings.sourceLang, setTranslateInput]);

  // Translate handler
  const handleTranslate = async () => {
    if (!translateInput.trim() || isTranslating) return;
    setIsTranslating(true);
    setIsPlayingTranslation(false);
    try {
      const glosses = await translateService.translateToGlosses(
        translateInput,
        translateSettings.sourceLang,
        translateSettings.targetSignLang,
        translateSettings.strictMode,
      );
      setTranslateGlosses(glosses);
      // Auto-play
      setCurrentGlossIndex(0);
      setIsPlayingTranslation(true);
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Playback engine - advance through glosses
  useEffect(() => {
    if (!isPlayingTranslation || translateGlosses.length === 0) return;
    if (currentGlossIndex >= translateGlosses.length) {
      setIsPlayingTranslation(false);
      return;
    }
    const gloss = translateGlosses[currentGlossIndex];
    const dur = (gloss.duration || 0.8) / translateSettings.speed;

    playbackTimerRef.current = setTimeout(() => {
      setCurrentGlossIndex(currentGlossIndex + 1);
    }, dur * 1000);

    return () => { if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current); };
  }, [isPlayingTranslation, currentGlossIndex, translateGlosses, translateSettings.speed]);

  const restart = () => { setCurrentGlossIndex(0); setIsPlayingTranslation(true); };
  const togglePlay = () => {
    if (translateGlosses.length === 0) return;
    if (currentGlossIndex >= translateGlosses.length) { restart(); return; }
    setIsPlayingTranslation(!isPlayingTranslation);
  };

  const currentGloss = translateGlosses[currentGlossIndex];

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* LEFT - Input Panel */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
        <div className={`rounded-[2rem] p-6 border-2 backdrop-blur-sm flex flex-col gap-4 ${dark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white shadow-xl'}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Text → Sign Language</span>
            </div>
            <button
              onClick={() => setTranslateSettings({ strictMode: !translateSettings.strictMode })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                translateSettings.strictMode
                  ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                  : dark ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
              }`}
              title="Strict mode: unreviewed signs are finger-spelled"
            >
              {translateSettings.strictMode ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
              Strict
            </button>
          </div>

          {/* Language selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className={`text-[8px] font-black uppercase tracking-widest mb-1 block ${dark ? 'text-white/30' : 'text-neutral-400'}`}>Source</label>
              <select
                value={translateSettings.sourceLang}
                onChange={(e) => setTranslateSettings({ sourceLang: e.target.value })}
                className={`w-full h-10 rounded-xl px-3 text-xs font-bold appearance-none cursor-pointer outline-none transition-all ${
                  dark ? 'bg-white/5 border border-white/10 text-white' : 'bg-neutral-50 border border-neutral-200 text-neutral-900'
                }`}
              >
                {translateService.sourceLanguages.map(l => (
                  <option key={l.code} value={l.label}>{l.label}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-[26px] h-3 w-3 pointer-events-none ${dark ? 'text-white/30' : 'text-neutral-400'}`} />
            </div>
            <div className="relative">
              <label className={`text-[8px] font-black uppercase tracking-widest mb-1 block ${dark ? 'text-white/30' : 'text-neutral-400'}`}>Sign Language</label>
              <select
                value={translateSettings.targetSignLang}
                onChange={(e) => setTranslateSettings({ targetSignLang: e.target.value })}
                className={`w-full h-10 rounded-xl px-3 text-xs font-bold appearance-none cursor-pointer outline-none transition-all ${
                  dark ? 'bg-white/5 border border-white/10 text-white' : 'bg-neutral-50 border border-neutral-200 text-neutral-900'
                }`}
              >
                {translateService.targetSignLanguages.map(l => (
                  <option key={l.code} value={l.label}>{l.label}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-[26px] h-3 w-3 pointer-events-none ${dark ? 'text-white/30' : 'text-neutral-400'}`} />
            </div>
          </div>

          {/* Text area */}
          <div className="relative">
            <textarea
              value={translateInput}
              onChange={(e) => setTranslateInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTranslate(); } }}
              placeholder="Type or paste text to translate into sign language..."
              rows={5}
              className={`w-full rounded-2xl p-4 text-sm font-medium resize-none outline-none transition-all ${
                dark ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-accent/40' : 'bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-300 focus:border-accent/40'
              }`}
            />
            <button
              onClick={toggleRecording}
              className={`absolute bottom-3 right-3 h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : dark ? 'bg-white/10 text-white/40 hover:bg-accent hover:text-white' : 'bg-neutral-200 text-neutral-500 hover:bg-accent hover:text-white'
              }`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>

          {/* Translate button */}
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !translateInput.trim()}
            className={`w-full h-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-lg disabled:opacity-40 flex items-center justify-center gap-2 ${
              dark ? 'bg-accent text-white hover:shadow-accent/30' : 'bg-accent text-white hover:shadow-accent/30'
            }`}
          >
            {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {isTranslating ? 'Translating...' : 'Translate to Sign'}
          </button>

          {/* Quick send to sign.mt directly */}
          {translateInput.trim() && (
            <a
              href={`https://rylo.com/sign/translate/?text=${encodeURIComponent(translateInput.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full h-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-2 ${
                dark
                  ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Rylo Translate
            </a>
          )}
        </div>

        {/* Gloss Output */}
        <AnimatePresence>
          {translateGlosses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[2rem] p-6 border-2 backdrop-blur-sm ${dark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white shadow-xl'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${dark ? 'text-white/40' : 'text-neutral-400'}`}>Gloss Sequence</span>
                <div className="flex items-center gap-2">
                  <button onClick={restart} className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${dark ? 'bg-white/10 text-white/60 hover:bg-accent hover:text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-accent hover:text-white'}`}>
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button onClick={togglePlay} className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${dark ? 'bg-white/10 text-white/60 hover:bg-accent hover:text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-accent hover:text-white'}`}>
                    {isPlayingTranslation ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              {/* Speed slider */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[8px] font-black uppercase tracking-widest ${dark ? 'text-white/30' : 'text-neutral-400'}`}>Speed</span>
                <input type="range" min="0.3" max="2" step="0.1" value={translateSettings.speed}
                  onChange={(e) => setTranslateSettings({ speed: parseFloat(e.target.value) })}
                  className="flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-accent bg-neutral-200"
                />
                <span className={`text-[9px] font-mono font-bold ${dark ? 'text-accent' : 'text-accent'}`}>{translateSettings.speed.toFixed(1)}x</span>
              </div>
              {/* Gloss chips */}
              <div className="flex flex-wrap gap-2">
                {translateGlosses.map((g, i) => (
                  <motion.button
                    key={i}
                    onClick={() => { setCurrentGlossIndex(i); setIsPlayingTranslation(true); }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      i === currentGlossIndex
                        ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-105'
                        : i < currentGlossIndex
                          ? dark ? 'bg-white/10 text-white/60 border-white/10' : 'bg-neutral-200 text-neutral-600 border-neutral-200'
                          : dark ? 'bg-white/5 text-white/40 border-white/5' : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {g.gloss}
                    {!g.reviewed && <span className="ml-1 text-amber-500 text-[7px]">●</span>}
                  </motion.button>
                ))}
              </div>
              {/* Source mapping */}
              {currentGloss && (
                <div className={`mt-4 pt-3 border-t flex items-center justify-between ${dark ? 'border-white/10' : 'border-neutral-100'}`}>
                  <div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${dark ? 'text-white/30' : 'text-neutral-400'}`}>Source → </span>
                    <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>"{currentGloss.word}"</span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    currentGloss.reviewed
                      ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  }`}>
                    {currentGloss.reviewed ? '✓ Reviewed' : 'Not reviewed'}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT - sign.mt Interpreter */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
        <div className={`relative flex-1 min-h-[480px] lg:min-h-0 lg:h-full w-full rounded-[3rem] border-4 shadow-2xl overflow-hidden ${
          dark ? 'bg-neutral-900 border-white/5' : 'bg-white border-neutral-100'
        }`}>
          <SignMtInterpreter
            text={interpreterText}
            isActive={isPlayingTranslation}
            label="Sign Interpreter — sign.mt"
          />
        </div>

        {/* Info Banner */}
        <div className={`rounded-2xl p-4 border flex items-start gap-3 ${
          dark ? 'bg-white/5 border-white/10' : 'bg-blue-50/80 border-blue-100'
        }`}>
          <Waves className="h-4 w-4 text-accent mt-0.5 shrink-0" />
          <div>
            <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${dark ? 'text-white/60' : 'text-neutral-700'}`}>
              Powered by Rylo Translate
            </p>
            <p className={`text-[9px] leading-relaxed ${dark ? 'text-white/30' : 'text-neutral-500'}`}>
              Real-time sign language translation powered by Rylo Translate.
              Text is sent to the interpreter automatically as you type or translate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
