import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Type } from 'lucide-react';

interface ElderlySpeechNarratorProps {
  textToRead?: string;
  isLargeFont: boolean;
  onToggleLargeFont: () => void;
  compact?: boolean;
}

export const ElderlySpeechNarrator: React.FC<ElderlySpeechNarratorProps> = ({
  textToRead = '',
  isLargeFont,
  onToggleLargeFont,
  compact = false
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert('ဤ Browser သည် Speech Audio ကို မထောက်ပံ့သေးပါခင်ဗျာ။');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!textToRead) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.85; // slightly slower for elderly clarity
    utterance.pitch = 1.0;

    // Check if Myanmar or natural voice exists
    const voices = window.speechSynthesis.getVoices();
    const myVoice = voices.find(v => v.lang.startsWith('my') || v.name.toLowerCase().includes('burmese'));
    if (myVoice) {
      utterance.voice = myVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* 1. Audio Narrator Button */}
      <button
        type="button"
        onClick={handleSpeak}
        title={isSpeaking ? "အသံဖတ်ကြားခြင်း ရပ်တန့်မည်" : "စာသားများကို အသံဖြင့် နားထောင်မည် (Audio)"}
        aria-label={isSpeaking ? "Stop Audio narration" : "Listen to Audio narration"}
        className={`min-h-[44px] min-w-[44px] h-11 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 shadow-xs ${
          compact ? 'px-3' : 'px-3 sm:px-3.5'
        } ${
          isSpeaking
            ? 'bg-amber-500 text-white border-amber-600 animate-pulse shadow-sm'
            : 'bg-white dark:bg-[#17223B] comfort:bg-[#fbf7ee] text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 hover:text-emerald-600'
        }`}
      >
        {isSpeaking ? (
          <>
            <VolumeX className="w-4 h-4 text-white" />
            <span className="hidden md:inline font-myanmar">အသံရပ်မည်</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline font-myanmar">အသံ</span>
          </>
        )}
      </button>

      {/* 2. Text Scaler Button */}
      <button
        type="button"
        onClick={onToggleLargeFont}
        title={isLargeFont ? "စာလုံးအရွယ်အစား မူလအတိုင်းထားမည်" : "စာလုံး အကြီးချဲ့ဖတ်မည် (Large Font)"}
        aria-label={isLargeFont ? "Normal Font size" : "Large Font size"}
        className={`min-h-[44px] min-w-[44px] h-11 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 shadow-xs px-3 ${
          isLargeFont
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
            : 'bg-white dark:bg-[#17223B] comfort:bg-[#fbf7ee] text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 hover:text-emerald-600'
        }`}
      >
        <Type className="w-4 h-4" />
        <span className="text-[10px] font-mono font-black">{isLargeFont ? 'A+' : 'A'}</span>
      </button>
    </div>
  );
};
