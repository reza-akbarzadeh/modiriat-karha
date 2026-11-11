import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Clock, Calendar, TrendingUp, Sparkles, Filter, CheckCircle2, RefreshCw, Ban } from 'lucide-react';
import { Task, Category } from '../types';
import { getCategoryIcon } from './CategoryManager';
import { toPersianDigits, compareJalaliDates } from '../utils/jalali';

interface StatsDashboardProps {
  tasks: Task[];
  categories: Category[];
  stats: {
    totalHours: number;
    weekHours: number;
    monthHours: number;
    yearHours: number;
  };
  usePersianDigits: boolean;
  todayJalali: string;
  onRenewTask: (id: string, startDate: string, repeatCount?: number, usePattern?: boolean) => void;
  onToggleComplete: (id: string) => void;
  onToggleAbandon?: (id: string) => void;
}

export default function StatsDashboard({
  tasks,
  categories,
  stats,
  usePersianDigits,
  todayJalali,
  onRenewTask,
  onToggleComplete,
  onToggleAbandon,
}: StatsDashboardProps) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Calculate stats per category
  const completedTasks = tasks.filter(t => t.isCompleted);
  
  const getCategoryStats = () => {
    return categories.map((cat) => {
      const catTasks = completedTasks.filter(t => t.categoryId === cat.id && t.durationMinutes);
      const totalMinutes = catTasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
      const totalHours = totalMinutes / 60;

      return {
        ...cat,
        totalHours,
        taskCount: catTasks.length,
        completedTasksList: catTasks,
      };
    });
  };

  const categoryStats = getCategoryStats();
  const maxHours = Math.max(...categoryStats.map(c => c.totalHours), 1);
  const totalStatsHours = categoryStats.reduce((sum, c) => sum + c.totalHours, 0);
  const overdueTasks = tasks.filter(t => !t.isCompleted && !t.isAbandoned && compareJalaliDates(t.date, todayJalali) < 0);

  const renderDigits = (text: string | number) => {
    return usePersianDigits ? toPersianDigits(text) : text.toString();
  };

  const formatHours = (hrs: number) => {
    return renderDigits(hrs.toFixed(1));
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100" dir="rtl">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-blue-500 h-full" />
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">کل ساعت کار مفید</span>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl lg:text-2xl font-bold text-slate-950 dark:text-white">
            {formatHours(stats.totalHours)} <span className="text-xs font-medium">ساعت</span>
          </p>
          <p className="text-[10px] text-slate-400">ثبت شده از ابتدای فعالیت</p>
        </div>

        {/* Weekly hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-emerald-500 h-full" />
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">هفته جاری (شنبه تا جمعه)</span>
            <Clock className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xl lg:text-2xl font-bold text-slate-950 dark:text-white">
            {formatHours(stats.weekHours)} <span className="text-xs font-medium">ساعت</span>
          </p>
          <p className="text-[10px] text-slate-400">مطابق تقویم هجری شمسی</p>
        </div>

        {/* Monthly hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-amber-500 h-full" />
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">ماه جاری</span>
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl lg:text-2xl font-bold text-slate-950 dark:text-white">
            {formatHours(stats.monthHours)} <span className="text-xs font-medium">ساعت</span>
          </p>
          <p className="text-[10px] text-slate-400">مجموع زمان در ماه جاری</p>
        </div>

        {/* Yearly hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 bg-purple-500 h-full" />
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">سال جاری</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-xl lg:text-2xl font-bold text-slate-950 dark:text-white">
            {formatHours(stats.yearHours)} <span className="text-xs font-medium">ساعت</span>
          </p>
          <p className="text-[10px] text-slate-400">بهره‌وری کلی در سال جاری</p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category Breakdown (Progress Bars) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-blue-500" />
              <span>تحلیل زمانی و تفکیک بر اساس نوع کار</span>
            </h3>
            <span className="text-[11px] text-slate-400">بر اساس کارهای انجام شده</span>
          </div>

          <div className="space-y-4">
            {categoryStats.map((cat) => {
              const pctOfMax = (cat.totalHours / maxHours) * 100;
              const pctOfTotal = totalStatsHours > 0 ? (cat.totalHours / totalStatsHours) * 100 : 0;
              const IconComp = getCategoryIcon(cat.icon);

              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCatId(selectedCatId === cat.id ? null : cat.id)}
                  className={`
                    p-3.5 border rounded-xl cursor-pointer transition-all duration-150 group flex flex-col gap-2.5
                    ${selectedCatId === cat.id
                      ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-950/10 shadow-sm'
                      : 'border-slate-150 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatHours(cat.totalHours)} <span className="text-xs font-medium">ساعت</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ({renderDigits(pctOfTotal.toFixed(0))}% از کل زمان)
                      </span>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pctOfMax}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Details View (Displays items inside selected category) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">جزئیات اختصاصی کارها</h3>
            <p className="text-[11px] text-slate-400 mt-1">با کلیک روی هر دسته‌بندی جزئیات را ببینید</p>
          </div>

          {selectedCatId ? (
            (() => {
              const activeCat = categoryStats.find(c => c.id === selectedCatId);
              if (!activeCat) return null;
              const IconComp = getCategoryIcon(activeCat.icon);

              return (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${activeCat.color}15`, color: activeCat.color }}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold" style={{ color: activeCat.color }}>{activeCat.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/60">
                      <span className="block text-slate-400 mb-0.5">کل کارهای انجام شده</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{renderDigits(activeCat.taskCount)} مورد</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/60">
                      <span className="block text-slate-400 mb-0.5">مجموع ساعات مفید</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatHours(activeCat.totalHours)} ساعت</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500">لیست کارهای این بخش:</h4>
                    {activeCat.completedTasksList.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-4">کارهای زمان‌داری در این دسته یافت نشد.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {activeCat.completedTasksList.map((t) => (
                          <div key={t.id} className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg text-xs flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-32">{t.title}</span>
                            <span className="text-[10px] text-slate-400">{renderDigits(t.date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs">یک دسته‌بندی در پنل کنار انتخاب کنید تا ریز اطلاعات آن را در این قسمت مشاهده نمایید.</p>
            </div>
          )}
        </div>
      </div>

      {/* Overdue and Uncompleted Tasks Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              گزارش کارهای باقی‌مانده و انجام‌نشده از گذشته
            </h3>
          </div>
          <span className="text-xs bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full font-bold">
            {renderDigits(overdueTasks.length)} کار باقی‌مانده از گذشته
          </span>
        </div>

        {overdueTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">خوشبختانه هیچ کار باقی‌مانده‌ای از گذشته ندارید!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">تمام کارهای روزهای گذشته با موفقیت ساماندهی شده‌اند.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl border border-red-100 dark:border-red-950/40 text-center">
                <span className="block text-[11px] text-red-500 font-bold mb-0.5">اولویت بالا</span>
                <span className="text-sm font-black text-red-700 dark:text-red-400">
                  {renderDigits(overdueTasks.filter(t => t.priority === 'high').length)} مورد
                </span>
              </div>
              <div className="bg-orange-50/50 dark:bg-orange-950/10 p-3 rounded-xl border border-orange-100 dark:border-orange-950/40 text-center">
                <span className="block text-[11px] text-orange-500 font-bold mb-0.5">اولویت متوسط</span>
                <span className="text-sm font-black text-orange-700 dark:text-orange-400">
                  {renderDigits(overdueTasks.filter(t => t.priority === 'medium').length)} مورد
                </span>
              </div>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-950/40 text-center">
                <span className="block text-[11px] text-emerald-500 font-bold mb-0.5">اولویت پایین</span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                  {renderDigits(overdueTasks.filter(t => t.priority === 'low').length)} مورد
                </span>
              </div>
            </div>

            {/* List with scroll */}
            <div className="max-h-72 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {overdueTasks.map((t) => {
                const cat = categories.find(c => c.id === t.categoryId);
                const isHigh = t.priority === 'high';
                const isMedium = t.priority === 'medium';
                return (
                  <div key={t.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/30 dark:bg-slate-950/10 hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          isHigh ? 'bg-red-50 dark:bg-red-950/35 text-red-600 border border-red-100 dark:border-red-900/40' :
                          isMedium ? 'bg-orange-50 dark:bg-orange-950/35 text-orange-600 border border-orange-100 dark:border-orange-900/40' :
                          'bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 border border-emerald-100 dark:border-emerald-900/40'
                        }`}>
                          {t.priority === 'high' ? 'مهم' : t.priority === 'medium' ? 'متوسط' : 'عادی'}
                        </span>
                        {cat && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                            {cat.name}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold">
                          تاریخ: {renderDigits(t.date)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {t.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => {
                          onRenewTask(t.id, todayJalali);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>تمدید مجدد</span>
                      </button>
                      {onToggleAbandon && (
                        <button
                          onClick={() => onToggleAbandon(t.id)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          <span>رها کردن کار</span>
                        </button>
                      )}
                      <button
                        onClick={() => onToggleComplete(t.id)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>علامت انجام شد</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
