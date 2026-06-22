import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Settings, Eye, Type, Moon, Sun, LayoutPanelLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AccessibilityControls: React.FC = () => {
  const { settings, updateSettings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const ControlGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col gap-3">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 px-1">{label}</label>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );

  const dark = settings.theme === 'dark';

  return (
    <>
      {/* Floating Settings Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Open settings"
        aria-expanded={isOpen}
        className={`fixed top-6 right-6 z-[200] flex h-13 w-13 items-center justify-center rounded-2xl shadow-2xl transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/50 ${
          isOpen
            ? 'bg-accent text-white rotate-45'
            : dark
              ? 'bg-neutral-900 text-white border border-white/10'
              : 'bg-neutral-900 text-white'
        }`}
        style={{ width: 52, height: 52 }}
      >
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>
          <Settings className="h-5 w-5" />
        </motion.div>
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[190] bg-black/20 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-in Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            key="panel"
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className={`fixed top-20 right-6 z-[200] w-80 rounded-[2rem] border shadow-2xl overflow-hidden flex flex-col ${
              dark
                ? 'bg-neutral-900 border-white/10 text-white'
                : 'bg-white border-neutral-100 text-neutral-900'
            }`}
            style={{ maxHeight: 'calc(100vh - 6rem)' }}
          >
            {/* Panel Header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b ${dark ? 'border-white/5' : 'border-neutral-100'}`}>
              <div>
                <h2 className="text-base font-black tracking-tight">Adaptive Layer</h2>
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-0.5 ${dark ? 'text-white/30' : 'text-neutral-400'}`}>
                  Environment Configuration
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 ${
                  dark ? 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900'
                }`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Scrollable Controls */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6 custom-scrollbar">

              {/* Chroma – theme toggle */}
              <ControlGroup label="Chroma">
                <div
                  className={`grid grid-cols-2 gap-2 p-1.5 rounded-2xl`}
                  style={{ backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                >
                  <button
                    onClick={() => updateSettings({ theme: 'light', highContrast: false })}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                      settings.theme === 'light' && !settings.highContrast
                        ? 'bg-white shadow-md text-blue-600 ring-1 ring-black/5'
                        : dark ? 'text-white/40 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" /> Solis
                  </button>
                  <button
                    onClick={() => updateSettings({ theme: 'dark', highContrast: false })}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                      settings.theme === 'dark' && !settings.highContrast
                        ? 'bg-neutral-800 text-white shadow-md'
                        : dark ? 'text-white/40 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" /> Nox
                  </button>
                </div>
              </ControlGroup>

              {/* Perception */}
              <ControlGroup label="Perception">
                {/* High Contrast */}
                <button
                  onClick={() => updateSettings({ highContrast: !settings.highContrast })}
                  className={`w-full flex items-center justify-between rounded-2xl px-4 py-3.5 border-2 transition-all group ${
                    settings.highContrast
                      ? 'bg-yellow-400 border-black text-black'
                      : dark
                        ? 'bg-white/5 border-transparent text-white hover:bg-white/10'
                        : 'bg-neutral-50 border-transparent text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${settings.highContrast ? 'bg-black text-yellow-400' : dark ? 'bg-white/10' : 'bg-neutral-200 group-hover:bg-accent/10'}`}>
                      <Eye className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold">High Contrast</span>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full transition-colors ${settings.highContrast ? 'bg-black' : dark ? 'bg-white/20 group-hover:bg-accent' : 'bg-neutral-300 group-hover:bg-accent'}`} />
                </button>

                {/* OpenDyslexic */}
                <button
                  onClick={() => updateSettings({ dyslexiaFont: !settings.dyslexiaFont })}
                  className={`w-full flex items-center justify-between rounded-2xl px-4 py-3.5 border-2 transition-all group ${
                    settings.dyslexiaFont
                      ? 'bg-accent text-white border-transparent shadow-lg shadow-accent/20'
                      : dark
                        ? 'bg-white/5 border-transparent text-white hover:bg-white/10'
                        : 'bg-neutral-50 border-transparent text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${settings.dyslexiaFont ? 'bg-white/20' : dark ? 'bg-white/10' : 'bg-neutral-200 group-hover:bg-accent/10'}`}>
                      <Type className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold">OpenDyslexic</span>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full transition-colors ${settings.dyslexiaFont ? 'bg-white' : dark ? 'bg-white/20 group-hover:bg-accent' : 'bg-neutral-300 group-hover:bg-accent'}`} />
                </button>
              </ControlGroup>

              {/* Cognition */}
              <ControlGroup label="Cognition">
                <button
                  onClick={() => updateSettings({ focusMode: !settings.focusMode })}
                  className={`w-full flex items-center justify-between rounded-2xl px-4 py-3.5 border-2 transition-all group ${
                    settings.focusMode
                      ? settings.highContrast
                        ? 'bg-yellow-400 border-black text-black'
                        : 'bg-accent text-white border-transparent shadow-xl shadow-accent/20'
                      : dark
                        ? 'bg-white/5 border-transparent text-white hover:bg-white/10'
                        : 'bg-neutral-50 border-transparent text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${settings.focusMode ? 'bg-white/20' : dark ? 'bg-white/10' : 'bg-neutral-200 group-hover:bg-accent/10'}`}>
                      <LayoutPanelLeft className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold">Focus Protocol</span>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full transition-colors ${settings.focusMode ? 'bg-white animate-pulse' : dark ? 'bg-white/20 group-hover:bg-accent' : 'bg-neutral-300 group-hover:bg-accent'}`} />
                </button>
              </ControlGroup>

              {/* Scale */}
              <ControlGroup label="Scale">
                <div className="flex gap-2">
                  {[1, 2, 3].map(size => (
                    <button
                      key={size}
                      onClick={() => updateSettings({ fontSize: size })}
                      className={`flex-1 rounded-2xl py-3 border-2 transition-all text-base font-black ${
                        settings.fontSize === size
                          ? settings.highContrast
                            ? 'bg-yellow-400 border-black text-black'
                            : dark
                              ? 'bg-white text-black border-white'
                              : 'bg-neutral-900 text-white border-neutral-900'
                          : settings.highContrast
                            ? 'bg-black border-yellow-400 text-yellow-400'
                            : dark
                              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                              : 'bg-neutral-50 border-transparent text-black hover:bg-neutral-100'
                      }`}
                    >
                      {size === 1 ? 'α' : size === 2 ? 'β' : 'γ'}
                    </button>
                  ))}
                </div>
              </ControlGroup>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
