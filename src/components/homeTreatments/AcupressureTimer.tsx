import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const durations = [30, 60, 90];

interface AcupressureTimerProps {
  activePointName?: string;
  forceOpenKey?: number;
}

export function AcupressureTimer({ activePointName, forceOpenKey }: AcupressureTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (forceOpenKey && forceOpenKey > 0) {
      setIsOpen(true);
      setIsPlaying(true);
    }
  }, [forceOpenKey]);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeLeft]);

  const toggleTimer = () => setIsPlaying(!isPlaying);

  const resetTimer = () => {
    setIsPlaying(false);
    setTimeLeft(selectedDuration);
  };

  const handleSelectDuration = (duration: number) => {
    setSelectedDuration(duration);
    setTimeLeft(duration);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((selectedDuration - timeLeft) / selectedDuration) * 100;

  return (
    <motion.div 
      drag 
      dragMomentum={false}
      className="fixed z-[100] flex flex-col items-end cursor-move"
      style={{ touchAction: 'none', bottom: '2rem', right: '2rem' }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white/95 dark:bg-[#131B2E]/95 comfort:bg-[#f7f2e8]/95 border border-neutral-200 dark:border-white/15 comfort:border-[#e0d6c3] rounded-3xl shadow-2xl p-5 mb-4 w-72 backdrop-blur-xl origin-bottom-right text-neutral-900 dark:text-white comfort:text-[#2a241e]"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-sans font-bold flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Timer className="w-4 h-4" />
                အချိန်မှတ်စက်
              </h4>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close Timer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activePointName && (
              <div className="mb-4 px-3 py-1.5 rounded-xl bg-neutral-100/80 dark:bg-black/40 comfort:bg-[#eee6d7] border border-emerald-500/30 text-center">
                <span className="text-[11px] font-sans text-neutral-500 dark:text-neutral-400 block">လက်ရှိနှိပ်နေသော အမှတ်:</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate block">{activePointName}</span>
              </div>
            )}

            {/* Circular Progress */}
            <div className="flex justify-center my-3">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="60" className="stroke-neutral-200 dark:stroke-neutral-800 comfort:stroke-[#e2dacb] stroke-[6px] fill-none" />
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="60" 
                    className="stroke-emerald-600 dark:stroke-emerald-400 stroke-[6px] fill-none transition-all duration-1000 ease-linear"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * progress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-4xl font-light font-sans tabular-nums">
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2 mb-5 mt-3">
              {durations.map((d) => (
                <button
                  key={d}
                  onClick={() => handleSelectDuration(d)}
                  className={`px-4 py-1.5 rounded-full text-xs font-sans font-bold transition-all cursor-pointer ${
                    selectedDuration === d 
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-md' 
                      : 'bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#e8decb] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={resetTimer}
                className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#e8decb] flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-white transition-colors cursor-pointer"
                title="ပြန်လည်စတင်ရန်"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={toggleTimer}
                className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-black flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/25 cursor-pointer"
                title={isPlaying ? "ခေတ္တရပ်ရန်" : "စတင်ရန်"}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
          isOpen 
            ? 'bg-white dark:bg-[#131B2E] comfort:bg-[#f7f2e8] text-emerald-600 dark:text-emerald-400 border border-neutral-300 dark:border-white/20' 
            : 'bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 text-white dark:text-black'
        } ${(!isOpen && isPlaying) ? 'animate-pulse' : ''}`}
        title="အချိန်မှတ်စက်"
      >
        {(!isOpen && isPlaying) ? (
          <div className="text-[13px] font-sans font-black tabular-nums">{formatTime(timeLeft)}</div>
        ) : (
          <Timer className="w-6 h-6" />
        )}
      </button>
    </motion.div>
  );
}
