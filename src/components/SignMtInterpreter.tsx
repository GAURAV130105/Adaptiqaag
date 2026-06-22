import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { ExternalLink, Waves, Loader2, RefreshCw, Hand, Languages } from 'lucide-react';

interface SignMtInterpreterProps {
  /** Text to send to sign.mt for translation */
  text?: string;
  /** Whether the interpreter panel is active/playing */
  isActive?: boolean;
  /** Label shown in the status badge */
  label?: string;
  /** Show the open-in-new-tab button */
  showExternalLink?: boolean;
}

const SIGN_MT_BASE = 'https://rylo.com/sign/translate';
// Read API key dynamically — prefer Vite env var VITE_RYLO_API_KEY. Can also set window.__RYLO_API_KEY at runtime.
function getRyloApiKey(): string | undefined {
  return (import.meta as any).env?.VITE_RYLO_API_KEY || (window as any).__RYLO_API_KEY;
}

function buildSignMtUrl(text?: string): string {
  const base = SIGN_MT_BASE;
  const params = new URLSearchParams();
  if (text && text.trim()) params.set('text', text.trim());
  const key = getRyloApiKey();
  if (key) params.set('ai_key', key);
  const qs = params.toString();
  return qs ? `${base}/?${qs}` : base;
}

export const SignMtInterpreter: React.FC<SignMtInterpreterProps> = ({
  text,
  isActive = false,
  label = 'Sign Interpreter',
  showExternalLink = true,
}) => {
  const { settings } = useStore();
  const dark = settings.theme === 'dark';

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState(() => buildSignMtUrl(text));
  const [loadError, setLoadError] = useState(false);
  // Track whether the iframe actually loaded content or was blocked
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rebuild iframe URL when text changes
  useEffect(() => {
    const newUrl = buildSignMtUrl(text);
    if (newUrl !== iframeUrl) {
      setIsLoading(true);
      setLoadError(false);
      setIframeUrl(newUrl);
    }
  }, [text]);

  // If the iframe fires onLoad but sign.mt blocked it, the iframe will show a blank/error page.
  // We set a timer: if the iframe fires onLoad but we can't verify content, mark as success anyway.
  const handleLoad = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setIsLoading(false);
    setLoadError(false);
  }, []);

  const handleError = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setIsLoading(false);
    setLoadError(true);
  }, []);

  // Safety timeout — if neither onLoad nor onError fires in 12s, assume blocked
  useEffect(() => {
    if (isLoading) {
      loadTimerRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadError(true);
      }, 12000);
    }
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [isLoading, iframeUrl]);

  // Try to deliver updated text and auth to embedded widget via postMessage (non-blocking)
  useEffect(() => {
    if (!iframeRef.current) return;
    try {
      const target = iframeRef.current.contentWindow;
      if (target) {
        // send text update
        target.postMessage({ type: 'rylo:update_text', text: text ?? '' }, SIGN_MT_BASE);
        // send API key if present (safe-best-effort: some embeds accept postMessage auth)
        const key = getRyloApiKey();
        if (key) {
          target.postMessage({ type: 'rylo:set_api_key', apiKey: key }, SIGN_MT_BASE);
        }
      }
    } catch (e) {
      // ignore cross-origin or delivery errors
    }
  }, [text]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setLoadError(false);
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = 'about:blank';
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = src;
      }, 100);
    }
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden rounded-[inherit]">
      {/* Status Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg ${
          dark
            ? 'bg-black/60 border-white/10 text-white'
            : 'bg-white/80 border-white/60 text-neutral-800'
        }`}>
          <Waves className={`h-3 w-3 ${isActive ? 'text-accent animate-pulse' : 'text-neutral-400'}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
          {isActive && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={handleRefresh}
          title="Refresh interpreter"
          className={`flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-xl border shadow-lg transition-all hover:scale-110 active:scale-95 ${
            dark
              ? 'bg-black/60 border-white/10 text-white/60 hover:text-white'
              : 'bg-white/80 border-white/60 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        {showExternalLink && (
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open sign.mt in new tab"
            className={`flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-xl border shadow-lg transition-all hover:scale-110 active:scale-95 ${
              dark
                ? 'bg-black/60 border-white/10 text-white/60 hover:text-white'
                : 'bg-white/80 border-white/60 text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && !loadError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 ${
              dark ? 'bg-neutral-900/90' : 'bg-white/90'
            } backdrop-blur-sm`}
          >
            <div className="relative flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-accent/10" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className="absolute h-16 w-16 rounded-full border-4 border-accent border-t-transparent"
              />
              <Waves className="absolute h-6 w-6 text-accent" />
            </div>
            <div className="text-center">
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${dark ? 'text-white' : 'text-neutral-900'}`}>
                Loading Interpreter
              </p>
              <p className={`text-[9px] ${dark ? 'text-white/40' : 'text-neutral-400'}`}>
                Connecting to sign.mt…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blocked / Error Overlay — shown only when iframe truly fails */}
      <AnimatePresence>
        {loadError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 ${
              dark ? 'bg-neutral-900' : 'bg-slate-50'
            }`}
          >
            <div className={`text-center p-8 rounded-3xl border max-w-xs ${
              dark ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-100 shadow-xl'
            }`}>
              <motion.div
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4"
              >
                <Hand className="h-7 w-7 text-accent" />
              </motion.div>
              <h3 className={`text-sm font-black uppercase tracking-wider mb-2 ${dark ? 'text-white' : 'text-neutral-900'}`}>
                Live Sign Interpreter
              </h3>
              <p className={`text-xs mb-5 leading-relaxed ${dark ? 'text-white/50' : 'text-neutral-500'}`}>
                sign.mt requires a direct browser window for camera access and live translation.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRefresh}
                  className={`flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry Embed
                </button>
                <a
                  href={iframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-accent text-white hover:shadow-lg hover:shadow-accent/20 transition-all"
                >
                  <Languages className="h-3 w-3" />
                  Open sign.mt Live
                </a>
              </div>
              {text && text.trim() && (
                <div className="mt-4 pt-4 border-t border-current/10">
                  <p className="text-[9px] text-accent font-black uppercase tracking-widest mb-1">Queued Text</p>
                  <p className={`text-[10px] italic line-clamp-2 ${dark ? 'text-white/40' : 'text-neutral-400'}`}>
                    "{text}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The sign.mt iframe — primary rendering surface */}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        title="Sign Language Interpreter — sign.mt"
        className="w-full flex-1 border-0"
        style={{ minHeight: '100%' }}
        allow="camera; microphone; autoplay; encrypted-media; clipboard-read; clipboard-write"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};
