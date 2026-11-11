import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  getJalaliDaysInMonth,
  jalaliToGregorian,
  parseJalaliString,
  toPersianDigits,
  getPersianWeekdayName,
  gregorianToJalali,
  getJalaliString,
  compareJalaliDates,
} from '../utils/jalali';

interface PersianDatePickerProps {
  value: string; // "YYYY/MM/DD"
  onChange: (date: string) => void;
  usePersianDigits: boolean;
  label?: string;
  minDate?: string;
}

export default function PersianDatePicker({
  value,
  onChange,
  usePersianDigits,
  label,
  minDate,
}: PersianDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(1405);
  const [currentMonth, setCurrentMonth] = useState(4); // 1-indexed (1 to 12)
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Parse initial value when opening
  useEffect(() => {
    if (isOpen) {
      const dateToParse = value || getJalaliString(new Date());
      const [y, m] = parseJalaliString(dateToParse);
      setCurrentYear(y);
      setCurrentMonth(m);
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (target && !document.body.contains(target)) {
        return; // Ignore clicks on elements that got unmounted during the action
      }
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      if (portalRef.current && portalRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = currentMonth.toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');
    const dateStr = `${currentYear}/${formattedMonth}/${formattedDay}`;
    onChange(dateStr);
    setTimeout(() => {
      setIsOpen(false);
    }, 10);
  };

  // Generate day grid
  const daysInMonth = getJalaliDaysInMonth(currentYear, currentMonth);

  // Find weekday index (0-6) of the 1st of this month
  const firstOfMonthG = jalaliToGregorian(currentYear, currentMonth, 1);
  const jsDay = firstOfMonthG.getDay(); // 0 is Sunday
  const startDayOffset = (jsDay + 1) % 7; // Saturday is 0, Sunday is 1, ..., Friday is 6

  const daysGrid: (number | null)[] = [];
  // Fill offset days with null
  for (let i = 0; i < startDayOffset; i++) {
    daysGrid.push(null);
  }
  // Fill actual days
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  // Formatting display
  const renderDigits = (str: string | number) => {
    return usePersianDigits ? toPersianDigits(str) : str.toString();
  };

  const [valY, valM, valD] = value ? parseJalaliString(value) : [0, 0, 0];
  const displayValue = value
    ? `${renderDigits(valY)}/${renderDigits(valM.toString().padStart(2, '0'))}/${renderDigits(valD.toString().padStart(2, '0'))}`
    : '';

  return (
    <div className={`relative w-full ${isOpen ? 'z-40' : 'z-10'}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div
        className="flex items-center justify-between px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-slate-900 dark:text-slate-100 font-medium">
          {displayValue || 'انتخاب تاریخ...'}
        </span>
        <Calendar className="w-5 h-5 text-slate-400" />
      </div>

      {isOpen && createPortal(
        <div 
          ref={portalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in" 
          dir="rtl"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-[300px] sm:w-85 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="text-center font-bold text-slate-900 dark:text-slate-100">
                {PERSIAN_MONTHS[currentMonth - 1]} {renderDigits(currentYear)}
              </div>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
            <div>ش</div>
            <div>ی</div>
            <div>د</div>
            <div>س</div>
            <div>چ</div>
            <div>پ</div>
            <div className="text-red-500">ج</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const isSelected =
                !!value && valY === currentYear && valM === currentMonth && valD === day;

              const isToday = () => {
                const [ty, tm, td] = gregorianToJalali(new Date());
                return ty === currentYear && tm === currentMonth && td === day;
              };

              // Check if date is before minDate
              let isPast = false;
              if (minDate) {
                const formattedMonth = currentMonth.toString().padStart(2, '0');
                const formattedDay = day.toString().padStart(2, '0');
                const thisDateStr = `${currentYear}/${formattedMonth}/${formattedDay}`;
                if (compareJalaliDates(thisDateStr, minDate) < 0) {
                  isPast = true;
                }
              }

              const isFriday = idx % 7 === 6;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={`
                    h-8 w-8 text-sm font-medium rounded-full flex items-center justify-center transition-all duration-150
                    ${isSelected 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : isPast
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        : isToday()
                          ? 'border border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                          : isFriday
                            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  {renderDigits(day)}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const todayG = new Date();
                const [ty, tm, td] = gregorianToJalali(todayG);
                onChange(`${ty}/${tm.toString().padStart(2, '0')}/${td.toString().padStart(2, '0')}`);
                setIsOpen(false);
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrowG = new Date();
                tomorrowG.setDate(tomorrowG.getDate() + 1);
                const [ty, tm, td] = gregorianToJalali(tomorrowG);
                onChange(`${ty}/${tm.toString().padStart(2, '0')}/${td.toString().padStart(2, '0')}`);
                setIsOpen(false);
              }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              فردا
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </div>
  );
}
