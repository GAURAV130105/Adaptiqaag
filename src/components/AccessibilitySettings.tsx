/**
 * Accessibility settings panel for login page
 * @license Apache-2.0
 */

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Volume2,
  Eye,
  Type,
  Zap,
  Music,
  Hand,
  X,
} from 'lucide-react';

export const AccessibilitySettings = () => {
  const { settings, updateSettings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    voiceAssistant: settings?.voiceAssistant || false,
    highContrast: settings?.highContrast || false,
    dyslexiaFont: settings?.dyslexiaFont || false,
    reducedMotion: settings?.reducedMotion || false,
    textToSpeech: settings?.textToSpeech || false,
    signLanguageMode: settings?.signLanguageMode || false,
  });

  const handleToggle = (key: string) => {
    const updatedSettings = {
      ...localSettings,
      [key]: !localSettings[key as keyof typeof localSettings],
    };
    setLocalSettings(updatedSettings);
    updateSettings(updatedSettings);
  };

  const toggleOptions = [
    {
      id: 'voiceAssistant',
      icon: Volume2,
      label: 'Voice Assistant',
      description: 'Audio-guided navigation',
    },
    {
      id: 'highContrast',
      icon: Eye,
      label: 'High Contrast',
      description: 'Improved visibility',
    },
    {
      id: 'dyslexiaFont',
      icon: Type,
      label: 'Dyslexia Font',
      description: 'OpenDyslexic typeface',
    },
    {
      id: 'reducedMotion',
      icon: Zap,
      label: 'Reduced Motion',
      description: 'Fewer animations',
    },
    {
      id: 'textToSpeech',
      icon: Music,
      label: 'Text-to-Speech',
      description: 'Audio content reading',
    },
    {
      id: 'signLanguageMode',
      icon: Hand,
      label: 'Sign Language Mode',
      description: 'Visual communication',
    },
  ];

  return (
    <div className="relative z-50">
      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label="Accessibility settings"
        aria-expanded={isOpen}
      >
        <Settings className="w-5 h-5" />
      </motion.button>

      {/* Settings panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 backdrop-blur-2xl bg-white/30 dark:bg-black/30 border border-white/40 dark:border-white/20 rounded-2xl p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Accessibility
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close settings"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Settings list */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {toggleOptions.map((option) => {
                const Icon = option.icon;
                const isActive =
                  localSettings[option.id as keyof typeof localSettings];

                return (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() =>
                      handleToggle(option.id)
                    }
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                        {option.description}
                      </p>
                    </div>

                    {/* Toggle indicator */}
                    <div className="flex-shrink-0 flex items-center">
                      <motion.div
                        animate={{
                          backgroundColor: isActive ? '#3b82f6' : '#e5e7eb',
                        }}
                        className="relative inline-flex h-6 w-10 items-center rounded-full bg-gray-300 dark:bg-gray-600"
                      >
                        <motion.div
                          animate={{
                            x: isActive ? 20 : 2,
                          }}
                          className="inline-block h-4 w-4 transform rounded-full bg-white"
                        />
                      </motion.div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Info footer */}
            <div className="mt-4 pt-3 border-t border-white/20 text-xs text-gray-600 dark:text-gray-300">
              <p>
                Your accessibility preferences are saved locally and will be
                remembered on your next visit.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
