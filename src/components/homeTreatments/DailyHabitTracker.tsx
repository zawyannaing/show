import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  CheckCircle2, 
  Circle, 
  Award, 
  Calendar, 
  Sparkles,
  Droplets,
  Sun,
  Laptop,
  Moon
} from 'lucide-react';
import { motion } from 'motion/react';

interface HabitItem {
  id: string;
  labelMm: string;
  subMm: string;
  icon: React.ReactNode;
  completed: boolean;
}

export const DailyHabitTracker: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [streak, setStreak] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tm_acupressure_streak');
      return saved ? parseInt(saved, 10) : 3; // Default 3 days for engaging demo
    } catch {
      return 3;
    }
  });

  const [habits, setHabits] = useState<Record<string, boolean>>(() => {
    try {
      const savedDate = localStorage.getItem('tm_habit_date');
      if (savedDate === todayStr) {
        const savedHabits = localStorage.getItem('tm_habit_items');
        return savedHabits ? JSON.parse(savedHabits) : {
          morning: true,
          water: true,
          desk: false,
          sleep: false
        };
      }
      return {
        morning: true,
        water: true,
        desk: false,
        sleep: false
      };
    } catch {
      return { morning: true, water: true, desk: false, sleep: false };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tm_habit_date', todayStr);
      localStorage.setItem('tm_habit_items', JSON.stringify(habits));
    } catch {
      // ignore
    }
  }, [habits, todayStr]);

  const toggleHabit = (id: string) => {
    setHabits(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      const completedCount = Object.values(updated).filter(Boolean).length;
      if (completedCount === 4 && Object.values(prev).filter(Boolean).length < 4) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem('tm_acupressure_streak', newStreak.toString());
      }
      return updated;
    });
  };

  const completedCount = Object.values(habits).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  const habitItems: HabitItem[] = [
    {
      id: 'morning',
      labelMm: 'မနက်ခင်း အကြောပြေ နိုးကြားစေခြင်း',
      subMm: 'GV20 (ထိပ်လယ်) + LI4 (ဟော်ကူ) ၁ မိနစ် နှိပ်နယ်ခြင်း',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      completed: !!habits.morning
    },
    {
      id: 'water',
      labelMm: 'ရေနွေးနွေး ပုံမှန် သောက်သုံးခြင်း',
      subMm: 'အကြောနှိပ်ပြီးနောက် အဆိပ်အတောက် ပြေပျောက်စေရန်',
      icon: <Droplets className="w-4 h-4 text-sky-500" />,
      completed: !!habits.water
    },
    {
      id: 'desk',
      labelMm: 'ကွန်ပျူတာ/ဖုန်း မျက်စိညောင်းညာမှုပြေ နှိပ်ခြင်း',
      subMm: 'BL2 (မျက်ခုံးထိပ်) + GB20 (ဂုတ်ပိုး) ဖိနှိပ်ခြင်း',
      icon: <Laptop className="w-4 h-4 text-indigo-500" />,
      completed: !!habits.desk
    },
    {
      id: 'sleep',
      labelMm: 'ညအိပ်ရာဝင် နှစ်ခြိုက်စွာ အိပ်ပျော်စေမည့် အကြောနှိပ်ခြင်း',
      subMm: 'KD1 (ခြေဖဝါး အလယ်ခွက်) + Anmian (အိပ်ပျော်ဆုံမှတ်)',
      icon: <Moon className="w-4 h-4 text-purple-500" />,
      completed: !!habits.sleep
    }
  ];

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] comfort:bg-[#fbf7ed] border border-emerald-500/20 shadow-md">
      {/* Top Banner: Streak and Level */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800 comfort:border-[#e9dfcf]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Flame className="w-6 h-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-neutral-900 dark:text-white comfort:text-[#2d2416]">
                {streak} ရက်ဆက်တိုက် ပြီးမြောက်ခဲ့သည်!
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Active Streak
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              နေ့စဉ် အကြောပြေကျန်းမာရေး စံချိန်တင် အလေ့အကျင့်
            </p>
          </div>
        </div>

        {/* Progress Bar & Badges */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              ယနေ့ပြီးစီးမှု {progressPercent}%
            </div>
            <div className="w-28 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#ece2d0] overflow-hidden mt-1">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Habit Checklist items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
        {habitItems.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleHabit(item.id)}
            className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
              item.completed 
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                : 'bg-neutral-50/50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
            }`}
          >
            <div className="mt-0.5">
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
              ) : (
                <Circle className="w-5 h-5 text-neutral-400 hover:text-emerald-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 dark:text-neutral-100 comfort:text-[#2d2416]">
                {item.icon}
                <span className={item.completed ? 'line-through text-neutral-500 dark:text-neutral-400' : ''}>
                  {item.labelMm}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                {item.subMm}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Hint */}
      <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>နေ့စဉ် ၄ မျိုး ပြီးမြောက်ပါက Streak ရက်တိုးသွားပါမည်။</span>
        </span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Keep it up!</span>
        </span>
      </div>
    </div>
  );
};
