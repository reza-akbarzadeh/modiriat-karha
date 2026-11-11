import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Sun, Moon, Download, Sliders, Bell, BellOff, ListTodo, Plus, Info, TrendingUp
} from 'lucide-react';
import { Task, Category, Alarm } from './types';
import { 
  getJalaliString, 
  parseJalaliString, 
  getJalaliWeekRange, 
  toPersianDigits,
  compareJalaliDates,
  addDaysToJalali,
  jalaliToGregorian
} from './utils/jalali';
import { generateRecurringTasks, isPersianEvenDay, isPersianOddDay } from './utils/recurrence';
import { startAlarmLoop, stopAlarmLoop } from './utils/audio';
import { exportTasksToPDF } from './utils/pdf';

import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import StatsDashboard from './components/StatsDashboard';
import CategoryManager from './components/CategoryManager';
import AlarmModal from './components/AlarmModal';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-work', name: 'کاری', color: '#3b82f6', icon: 'Briefcase', isSystem: true },
  { id: 'cat-personal', name: 'شخصی', color: '#10b981', icon: 'User', isSystem: true },
  { id: 'cat-sport', name: 'ورزشی', color: '#ef4444', icon: 'Dumbbell', isSystem: true },
  { id: 'cat-study', name: 'مطالعه', color: '#8b5cf6', icon: 'BookOpen', isSystem: true },
];

