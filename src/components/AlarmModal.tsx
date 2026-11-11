import React from 'react';
import { motion } from 'motion/react';
import { Bell, BellOff, Clock, AlertCircle } from 'lucide-react';
import { Alarm } from '../types';
import { toPersianDigits } from '../utils/jalali';

interface AlarmModalProps {
  activeAlarm: Alarm | null;
  onDismiss: () => void;
  usePersianDigits: boolean;
}

export default function AlarmModal({
  activeAlarm,
  onDismiss,
  usePersianDigits,
}: AlarmModalProps) {
  if (!activeAlarm) return null;

  const renderDigits = (text: string | number) => {
    return usePersianDigits ? toPersianDigits(text) : text.toString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md font-sans" dir="rtl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-center space-y-6 overflow-hidden relative"
      >
        {/* Pulsing Alarm Ripple Effect */}
        <div className="relative flex justify-center py-4">
          <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-red-400 opacity-20"></span>
          <span className="animate-pulse absolute inline-flex h-24 w-24 rounded-full bg-red-400 opacity-10"></span>
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 text-white relative z-10">
            <Bell className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        {/* Content text */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold rounded-full">
            زمان انجام کار فرا رسیده است!
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white leading-relaxed">
            {activeAlarm.taskTitle}
          </h3>
          <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 font-bold">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>ساعت شروع: {renderDigits(activeAlarm.time)}</span>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onDismiss}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 hover:shadow-red-600/35 hover:scale-[1.01] transition-all cursor-pointer"
        >
          <BellOff className="w-5 h-5" />
          <span>قطع آلارم صوتی</span>
        </button>
      </motion.div>
    </div>
  );
}
