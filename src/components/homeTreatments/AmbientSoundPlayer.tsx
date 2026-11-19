import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Music, 
  CloudRain, 
  Waves, 
  Bell, 
  Sparkles,
  Play,
  Square
} from 'lucide-react';

export type AmbientSoundType = 'rain' | 'stream' | 'bowl' | 'drone';

export const AmbientSoundPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundType, setSoundType] = useState<AmbientSoundType>('bowl');
  const [volume, setVolume] = useState(0.5);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<{ stop: () => void } | null>(null);

  const stopCurrentSound = () => {
    if (activeNodesRef.current) {
      try {
        activeNodesRef.current.stop();
      } catch {
        // ignore
      }
      activeNodesRef.current = null;
    }
  };

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const startSound = (type: AmbientSoundType, vol: number) => {
    stopCurrentSound();
    const ctx = getAudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
    masterGain.connect(ctx.destination);

    if (type === 'rain') {
      // Pink / White noise with lowpass filter
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.3;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();

      activeNodesRef.current = {
        stop: () => {
          noise.stop();
          noise.disconnect();
        }
      };
    } else if (type === 'stream') {
      // Bubbling stream / water drops simulator
      let isStopped = false;
      const timers: NodeJS.Timeout[] = [];

      const scheduleBubble = () => {
        if (isStopped) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startFreq = 400 + Math.random() * 300;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 1.6, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);

        const nextTime = 80 + Math.random() * 200;
        const t = setTimeout(scheduleBubble, nextTime);
        timers.push(t);
      };

      scheduleBubble();

      activeNodesRef.current = {
        stop: () => {
          isStopped = true;
          timers.forEach(t => clearTimeout(t));
        }
      };
    } else if (type === 'bowl') {
      // Tibetan Singing Bowl chime repeating gently every 5 seconds
      let isStopped = false;
      const timers: NodeJS.Timeout[] = [];

      const playChime = () => {
        if (isStopped) return;
        const freqs = [216, 432, 648, 864];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 2, ctx.currentTime);

          const peakGain = 0.3 / (idx + 1);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.5);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 4.6);
        });

        const t = setTimeout(playChime, 5200);
        timers.push(t);
      };

      playChime();

      activeNodesRef.current = {
        stop: () => {
          isStopped = true;
          timers.forEach(t => clearTimeout(t));
        }
      };
    } else {
      // Meditative Zen Drone (Warm continuous 5th chords)
      const freqs = [136.1, 204.15, 272.2]; // Om frequency 136.1 Hz (C#3)
      const oscs = freqs.map(f => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        return osc;
      });

      activeNodesRef.current = {
        stop: () => {
          oscs.forEach(o => {
            o.stop();
            o.disconnect();
          });
        }
      };
    }
  };

  useEffect(() => {
    if (isPlaying) {
      startSound(soundType, volume);
    } else {
      stopCurrentSound();
    }
    return () => {
      stopCurrentSound();
    };
  }, [isPlaying, soundType]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-emerald-950/10 dark:bg-emerald-900/20 comfort:bg-[#f2ebdc] border border-emerald-500/20 text-xs">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 comfort:text-amber-950">
          <Music className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>စိတ်အေးချမ်းစေမည့် သဘာဝအသံ (Ambient Audio)</span>
        </div>
        <button
          onClick={togglePlay}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs transition-all ${
            isPlaying 
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm animate-pulse' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>ရပ်တန့်မည်</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>အသံဖွင့်မည်</span>
            </>
          )}
        </button>
      </div>

      {/* Sound Selection Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button
          onClick={() => setSoundType('bowl')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-medium transition-colors ${
            soundType === 'bowl'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white/70 dark:bg-neutral-800/70 border-neutral-200 dark:border-neutral-700 hover:bg-emerald-50 dark:hover:bg-neutral-700'
          }`}
        >
          <Bell className="w-3 h-3" />
          <span>ကြေးစည်ခေါင်းလောင်း</span>
        </button>

        <button
          onClick={() => setSoundType('rain')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-medium transition-colors ${
            soundType === 'rain'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white/70 dark:bg-neutral-800/70 border-neutral-200 dark:border-neutral-700 hover:bg-emerald-50 dark:hover:bg-neutral-700'
          }`}
        >
          <CloudRain className="w-3 h-3" />
          <span>မိုးသံဖွဲဖွဲ</span>
        </button>

        <button
          onClick={() => setSoundType('stream')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-medium transition-colors ${
            soundType === 'stream'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white/70 dark:bg-neutral-800/70 border-neutral-200 dark:border-neutral-700 hover:bg-emerald-50 dark:hover:bg-neutral-700'
          }`}
        >
          <Waves className="w-3 h-3" />
          <span>သစ်သားရေစီးသံ</span>
        </button>

        <button
          onClick={() => setSoundType('drone')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-medium transition-colors ${
            soundType === 'drone'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white/70 dark:bg-neutral-800/70 border-neutral-200 dark:border-neutral-700 hover:bg-emerald-50 dark:hover:bg-neutral-700'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>တရားရှုမှတ် အသံ</span>
        </button>
      </div>
    </div>
  );
};
