/**
 * Synapto 3D Accessible Login Portal
 * Futuristic, emotionally calming, accessibility-first design
 * @license Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Scene3D } from './Scene3D';
import { LoginForm } from './LoginForm';
import { AccessibilitySettings } from './AccessibilitySettings';
import { FallbackLogin } from './FallbackLogin';
import { motion } from 'motion/react';

export const LoginPage = () => {
  const { user, settings } = useStore();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [show3D, setShow3D] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Check for reduced motion preference
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(prefersReduced);

    // Also check settings
    if (settings?.reducedMotion) {
      setReducedMotion(true);
    }
  }, [settings]);

  // Initialize 3D scene
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-200 dark:bg-cyan-900 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
      </div>

      {/* 3D Canvas or Fallback */}
      <div className="absolute inset-0 w-full h-full">
        {!reducedMotion && show3D && !isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="w-full h-full"
          >
            <Scene3D />
          </motion.div>
        ) : (
          <FallbackLogin onShowForm={() => setShow3D(false)} />
        )}
      </div>

      {/* Login Form Container */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="pointer-events-auto"
        >
          <LoginForm />
        </motion.div>
      </div>

      {/* Accessibility Settings Toggle */}
      <div className="absolute bottom-6 right-6 z-50">
        <AccessibilitySettings />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-40">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-3 border-blue-300 border-t-blue-600 rounded-full"
          />
        </div>
      )}

      {/* Fallback mode toggle */}
      {!reducedMotion && (
        <button
          onClick={() => setShow3D(!show3D)}
          className="absolute top-6 left-6 z-50 px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Toggle 3D mode"
          title="Switch between 3D and simplified mode"
        >
          {show3D ? '→ Simplified' : '→ 3D Mode'}
        </button>
      )}
    </div>
  );
};
