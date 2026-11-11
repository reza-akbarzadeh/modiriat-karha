import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Calendar, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Task, Category, Priority, RepeatPattern } from '../types';
import PersianDatePicker from './PersianDatePicker';
import { parseJalaliString, toPersianDigits } from '../utils/jalali';

interface TaskFormProps {
  categories: Category[];
  onSubmit: (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => void;
  onOpenCategoryManager: () => void;
  taskToEdit?: Task;
  onCancel?: () => void;
  usePersianDigits: boolean;
  todayJalali: string;
}

const WEEKDAYS_SHORT = [
  { label: 'ش', value: 6, fullName: 'شنبه' },
  { label: 'ی', value: 0, fullName: 'یکشنبه' },
  { label: 'د', value: 1, fullName: 'دوشنبه' },
  { label: 'س', value: 2, fullName: 'سه‌شنبه' },
  { label: 'چ', value: 3, fullName: 'چهارشنبه' },
  { label: 'پ', value: 4, fullName: 'پنجشنبه' },
  { label: 'ج', value: 5, fullName: 'جمعه' },
];

export default function TaskForm({
  categories,
  onSubmit,
  onOpenCategoryManager,
  taskToEdit,
  onCancel,
  usePersianDigits,
  todayJalali,
}: TaskFormProps) {
  // Input states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [hasTime, setHasTime] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [priority, setPriority] = useState<Priority>('medium');
  const [repeatPattern, setRepeatPattern] = useState<RepeatPattern>('none');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [manualHours, setManualHours] = useState('0');
  const [manualMinutes, setManualMinutes] = useState('0');

  // Validation state
  const [error, setError] = useState('');

  // Set default values or load task to edit
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setCategoryId(taskToEdit.categoryId);
      setDate(taskToEdit.date);
      setHasTime(taskToEdit.hasTime);
      if (taskToEdit.startTime) setStartTime(taskToEdit.startTime);
      if (taskToEdit.endTime) setEndTime(taskToEdit.endTime);
      setPriority(taskToEdit.priority);
      setRepeatPattern(taskToEdit.repeatPattern);
      if (taskToEdit.repeatDays) setRepeatDays(taskToEdit.repeatDays);
      if (taskToEdit.repeatEndDate) setRepeatEndDate(taskToEdit.repeatEndDate);
      
      if (!taskToEdit.hasTime && taskToEdit.durationMinutes) {
        const h = Math.floor(taskToEdit.durationMinutes / 60).toString();
        const m = (taskToEdit.durationMinutes % 60).toString();
        setManualHours(h);
        setManualMinutes(m);
      } else {
        setManualHours('0');
        setManualMinutes('0');
      }
    } else {
      setTitle('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      setDate(todayJalali);
      setHasTime(false);
      setStartTime('08:00');
      setEndTime('17:00');
      setPriority('medium');
      setRepeatPattern('none');
      setRepeatDays([]);
      setRepeatEndDate('');
      setManualHours('0');
      setManualMinutes('0');
    }
  }, [taskToEdit, categories, todayJalali]);

  const toggleWeekday = (dayValue: number) => {
    if (repeatDays.includes(dayValue)) {
      setRepeatDays(prev => prev.filter(d => d !== dayValue));
    } else {
      setRepeatDays(prev => [...prev, dayValue]);
    }
  };

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('لطفاً عنوان کار را وارد کنید.');
      return;
    }

    if (!categoryId) {
      setError('لطفاً یک دسته‌بندی انتخاب کنید.');
      return;
    }

    let calculatedDuration: number | undefined = undefined;

    if (hasTime) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;

      if (endTotal <= startTotal) {
        setError('ساعت پایان کار باید بعد از ساعت شروع باشد.');
        return;
      }

      calculatedDuration = endTotal - startTotal;
    } else {
      const mh = parseInt(manualHours, 10) || 0;
      const mm = parseInt(manualMinutes, 10) || 0;
      if (mh > 0 || mm > 0) {
        calculatedDuration = mh * 60 + mm;
      }
    }

    if (repeatPattern === 'weekly' && repeatDays.length === 0) {
      setError('لطفاً حداقل یک روز را برای تکرار هفتگی انتخاب کنید.');
      return;
    }

    // Call submit handler
    onSubmit({
      id: taskToEdit?.id,
      title: trimmedTitle,
      description: description.trim() || undefined,
      categoryId,
      date,
      hasTime,
      startTime: hasTime ? startTime : undefined,
      endTime: hasTime ? endTime : undefined,
      durationMinutes: calculatedDuration,
      priority,
      repeatPattern,
      repeatDays: repeatPattern === 'weekly' ? repeatDays : undefined,
      repeatEndDate: (repeatPattern !== 'none' && repeatPattern !== 'until_tomorrow' && repeatPattern !== 'until_after_tomorrow' && repeatEndDate) ? repeatEndDate : undefined,
      isCompleted: taskToEdit ? taskToEdit.isCompleted : false,
    });

    // Reset fields if in add mode
    if (!taskToEdit) {
      setTitle('');
      setDescription('');
      setHasTime(false);
      setRepeatPattern('none');
      setRepeatDays([]);
      setRepeatEndDate('');
      setManualHours('0');
      setManualMinutes('0');
    }
  };

  const renderDigits = (text: string | number) => {
    return usePersianDigits ? toPersianDigits(text) : text.toString();
  };

  return (
    <form onSubmit={validateAndSubmit} className="space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl font-sans" dir="rtl">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <span>{taskToEdit ? 'ویرایش کار' : 'ثبت کار جدید'}</span>
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400 animate-shake">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            عنوان کار <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: ورزش صبحگاهی، بررسی کدهای پروژه..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
          />
        </div>

        {/* Category Selection */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            نوع کار (دسته‌بندی)
          </label>
          <div className="flex gap-2">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="px-3.5 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
              title="مدیریت دسته‌بندی‌ها"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <PersianDatePicker
            label="تاریخ انجام"
            value={date}
            onChange={setDate}
            usePersianDigits={usePersianDigits}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          توضیحات کار <span className="text-slate-400 text-xs">(اختیاری)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="جزئیات بیشتری وارد کنید..."
          rows={2}
          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Precise time switch */}
      <div className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">ساعت و زمان دقیق کار</span>
            <span className="block text-[11px] text-slate-400">امکان اندازه‌گیری ساعت کار مفید و فعالسازی آلارم</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHasTime(!hasTime)}
          className={`
            w-11 h-6 rounded-full p-0.5 cursor-pointer transition-colors duration-250 flex items-center
            ${hasTime ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-800'}
          `}
        >
          <div
            className={`
              w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-250 transform
              ${hasTime ? '-translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Precise time fields */}
      <AnimatePresence initial={false}>
        {hasTime && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4 pt-1 pb-2">
              {(() => {
                const [startHour, startMin] = (startTime || '08:00').split(':');
                const [endHour, endMin] = (endTime || '17:00').split(':');

                return (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        ساعت شروع (۲۴ ساعته)
                      </label>
                      <div className="flex gap-1.5 items-center" dir="ltr">
                        <select
                          value={startHour || '08'}
                          onChange={(e) => setStartTime(`${e.target.value}:${startMin || '00'}`)}
                          className="flex-1 px-2 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {Array.from({ length: 24 }).map((_, i) => {
                            const h = i.toString().padStart(2, '0');
                            return <option key={h} value={h}>{renderDigits(h)}</option>;
                          })}
                        </select>
                        <span className="text-slate-400 dark:text-slate-600 font-bold">:</span>
                        <select
                          value={startMin || '00'}
                          onChange={(e) => setStartTime(`${startHour || '08'}:${e.target.value}`)}
                          className="flex-1 px-2 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {Array.from({ length: 60 }).map((_, i) => {
                            const m = i.toString().padStart(2, '0');
                            return <option key={m} value={m}>{renderDigits(m)}</option>;
                          })}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        ساعت پایان (۲۴ ساعته)
                      </label>
                      <div className="flex gap-1.5 items-center" dir="ltr">
                        <select
                          value={endHour || '17'}
                          onChange={(e) => setEndTime(`${e.target.value}:${endMin || '00'}`)}
                          className="flex-1 px-2 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {Array.from({ length: 24 }).map((_, i) => {
                            const h = i.toString().padStart(2, '0');
                            return <option key={h} value={h}>{renderDigits(h)}</option>;
                          })}
                        </select>
                        <span className="text-slate-400 dark:text-slate-600 font-bold">:</span>
                        <select
                          value={endMin || '00'}
                          onChange={(e) => setEndTime(`${endHour || '17'}:${e.target.value}`)}
                          className="flex-1 px-2 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {Array.from({ length: 60 }).map((_, i) => {
                            const m = i.toString().padStart(2, '0');
                            return <option key={m} value={m}>{renderDigits(m)}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Duration (Optional) when hasTime is false */}
      {!hasTime && (
        <div className="p-3.5 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
            ثبت مدت زمان کار به صورت دستی (اختیاری)
          </label>
          <div className="grid grid-cols-2 gap-3" dir="ltr">
            <div>
              <span className="block text-[10px] text-slate-400 mb-1 text-right">ساعت</span>
              <select
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i.toString()}>{renderDigits(i)}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 mb-1 text-right">دقیقه</span>
              <select
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={i.toString()}>{renderDigits(i)}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal text-right">
            اگر این کار زمان مشخصی ندارد، می‌توانید مستقیماً مشخص کنید چقدر روی آن وقت گذاشته‌اید تا در گزارش‌ها لحاظ شود.
          </p>
        </div>
      )}

      {/* Priority Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          اولویت انجام کار
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['high', 'medium', 'low'] as Priority[]).map((p) => {
            const isSelected = priority === p;
            let btnClass = 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300';
            if (isSelected) {
              if (p === 'high') btnClass = 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/10';
              if (p === 'medium') btnClass = 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10';
              if (p === 'low') btnClass = 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10';
            }

            const label = p === 'high' ? 'بالا (قرمز)' : p === 'medium' ? 'متوسط (نارنجی)' : 'پایین (سبز)';

            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`
                  py-2 border text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer
                  ${btnClass}
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurrence Patterns */}
      <div className="space-y-4 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              الگوی تکرار کار
            </label>
            <select
              value={repeatPattern}
              onChange={(e) => setRepeatPattern(e.target.value as RepeatPattern)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="none">بدون تکرار (یک‌باره)</option>
              <option value="daily">روزانه (هر روز)</option>
              <option value="even_odd">روزهای زوج / فرد (روزهای هفته)</option>
              <option value="weekly">هفتگی (روزهای خاص هفته)</option>
              <option value="until_tomorrow">تا فردا (کپی خودکار تا فردا)</option>
              <option value="until_after_tomorrow">تا پس‌فردا (کپی خودکار تا پس‌فردا)</option>
            </select>
          </div>

          {/* Recurrence End Date: Show for daily/even_odd/weekly */}
          {repeatPattern !== 'none' && repeatPattern !== 'until_tomorrow' && repeatPattern !== 'until_after_tomorrow' && (
            <div>
              <PersianDatePicker
                label="پایان تکرار کار"
                value={repeatEndDate}
                onChange={setRepeatEndDate}
                usePersianDigits={usePersianDigits}
                minDate={date}
              />
            </div>
          )}
        </div>

        {/* Weekly Day Selector */}
        <AnimatePresence>
          {repeatPattern === 'weekly' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-slate-50 dark:bg-slate-950 p-3.5 border border-slate-100 dark:border-slate-800/60 rounded-xl"
            >
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                انتخاب روزهای تکرار در هفته
              </label>
              <div className="flex flex-wrap gap-1.5 justify-between">
                {WEEKDAYS_SHORT.map((day) => {
                  const isChecked = repeatDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={`
                        w-9 h-9 text-xs font-bold rounded-full border transition-all duration-150 cursor-pointer flex items-center justify-center
                        ${isChecked
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }
                      `}
                      title={day.fullName}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Information about even/odd */}
        {repeatPattern === 'even_odd' && (
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150 dark:border-slate-800/40">
            * بر اساس تاریخ شروع، کار در کل روزهای زوج (شنبه، دوشنبه، چهارشنبه) یا روزهای فرد (یکشنبه، سه‌شنبه، پنجشنبه) کپی و ایجاد می‌شود.
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer"
      >
        <span>{taskToEdit ? 'ذخیره تغییرات کار' : 'ثبت و افزودن کار'}</span>
      </button>
    </form>
  );
}
