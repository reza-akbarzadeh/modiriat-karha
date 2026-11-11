import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, Trash2, Edit2, Calendar, Clock, Search, AlertCircle, RefreshCw, Filter, SlidersHorizontal, ArrowUpDown, Square, CheckSquare, PlusCircle, Ban
} from 'lucide-react';
import { Task, Category, Priority } from '../types';
import { getCategoryIcon } from './CategoryManager';
import { formatJalaliHuman, toPersianDigits, compareJalaliDates, getJalaliString, gregorianToJalali } from '../utils/jalali';
import PersianDatePicker from './PersianDatePicker';

interface TaskListProps {
  tasks: Task[];
  categories: Category[];
  onToggleComplete: (id: string) => void;
  onToggleAbandon?: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onDeleteTasks: (ids: string[]) => void;
  onRenewTask: (id: string, startDate: string, repeatCount?: number, usePattern?: boolean) => void;
  onDeleteTaskWithOptions: (id: string, option: 'only' | 'future' | 'all_repeats') => void;
  usePersianDigits: boolean;
  todayJalali: string;
}

export default function TaskList({
  tasks,
  categories,
  onToggleComplete,
  onToggleAbandon,
  onEditTask,
  onDeleteTask,
  onDeleteTasks,
  onRenewTask,
  onDeleteTaskWithOptions,
  usePersianDigits,
  todayJalali,
}: TaskListProps) {
  // Filter States
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all' | 'custom' | 'overdue' | 'abandoned'>('today');
  const [customDate, setCustomDate] = useState(todayJalali);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Bulk Selection and Modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recurringTaskToDelete, setRecurringTaskToDelete] = useState<Task | null>(null);
  const [taskToRenew, setTaskToRenew] = useState<Task | null>(null);
  const [renewalDate, setRenewalDate] = useState<string>(todayJalali);
  const [showRenewalDatePicker, setShowRenewalDatePicker] = useState<boolean>(false);
  const [renewalCount, setRenewalCount] = useState<number>(1);
  const [usePreviousPattern, setUsePreviousPattern] = useState<boolean>(true);

  // Reset renewal states when task changes
  useEffect(() => {
    if (taskToRenew) {
      setRenewalDate(todayJalali);
      setRenewalCount(1);
      setUsePreviousPattern(taskToRenew.repeatPattern !== 'none');
    }
  }, [taskToRenew, todayJalali]);

  // Sorting
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority');

  // Clear selection on filter changes to prevent mistakes
  useEffect(() => {
    setSelectedIds([]);
  }, [dateFilter, categoryFilter, priorityFilter, searchQuery]);

  const getCategory = (catId: string) => {
    return categories.find(c => c.id === catId);
  };

  const getDurationText = (minutes?: number) => {
    if (!minutes) return '';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let text = '';
    if (hrs > 0) text += `${hrs} ساعت `;
    if (mins > 0) text += `${mins} دقیقه`;
    return usePersianDigits ? toPersianDigits(text) : text;
  };

  const getPriorityBadgeClass = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'low':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'اولویت بالا';
      case 'medium': return 'اولویت متوسط';
      case 'low': return 'اولویت پایین';
    }
  };

  // Filter Logic
  const tomorrowJalali = (() => {
    const todayG = new Date();
    todayG.setDate(todayG.getDate() + 1);
    const [ty, tm, td] = gregorianToJalali(todayG);
    return `${ty}/${tm.toString().padStart(2, '0')}/${td.toString().padStart(2, '0')}`;
  })();

  const overdueCount = tasks.filter(t => !t.isCompleted && !t.isAbandoned && compareJalaliDates(t.date, todayJalali) < 0).length;
  const abandonedCount = tasks.filter(t => t.isAbandoned).length;

  const filteredTasks = tasks.filter((task) => {
    // Separate abandoned tasks completely from active/completed views
    if (dateFilter === 'abandoned') {
      if (!task.isAbandoned) return false;
    } else {
      if (task.isAbandoned) return false;
    }

    // 1. Date filter
    if (dateFilter === 'today' && task.date !== todayJalali) return false;
    if (dateFilter === 'tomorrow' && task.date !== tomorrowJalali) return false;
    if (dateFilter === 'custom' && task.date !== customDate) return false;
    if (dateFilter === 'overdue') {
      const isOverdue = !task.isCompleted && compareJalaliDates(task.date, todayJalali) < 0;
      if (!isOverdue) return false;
    }

    // 2. Category filter
    if (categoryFilter !== 'all' && task.categoryId !== categoryFilter) return false;

    // 3. Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });

  // Sort Logic
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Put completed tasks at the bottom
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }

    if (sortBy === 'priority') {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      // Secondary sort: date
      return compareJalaliDates(b.date, a.date);
    } else {
      // Sort by date
      const dDiff = compareJalaliDates(b.date, a.date);
      if (dDiff !== 0) return dDiff;
      // Secondary sort: priority
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    }
  });

  const renderDigits = (text: string | number) => {
    return usePersianDigits ? toPersianDigits(text) : text.toString();
  };

  return (
    <div className="space-y-4 font-sans" dir="rtl">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-md space-y-4">
        {/* Search & Main Toggles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="جستجوی کارها بر اساس عنوان یا توضیحات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {(['today', 'tomorrow', 'all', 'overdue', 'custom', 'abandoned'] as const).map((mode) => {
              const active = dateFilter === mode;
              
              let label = '';
              if (mode === 'today') label = 'امروز';
              else if (mode === 'tomorrow') label = 'فردا';
              else if (mode === 'all') label = 'همه کارها';
              else if (mode === 'overdue') label = `باقی‌مانده از گذشته ${overdueCount > 0 ? `(${renderDigits(overdueCount)})` : ''}`;
              else if (mode === 'custom') label = 'تاریخ خاص';
              else if (mode === 'abandoned') label = `رها شده ${abandonedCount > 0 ? `(${renderDigits(abandonedCount)})` : ''}`;

              let btnClass = active
                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50';
              
              // Style overdue differently if active/inactive
              if (mode === 'overdue' && !active && overdueCount > 0) {
                btnClass = 'border-red-200 dark:border-red-950/40 bg-red-50/50 dark:bg-red-950/10 text-red-600 dark:text-red-400 hover:bg-red-100/30';
              } else if (mode === 'overdue' && active) {
                btnClass = 'bg-red-600 border-red-600 text-white shadow-md';
              } else if (mode === 'abandoned' && !active && abandonedCount > 0) {
                btnClass = 'border-amber-200 dark:border-amber-950/40 bg-amber-50/50 dark:bg-amber-950/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100/30';
              } else if (mode === 'abandoned' && active) {
                btnClass = 'bg-amber-600 border-amber-600 text-white shadow-md';
              }

              return (
                <button
                  key={mode}
                  onClick={() => setDateFilter(mode)}
                  className={`
                    px-4 py-2 text-xs font-bold rounded-lg border transition-all shrink-0 cursor-pointer flex items-center gap-1
                    ${btnClass}
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Picker slide-down if Custom Mode is active */}
        <AnimatePresence>
          {dateFilter === 'custom' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-visible relative z-30 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150 dark:border-slate-800/40"
            >
              <div className="max-w-xs">
                <PersianDatePicker
                  label="انتخاب تاریخ مد نظر"
                  value={customDate}
                  onChange={setCustomDate}
                  usePersianDigits={usePersianDigits}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Filters Trigger and Sort toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-150 dark:border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-bold
                ${showFilters 
                  ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-800' 
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }
              `}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فیلترهای پیشرفته</span>
            </button>

            {sortBy === 'priority' ? (
              <button
                onClick={() => setSortBy('date')}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer font-bold"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>مرتب‌سازی: بر اساس اولویت</span>
              </button>
            ) : (
              <button
                onClick={() => setSortBy('priority')}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer font-bold"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>مرتب‌سازی: بر اساس تاریخ</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            تعداد کارها: {renderDigits(sortedTasks.length)} مورد پیدا شد
          </div>
        </div>

        {/* Advanced Filters Fields */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    فیلتر بر اساس نوع کار
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                  >
                    <option value="all">همه دسته‌بندی‌ها</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    فیلتر بر اساس اولویت
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                  >
                    <option value="all">همه اولویت‌ها</option>
                    <option value="high">فقط بالا</option>
                    <option value="medium">فقط متوسط</option>
                    <option value="low">فقط پایین</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Overdue Warning Banner on Today's View */}
      {dateFilter === 'today' && overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
            <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
            <span>شما {renderDigits(overdueCount)} کار باقی‌مانده و انجام‌نشده از روزهای گذشته دارید!</span>
          </div>
          <button
            onClick={() => setDateFilter('overdue')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all cursor-pointer"
          >
            مشاهده کارهای باقی‌مانده
          </button>
        </motion.div>
      )}

      {/* Bulk Action Panel */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-blue-50 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
            <CheckSquare className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <span>{renderDigits(selectedIds.length)} کار انتخاب شده است</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const allFilteredIds = sortedTasks.map(t => t.id);
                const isAllSelected = allFilteredIds.every(id => selectedIds.includes(id));
                if (isAllSelected) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(allFilteredIds);
                }
              }}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-bold cursor-pointer transition-colors"
            >
              {sortedTasks.every(t => selectedIds.includes(t.id)) ? 'لغو انتخاب همه' : 'انتخاب همه فیلتر شده'}
            </button>

            <button
              onClick={() => {
                if (confirm(`آیا از حذف گروهی ${selectedIds.length} کار مطمئن هستید؟`)) {
                  onDeleteTasks(selectedIds);
                  setSelectedIds([]);
                }
              }}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف گروهی</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Task Cards Stack */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-500 dark:text-slate-400"
            >
              <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold">هیچ کاری یافت نشد.</p>
              <p className="text-xs text-slate-400 mt-1">تغییر فیلترها یا ثبت کار جدید می‌تواند لیست را تغییر دهد.</p>
            </motion.div>
          ) : (
            sortedTasks.map((task) => {
              const cat = getCategory(task.categoryId);
              const CatIcon = cat ? getCategoryIcon(cat.icon) : Filter;

              return (
                <motion.div
                  key={task.id}
                  layoutId={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`
                    p-4 border rounded-2xl bg-white dark:bg-slate-900 flex items-start gap-3 transition-all relative group shadow-xs hover:shadow-md
                    ${task.isCompleted 
                      ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-70' 
                      : task.isAbandoned
                        ? 'border-dashed border-amber-200 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/5 opacity-70'
                        : 'border-slate-200 dark:border-slate-800'
                    }
                  `}
                  style={!task.isCompleted && !task.isAbandoned && cat ? { borderRight: `5px solid ${cat.color}` } : undefined}
                >
                  {/* Bulk Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isSelected = selectedIds.includes(task.id);
                      if (isSelected) {
                        setSelectedIds(prev => prev.filter(id => id !== task.id));
                      } else {
                        setSelectedIds(prev => [...prev, task.id]);
                      }
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-blue-500 transition-colors shrink-0 mt-0.5"
                    title="انتخاب کار برای حذف/تمدید گروهی"
                  >
                    {selectedIds.includes(task.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                    )}
                  </button>

                  {/* Checkbox trigger */}
                  <button
                    onClick={() => onToggleComplete(task.id)}
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all cursor-pointer
                      ${task.isCompleted
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-white dark:bg-slate-900'
                      }
                    `}
                  >
                    {task.isCompleted && <Check className="w-4 h-4 font-bold" />}
                  </button>

                  {/* Task details body */}
                  <div className="flex-1 space-y-2 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Priority badge */}
                      <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-md ${getPriorityBadgeClass(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>

                      {/* Category Badge */}
                      {cat && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1"
                          style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{cat.name}</span>
                        </span>
                      )}

                      {/* Recurrence icon if applicable */}
                      {task.repeatPattern !== 'none' && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md text-[10px] font-bold flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>تکراری</span>
                        </span>
                      )}

                      {/* Abandoned badge */}
                      {task.isAbandoned && (
                        <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 border border-amber-200/55 rounded-md text-[10px] font-bold">
                          رها شده (انجام‌نشده)
                        </span>
                      )}

                      {/* Date show in "All" or "Overdue" view */}
                      {(dateFilter === 'all' || dateFilter === 'overdue') && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold mr-auto">
                          <Calendar className="w-3 h-3" />
                          <span>{formatJalaliHuman(task.date, usePersianDigits)}</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      className={`
                        text-sm font-bold leading-snug
                        ${task.isCompleted ? 'line-through text-slate-400 dark:text-slate-600' : ''}
                        ${task.isAbandoned ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-900 dark:text-slate-100'}
                      `}
                    >
                      {task.title}
                    </h4>

                    {/* Description */}
                    {task.description && (
                      <p className={`text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap ${task.isCompleted ? 'line-through opacity-60' : ''}`}>
                        {task.description}
                      </p>
                    )}

                    {/* Time / Duration info */}
                    {task.hasTime && task.startTime && (
                      <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span>{renderDigits(task.startTime)} {task.endTime ? `تا ${renderDigits(task.endTime)}` : ''}</span>
                        </span>
                        {task.durationMinutes && (
                          <span className="bg-blue-50/50 dark:bg-blue-950/10 px-2 py-0.5 rounded-md text-blue-600 dark:text-blue-400">
                            زمان کل کار مفید: {getDurationText(task.durationMinutes)}
                          </span>
                        )}
                      </div>
                    )}

                    {!task.hasTime && task.durationMinutes ? (
                      <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>مدت زمان کار (ثبت‌شده):</span>
                        </span>
                        <span className="bg-emerald-50/50 dark:bg-emerald-950/10 px-2 py-0.5 rounded-md text-emerald-600 dark:text-emerald-400">
                          {getDurationText(task.durationMinutes)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    {confirmDeleteId === task.id ? (
                      <div className="flex items-center gap-1 bg-red-50/80 dark:bg-red-950/20 p-1.5 rounded-xl border border-red-200/50 dark:border-red-900/30 animate-fade-in">
                        <button
                          onClick={() => {
                            onDeleteTask(task.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer"
                        >
                          حذف
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                          لغو
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Renew/Extend Button */}
                        <button
                          onClick={() => {
                            setTaskToRenew(task);
                            setRenewalDate(todayJalali);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-all cursor-pointer"
                          title="تمدید مجدد این کار"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {onToggleAbandon && !task.isCompleted && (
                          <button
                            onClick={() => onToggleAbandon(task.id)}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                              task.isAbandoned
                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 hover:text-amber-700'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                            }`}
                            title={task.isAbandoned ? 'بازگردانی کار به لیست فعال' : 'رها کردن کار (عدم انجام)'}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onEditTask(task)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-all cursor-pointer"
                          title="ویرایش کار"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            if (task.repeatPattern !== 'none' || task.parentTaskId) {
                              setRecurringTaskToDelete(task);
                            } else {
                              setConfirmDeleteId(task.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                          title="حذف کار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Recurring Task Deletion Options Modal */}
      {recurringTaskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">حذف کار تکرارشونده</h3>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              کار <span className="font-bold text-slate-900 dark:text-white">«{recurringTaskToDelete.title}»</span> یک کار تکرارشونده است. چگونه مایلید این کار را حذف کنید؟
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  onDeleteTaskWithOptions(recurringTaskToDelete.id, 'only');
                  setRecurringTaskToDelete(null);
                }}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-right px-4 flex justify-between items-center border border-slate-150 dark:border-slate-800"
              >
                <span>فقط حذف همین یک مورد (در تاریخ این کار)</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md text-slate-500">ساده</span>
              </button>

              <button
                onClick={() => {
                  onDeleteTaskWithOptions(recurringTaskToDelete.id, 'future');
                  setRecurringTaskToDelete(null);
                }}
                className="w-full py-2.5 bg-orange-50/80 dark:bg-orange-950/20 hover:bg-orange-100/50 text-orange-700 dark:text-orange-400 font-bold text-xs rounded-xl transition-all cursor-pointer text-right px-4 flex justify-between items-center border border-orange-200/40"
              >
                <span>حذف این مورد و تمامی تکرارهای آینده آن</span>
                <span className="text-[10px] bg-orange-200/35 px-2 py-0.5 rounded-md text-orange-600">هوشمند</span>
              </button>

              <button
                onClick={() => {
                  onDeleteTaskWithOptions(recurringTaskToDelete.id, 'all_repeats');
                  setRecurringTaskToDelete(null);
                }}
                className="w-full py-2.5 bg-red-50/80 dark:bg-red-950/20 hover:bg-red-100/50 text-red-700 dark:text-red-400 font-bold text-xs rounded-xl transition-all cursor-pointer text-right px-4 flex justify-between items-center border border-red-200/40"
              >
                <span>حذف کل کار تکرارشونده (همه‌ی روزها و دفعات)</span>
                <span className="text-[10px] bg-red-200/35 px-2 py-0.5 rounded-md text-red-600">کامل</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRecurringTaskToDelete(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Task Renewal Modal */}
      {taskToRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">تمدید و تعریف مجدد کار</h3>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              کار قبلی <span className="font-bold text-slate-900 dark:text-white">«{taskToRenew.title}»</span> را با همان تنظیمات و توضیحات اصلی برای آینده برنامه‌ریزی مجدد کنید.
            </p>

            {/* Date Pickers */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تاریخ شروع تمدید:
                </label>
                <div className="relative z-30">
                  <PersianDatePicker
                    value={renewalDate}
                    onChange={(d) => {
                      setRenewalDate(d);
                    }}
                    usePersianDigits={usePersianDigits}
                  />
                </div>
              </div>

              {/* Number of repetitions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تعداد دفعات تکرار/تمدید (تعداد کار):
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={renewalCount}
                  onChange={(e) => setRenewalCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  به این تعداد کپی مجزا با تاریخ‌های پیاپی/الگو ساخته خواهد شد (حداکثر ۳۰ بار).
                </span>
              </div>

              {/* Recurrence Option if master had one */}
              {taskToRenew.repeatPattern !== 'none' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      استفاده از الگوی تکرار قبلی کار
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      الگو: {
                        taskToRenew.repeatPattern === 'daily' ? 'روزانه' :
                        taskToRenew.repeatPattern === 'weekly' ? 'هفتگی' :
                        taskToRenew.repeatPattern === 'even_odd' ? 'روزهای زوج/فرد' :
                        taskToRenew.repeatPattern === 'until_tomorrow' ? 'تا فردا' :
                        taskToRenew.repeatPattern === 'until_after_tomorrow' ? 'تا پس‌فردا' : 'بدون تکرار'
                      }
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={usePreviousPattern}
                    onChange={(e) => setUsePreviousPattern(e.target.checked)}
                    className="w-4.5 h-4.5 accent-emerald-500 text-white rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setTaskToRenew(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                انصراف
              </button>

              <button
                onClick={() => {
                  onRenewTask(taskToRenew.id, renewalDate, renewalCount, usePreviousPattern);
                  setTaskToRenew(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ثبت و تولید کارهای جدید</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
