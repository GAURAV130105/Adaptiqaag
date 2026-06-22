import React from 'react';
import { useStore } from '../store/useStore';
import { Layout, User, Video } from 'lucide-react';
import { motion } from 'motion/react';

export const ViewModeToggle: React.FC = () => {
  const { viewMode, setViewMode, settings } = useStore();

  const modes = [
    { id: 'standard', icon: Video, label: 'Standard' },
    { id: 'interpretation', icon: User, label: 'Interpreter' }
  ];

  return (
    <div className={`relative flex items-center p-1.5 rounded-2xl ${
      settings.highContrast 
      ? 'bg-black border-2 border-yellow-400' 
      : 'bg-neutral-100/50 border border-white shadow-inner'
    }`}>
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = viewMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id as any)}
            className={`relative flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all z-10 ${
              isActive
              ? (settings.highContrast ? 'text-black' : 'text-accent')
              : 'opacity-40 hover:opacity-100'
            }`}
          >
            {isActive && !settings.highContrast && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-white rounded-xl shadow-lg -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {isActive && settings.highContrast && (
              <div className="absolute inset-0 bg-yellow-400 rounded-xl -z-10" />
            )}
            <Icon className="h-3.5 w-3.5" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
};
