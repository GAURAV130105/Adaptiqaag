import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const AdaptiveThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const settings = useStore((state) => state.settings);

  useEffect(() => {
    const root = document.documentElement;

    // --- CHROMA: Theme ---
    root.setAttribute('data-theme', settings.theme);

    // --- PERCEPTION: High Contrast ---
    root.setAttribute('data-high-contrast', String(settings.highContrast));

    // --- PERCEPTION: OpenDyslexic Font ---
    root.setAttribute('data-dyslexia', String(settings.dyslexiaFont));

    // --- COGNITION: Focus Mode ---
    root.setAttribute('data-focus-mode', String(settings.focusMode));

    // --- SCALE: Font Size ---
    // Use data-attribute + direct fontSize for double reliability
    root.setAttribute('data-font-size', String(settings.fontSize));
    const sizes: Record<number, string> = { 1: '16px', 2: '19px', 3: '23px' };
    root.style.fontSize = sizes[settings.fontSize] || '16px';
  }, [settings]);

  return <>{children}</>;
};
