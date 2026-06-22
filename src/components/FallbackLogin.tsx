/**
 * Fallback non-3D login interface for accessibility compliance
 * @license Apache-2.0
 */

import { motion } from 'motion/react';

interface FallbackLoginProps {
  onShowForm?: () => void;
}

export const FallbackLogin = ({ onShowForm }: FallbackLoginProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950"
    >
      <div className="text-center space-y-4 px-6">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-bold text-gray-900 dark:text-white"
        >
          Welcome to Synapto
        </motion.h1>
        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 dark:text-gray-300 text-lg"
        >
          Inclusive Education Platform
        </motion.p>
        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          Accessibility-first learning environment
        </motion.p>
      </div>
    </motion.div>
  );
};