export default function App() {
  // --- Global App States ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dismissedAlarms, setDismissedAlarms] = useState<string[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);

  // Preference Settings
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [usePersianDigits, setUsePersianDigits] = useState<boolean>(true);

  // Component triggers
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
  const [showCategoryManager, setShowCategoryManager] = useState<boolean>(false);
  const [taskToSetDuration, setTaskToSetDuration] = useState<Task | null>(null);
  const [durationHours, setDurationHours] = useState<string>('0');
  const [durationMinutes, setDurationMinutes] = useState<string>('30');

  // Today Date details (Jalali representation)
  const [todayJalali, setTodayJalali] = useState<string>(() => getJalaliString(new Date()));

  // Tab selector state
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats' | 'categories'>('tasks');

  // --- Initial Mount & Loading ---
  useEffect(() => {
    // 1. Calculate today's Jalali string
    const todayG = new Date();
    const todayStr = getJalaliString(todayG);
    setTodayJalali(todayStr);

    // 2. Load LocalStorage
    const storedTasks = localStorage.getItem('tasks');
    const storedCats = localStorage.getItem('categories');
    const storedTheme = localStorage.getItem('theme') || 'light';
    const storedDigits = localStorage.getItem('usePersianDigits');
    const storedDismissed = localStorage.getItem('dismissedAlarms');

    // Load theme
    setTheme(storedTheme as 'light' | 'dark');
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load digits preference
    if (storedDigits !== null) {
      setUsePersianDigits(storedDigits === 'true');
    }

    // Load dismissed alarms
    if (storedDismissed) {
      setDismissedAlarms(JSON.parse(storedDismissed));
    }

    // Load categories
    let finalCategories = DEFAULT_CATEGORIES;
    if (storedCats) {
      try {
        finalCategories = JSON.parse(storedCats);
      } catch (e) {
        console.error('Failed to parse categories:', e);
      }
    }
    setCategories(finalCategories);

    // Load tasks and trigger Recurrence Generator
    let initialTasks: Task[] = [];
    if (storedTasks) {
      try {
        initialTasks = JSON.parse(storedTasks);
      } catch (e) {
        console.error('Failed to parse tasks:', e);
      }
    }

    // Run Recurrence Generator for today's date
    const { updatedTasks, generatedCount } = generateRecurringTasks(initialTasks, todayStr);
    
    setTasks(updatedTasks);
    if (generatedCount > 0 || !storedTasks) {
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    }
  }, []);

  // --- Theme Controller ---
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // --- Toggle Digits ---
  const toggleDigits = () => {
    const nextVal = !usePersianDigits;
    setUsePersianDigits(nextVal);
    localStorage.setItem('usePersianDigits', String(nextVal));
  };

  // --- Background Alarm Monitor ---
  useEffect(() => {
    const alarmInterval = setInterval(() => {
      if (activeAlarm) return; // Wait until current is handled

      const now = new Date();
      const currentJStr = getJalaliString(now);
      const hrs = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${hrs}:${mins}`;

      // Search active tasks for today that start now
      const matchTask = tasks.find((t) => {
        if (t.isCompleted || !t.hasTime || !t.startTime) return false;
        if (t.date !== currentJStr) return false;
        
        // Check if starts exactly at this minute
        if (t.startTime !== currentTimeStr) return false;

        // Check if already dismissed today at this hour
        const uniqueKey = `${t.id}_${t.date}_${t.startTime}`;
        return !dismissedAlarms.includes(uniqueKey);
      });

      if (matchTask) {
        const alarmObj: Alarm = {
          taskId: matchTask.id,
          taskTitle: matchTask.title,
          time: matchTask.startTime!,
          date: matchTask.date,
          triggered: true,
        };

        setActiveAlarm(alarmObj);
        startAlarmLoop();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(alarmInterval);
  }, [tasks, dismissedAlarms, activeAlarm]);

  const handleDismissAlarm = () => {
    if (activeAlarm) {
      const uniqueKey = `${activeAlarm.taskId}_${activeAlarm.date}_${activeAlarm.time}`;
      const nextDismissed = [...dismissedAlarms, uniqueKey];
      setDismissedAlarms(nextDismissed);
      localStorage.setItem('dismissedAlarms', JSON.stringify(nextDismissed));
      setActiveAlarm(null);
      stopAlarmLoop();
    }
  };

  // --- Task State CRUD operations ---
  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => {
    let updated: Task[];

    if (taskData.id) {
      // Edit mode
      updated = tasks.map((t) => {
        if (t.id === taskData.id) {
          return {
            ...t,
            title: taskData.title,
            description: taskData.description,
            categoryId: taskData.categoryId,
            date: taskData.date,
            hasTime: taskData.hasTime,
            startTime: taskData.startTime,
            endTime: taskData.endTime,
            durationMinutes: taskData.durationMinutes,
            priority: taskData.priority,
            repeatPattern: taskData.repeatPattern,
            repeatDays: taskData.repeatDays,
            repeatEndDate: taskData.repeatEndDate,
            isCompleted: taskData.isCompleted,
          };
        }
        return t;
      });
      setTaskToEdit(undefined);
    } else {
      // Create mode
      const newTask: Task = {
        ...taskData,
        id: `task_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updated = [newTask, ...tasks];
    }

    setTasks(updated);
    localStorage.setItem('tasks', JSON.stringify(updated));

    // After updating tasks, re-run recurrence to generate instances if needed
    setTimeout(() => {
      const { updatedTasks } = generateRecurringTasks(updated, todayJalali);
      setTasks(updatedTasks);
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    }, 100);
  };

  const handleToggleComplete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (!task.isCompleted && !task.hasTime) {
      setTaskToSetDuration(task);
      if (task.durationMinutes) {
        setDurationHours(Math.floor(task.durationMinutes / 60).toString());
        setDurationMinutes((task.durationMinutes % 60).toString());
      } else {
        setDurationHours('0');
        setDurationMinutes('30');
      }
    } else {
      const updated = tasks.map((t) => {
        if (t.id === id) {
          return { ...t, isCompleted: !t.isCompleted, isAbandoned: false }; // Clear abandoned if completed
        }
        return t;
      });
      setTasks(updated);
      localStorage.setItem('tasks', JSON.stringify(updated));
    }
  };

  const handleToggleAbandon = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        const isNowAbandoned = !t.isAbandoned;
        return { 
          ...t, 
          isAbandoned: isNowAbandoned, 
          isCompleted: false 
        };
      }
      return t;
    });
    setTasks(updated);
    localStorage.setItem('tasks', JSON.stringify(updated));
  };

  const handleSaveTaskDuration = (hours: number, minutes: number, skip: boolean) => {
    if (!taskToSetDuration) return;
    const durationVal = skip ? undefined : (hours * 60 + minutes);
    const updated = tasks.map((t) => {
      if (t.id === taskToSetDuration.id) {
        return { 
          ...t, 
          isCompleted: true, 
          durationMinutes: durationVal 
        };
      }
      return t;
    });
    setTasks(updated);
    localStorage.setItem('tasks', JSON.stringify(updated));
    setTaskToSetDuration(null);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    localStorage.setItem('tasks', JSON.stringify(updated));
  };

  const handleDeleteTasks = (ids: string[]) => {
    const updated = tasks.filter(t => !ids.includes(t.id));
    setTasks(updated);
    localStorage.setItem('tasks', JSON.stringify(updated));
  };

  const handleRenewTask = (
    id: string,
    startDate: string,
    repeatCount = 1,
    usePattern = false
  ) => {
    const original = tasks.find(t => t.id === id);
    if (!original) return;

    // Generate dates based on pattern or simple days
    const dates: string[] = [];
    let current = startDate;
    let attempts = 0;

    const pattern = usePattern ? original.repeatPattern : 'none';
    const repeatDays = original.repeatDays;

    while (dates.length < repeatCount && attempts < 365) {
      attempts++;
      let matches = false;

      if (pattern === 'none' || pattern === 'daily' || pattern === 'until_tomorrow' || pattern === 'until_after_tomorrow') {
        matches = true;
      } else if (pattern === 'even_odd') {
        const [jy, jm, jd] = parseJalaliString(current);
        const gDate = jalaliToGregorian(jy, jm, jd);
        const jsDay = gDate.getDay();
        
        // Determine whether master is even or odd day
        const [jyM, jmM, jdM] = parseJalaliString(original.date);
        const masterG = jalaliToGregorian(jyM, jmM, jdM);
        const masterJsDay = masterG.getDay();

        if (isPersianEvenDay(masterJsDay)) {
          matches = isPersianEvenDay(jsDay);
        } else {
          matches = isPersianOddDay(jsDay);
        }
      } else if (pattern === 'weekly') {
        const [jy, jm, jd] = parseJalaliString(current);
        const gDate = jalaliToGregorian(jy, jm, jd);
        const jsDay = gDate.getDay();
        if (repeatDays && repeatDays.includes(jsDay)) {
          matches = true;
        }
      }

      if (matches) {
        dates.push(current);
      }

      current = addDaysToJalali(current, 1);
    }

    // Create renewed task instances
    const newTasks: Task[] = dates.map((dateStr, idx) => {
      const randomSfx = Math.random().toString(36).substring(2, 6);
      return {
        ...original,
        id: `task_${Date.now()}_${idx}_${randomSfx}`,
        date: dateStr,
        isCompleted: false,
        parentTaskId: undefined, // Create standalone copies
        createdAt: new Date().toISOString(),
      };
    });

    // Mark original task as completed so it doesn't show as overdue/remaining anymore
    const updatedTasks = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, isCompleted: true };
      }
      return t;
    });

    const updated = [...newTasks, ...updatedTasks];
    setTasks(updated);
    localStorage.setItem('tasks', JSON.stringify(updated));
  };

  const handleDeleteTaskWithOptions = (id: string, option: 'only' | 'future' | 'all_repeats') => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let updated = [...tasks];
    if (option === 'only') {
      updated = tasks.filter(t => t.id !== id);
    } else if (option === 'future') {
      const targetParentId = task.parentTaskId || task.id;
      updated = tasks.filter(t => {
        if (t.id === id) return false;
        const isSameGroup = t.parentTaskId === targetParentId || t.id === targetParentId;
        const isFuture = compareJalaliDates(t.date, task.date) >= 0;
        return !(isSameGroup && isFuture);
      });
    } else if (option === 'all_repeats') {
      const targetParentId = task.parentTaskId || task.id;
      const titleToMatch = task.title;
      updated = tasks.filter(t => {
        const isSameGroup = t.parentTaskId === targetParentId || t.id === targetParentId || t.title === titleToMatch;
        return !isSameGroup;
      });
    }

    setTasks(updated);
    localStorage.setItem('tasks', JSON.stringify(updated));
  };

  // --- Category State CRUD operations ---
  const handleAddCategory = (name: string, color: string, icon: string) => {
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name,
      color,
      icon,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('categories', JSON.stringify(updated));
  };

  const handleDeleteCategory = (catId: string) => {
    const updated = categories.filter(c => c.id !== catId);
    setCategories(updated);
    localStorage.setItem('categories', JSON.stringify(updated));

    // Re-bind tasks that were in this category to first system category
    const defaultCatId = categories.find(c => c.isSystem)?.id || 'cat-work';
    const updatedTasks = tasks.map((t) => {
      if (t.categoryId === catId) {
        return { ...t, categoryId: defaultCatId };
      }
      return t;
    });
    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
  };

  // Calculate time statistics
  const calculateStats = () => {
    const completed = tasks.filter(t => t.isCompleted && t.durationMinutes);

    // 1. Total
    const totalMinutes = completed.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
    const totalHours = totalMinutes / 60;

    // 2. Week
    const { start: weekStart, end: weekEnd } = getJalaliWeekRange(todayJalali || '1405/01/01');
    const weekMinutes = completed
      .filter(t => compareJalaliDates(t.date, weekStart) >= 0 && compareJalaliDates(t.date, weekEnd) <= 0)
      .reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
    const weekHours = weekMinutes / 60;

    // 3. Month
    const [tY, tM] = parseJalaliString(todayJalali || '1405/01/01');
    const monthMinutes = completed
      .filter((t) => {
        const [y, m] = parseJalaliString(t.date);
        return y === tY && m === tM;
      })
      .reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
    const monthHours = monthMinutes / 60;

    // 4. Year
    const yearMinutes = completed
      .filter((t) => {
        const [y] = parseJalaliString(t.date);
        return y === tY;
      })
      .reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
    const yearHours = yearMinutes / 60;

    return { totalHours, weekHours, monthHours, yearHours };
  };

  const stats = calculateStats();

  // --- Handle PDF Generation ---
  const handleDownloadPDF = async () => {
    if (!todayJalali) return;
    try {
      await exportTasksToPDF(tasks, categories, stats, usePersianDigits, todayJalali);
    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('خطا در بارگیری گزارش PDF رخ داد.');
    }
  };

  const renderDigits = (text: string | number) => {
    return usePersianDigits ? toPersianDigits(text) : text.toString();
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-250 pb-12 text-slate-800 dark:text-slate-100 flex flex-col`}>
      {/* Visual background elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-linear-to-b from-blue-500/5 dark:from-blue-500/10 to-transparent pointer-events-none" />

      {/* Header Panel */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-black text-slate-950 dark:text-white flex items-center gap-1.5 leading-snug">
                <span>مدیریت کارهای روزانه و زمان مفید</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold">بخش آلارم هوشمند و گزارش‌دهی بهره‌وری</p>
            </div>
          </div>

          {/* Action Preferences & triggers */}
          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            {/* Download PDF report */}
            <button
              onClick={handleDownloadPDF}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs hover:shadow-sm"
              title="بارگیری گزارش PDF"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline">گزارش PDF</span>
            </button>

            {/* Convert numbers view */}
            <button
              onClick={toggleDigits}
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer text-xs font-black"
              title="تغییر نمایش اعداد"
            >
              {usePersianDigits ? 'اعداد لاتین' : 'اعداد فارسی'}
            </button>

            {/* Toggle Theme */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="تغییر تم"
            >
              {theme === 'light' ? <Moon className="w-4.5 h-4.5 text-slate-600" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-8 relative z-10" dir="rtl">
        
        {/* Top Info Banner for first use */}
        <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/30 rounded-2xl p-4 flex gap-3 text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-sans items-start animate-fade-in">
          <Info className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">راهنمای هوشمند سیستم آفلاین:</p>
            <p>این برنامه تمام داده‌ها را به صورت ایمن در حافظه محلی مرورگر شما (localStorage) ذخیره می‌کند. در زمان مشخص شدن ساعت شروع، سیستم در زمان مقرر آلارم صوتی پخش خواهد کرد. الگوهای تکرار نیز با هر بار باز شدن برنامه به طور خودکار بررسی و تولید خواهند شد.</p>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-px font-sans">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-5 py-3 text-sm font-black transition-all border-b-2 shrink-0 cursor-pointer flex items-center gap-2
              ${activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }
            `}
          >
            <ListTodo className="w-4.5 h-4.5" />
            <span>ثبت و مدیریت کارها</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-5 py-3 text-sm font-black transition-all border-b-2 shrink-0 cursor-pointer flex items-center gap-2
              ${activeTab === 'stats'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }
            `}
          >
            <TrendingUp className="w-4.5 h-4.5" />
            <span>گزارش‌ها و تحلیل کارایی</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-3 text-sm font-black transition-all border-b-2 shrink-0 cursor-pointer flex items-center gap-2
              ${activeTab === 'categories'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }
            `}
          >
            <Sliders className="w-4.5 h-4.5" />
            <span>مدیریت دسته‌بندی‌ها</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
            {/* Column 1: Task addition form */}
            <div className="space-y-6 lg:sticky lg:top-24 pr-1">
              <TaskForm
                categories={categories}
                onSubmit={handleSaveTask}
                onOpenCategoryManager={() => setShowCategoryManager(true)}
                taskToEdit={taskToEdit}
                onCancel={taskToEdit ? () => setTaskToEdit(undefined) : undefined}
                usePersianDigits={usePersianDigits}
                todayJalali={todayJalali}
              />

              {/* Quick Category hour listing card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-md space-y-3 font-sans">
                <h4 className="text-xs font-black text-slate-400">دسته‌بندی‌های فعال و ساعات کار مفید</h4>
                <div className="space-y-2">
                  {categories.map((c) => {
                    const matchingTasks = tasks.filter(t => t.categoryId === c.id && t.isCompleted && t.durationMinutes);
                    const minsSum = matchingTasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
                    const hrs = minsSum / 60;
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="text-slate-600 dark:text-slate-300">{c.name}</span>
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {renderDigits(hrs.toFixed(1))} ساعت
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column 2 & 3: Task list */}
            <div className="lg:col-span-2 space-y-8">
              <TaskList
                tasks={tasks}
                categories={categories}
                onToggleComplete={handleToggleComplete}
                onToggleAbandon={handleToggleAbandon}
                onEditTask={(task) => setTaskToEdit(task)}
                onDeleteTask={handleDeleteTask}
                onDeleteTasks={handleDeleteTasks}
                onRenewTask={handleRenewTask}
                onDeleteTaskWithOptions={handleDeleteTaskWithOptions}
                usePersianDigits={usePersianDigits}
                todayJalali={todayJalali}
              />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
                <span>پنل گزارش‌دهی هوشمند و تحلیل کارایی</span>
              </h3>
            </div>
            <StatsDashboard
              tasks={tasks}
              categories={categories}
              stats={stats}
              usePersianDigits={usePersianDigits}
              todayJalali={todayJalali}
              onRenewTask={handleRenewTask}
              onToggleComplete={handleToggleComplete}
              onToggleAbandon={handleToggleAbandon}
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6 animate-fade-in">
            <CategoryManager
              categories={categories}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              isModal={false}
            />
          </div>
        )}
      </main>

      {/* Dialog: Category Manager Modal */}
      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {/* Dialog: Manual Duration Input for untimed tasks */}
      {taskToSetDuration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
              <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
              <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">ثبت مدت زمان واقعی انجام کار</h3>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              کار <span className="font-bold text-slate-900 dark:text-white">«{taskToSetDuration.title}»</span> زمان شروع و پایان مشخصی نداشت. برای ثبت دقیق کارکرد و بهره‌وری در گزارش‌ها، لطفاً زمان صرف‌شده روی این کار را وارد کنید:
            </p>

            <div className="grid grid-cols-2 gap-4 pt-1" dir="ltr">
              <div>
                <span className="block text-xs text-slate-400 mb-1 text-right font-medium">ساعت</span>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i.toString()}>{renderDigits(i)}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-xs text-slate-400 mb-1 text-right font-medium">دقیقه</span>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {Array.from({ length: 60 }).map((_, i) => (
                    <option key={i} value={i.toString()}>{renderDigits(i)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  const h = parseInt(durationHours, 10) || 0;
                  const m = parseInt(durationMinutes, 10) || 0;
                  handleSaveTaskDuration(h, m, false);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer text-center"
              >
                ثبت مدت زمان و تایید نهایی
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSaveTaskDuration(0, 0, true)}
                  className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  انجام بدون ثبت زمان
                </button>
                <button
                  onClick={() => setTaskToSetDuration(null)}
                  className="py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  انصراف
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dialog: Alarm Trigger Modal */}
      <AlarmModal
        activeAlarm={activeAlarm}
        onDismiss={handleDismissAlarm}
        usePersianDigits={usePersianDigits}
      />
    </div>
  );
}
