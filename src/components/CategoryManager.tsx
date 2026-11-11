import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Edit2, Check,
  Briefcase, User, Dumbbell, BookOpen, Home, ShoppingBag, Heart, Tv, Coffee, Coins
} from 'lucide-react';
import { Category } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (name: string, color: string, icon: string) => void;
  onDeleteCategory: (id: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const CATEGORY_COLORS = [
  { name: 'آبی', hex: '#3b82f6', bgClass: 'bg-blue-500', textClass: 'text-blue-500 border-blue-500' },
  { name: 'زمردی', hex: '#10b981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-500 border-emerald-500' },
  { name: 'نارنجی', hex: '#f97316', bgClass: 'bg-orange-500', textClass: 'text-orange-500 border-orange-500' },
  { name: 'قرمز', hex: '#f43f5e', bgClass: 'bg-rose-500', textClass: 'text-rose-500 border-rose-500' },
  { name: 'بنفش', hex: '#8b5cf6', bgClass: 'bg-purple-500', textClass: 'text-purple-500 border-purple-500' },
  { name: 'نیلی', hex: '#6366f1', bgClass: 'bg-indigo-500', textClass: 'text-indigo-500 border-indigo-500' },
  { name: 'کهربایی', hex: '#f59e0b', bgClass: 'bg-amber-500', textClass: 'text-amber-500 border-amber-500' },
  { name: 'یشمی', hex: '#0d9488', bgClass: 'bg-teal-500', textClass: 'text-teal-500 border-teal-500' },
];

export const CATEGORY_ICONS = [
  { name: 'Briefcase', component: Briefcase, label: 'کاری' },
  { name: 'User', component: User, label: 'شخصی' },
  { name: 'Dumbbell', component: Dumbbell, label: 'ورزشی' },
  { name: 'BookOpen', component: BookOpen, label: 'مطالعه' },
  { name: 'Home', component: Home, label: 'خانه' },
  { name: 'ShoppingBag', component: ShoppingBag, label: 'خرید' },
  { name: 'Heart', component: Heart, label: 'سلامت' },
  { name: 'Tv', component: Tv, label: 'تفریح' },
  { name: 'Coffee', component: Coffee, label: 'استراحت' },
  { name: 'Coins', component: Coins, label: 'مالی' },
];

// Icon lookup helper
export function getCategoryIcon(iconName?: string) {
  const match = CATEGORY_ICONS.find(item => item.name === iconName);
  return match ? match.component : Briefcase;
}

export default function CategoryManager({
  categories,
  onAddCategory,
  onDeleteCategory,
  onClose,
  isModal = true,
}: CategoryManagerProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0].hex);
  const [selectedIcon, setSelectedIcon] = useState('Briefcase');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('لطفاً نام دسته‌بندی را وارد کنید.');
      return;
    }

    if (categories.some(c => c.name === trimmedName)) {
      setError('این دسته‌بندی قبلاً ایجاد شده است.');
      return;
    }

    onAddCategory(trimmedName, selectedColor, selectedIcon);
    setName('');
    // Default reset
    setSelectedColor(CATEGORY_COLORS[0].hex);
    setSelectedIcon('Briefcase');
  };

  const containerClasses = isModal
    ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in"
    : "w-full max-w-4xl mx-auto font-sans";

  const cardClasses = isModal
    ? "w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
    : "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-8";

  return (
    <div className={containerClasses} dir="rtl">
      <div className={cardClasses}>
        {/* Flat layout */}
        {!isModal ? (
          <>
            {/* Right side: Add Form */}
            <div className="flex-1 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>افزودن دسته‌بندی جدید</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">با ایجاد دسته‌بندی‌های جدید می‌توانید کارهای خود را بهتر فیلتر و تحلیل کنید.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    نام دسته‌بندی
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: تفریح، کار پروژه..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    رنگ دسته‌بندی
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSelectedColor(c.hex)}
                        className={`
                          w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 relative cursor-pointer
                          ${c.bgClass} hover:scale-110
                        `}
                        title={c.name}
                      >
                        {selectedColor === c.hex && (
                          <Check className="w-4 h-4 text-white font-bold" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    آیکون دسته‌بندی
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {CATEGORY_ICONS.map((item) => {
                      const IconComp = item.component;
                      const isSelected = selectedIcon === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedIcon(item.name)}
                          className={`
                            p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer
                            ${isSelected
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }
                          `}
                        >
                          <IconComp className="w-5 h-5" />
                          <span className="text-[10px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت دسته‌بندی جدید</span>
                </button>
              </form>
            </div>

            {/* Left side: Categories list */}
            <div className="flex-1 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>دسته‌بندی‌های موجود</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تعداد کل: {categories.length} دسته‌بندی فعال در سیستم</p>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const IconComp = getCategoryIcon(cat.icon);
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {cat.name}
                        </span>
                      </div>

                      {!cat.isSystem ? (
                        <button
                          type="button"
                          onClick={() => onDeleteCategory(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="حذف دسته‌بندی"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900">
                          سیستمی
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Modal-specific Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>مدیریت دسته‌بندی‌ها (نوع کار)</span>
              </h3>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal-specific Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Add Category Form */}
              <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">افزودن نوع کار جدید</h4>
                
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    نام دسته‌بندی
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: تفریح، کار پروژه..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    رنگ دسته‌بندی
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSelectedColor(c.hex)}
                        className={`
                          w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 relative cursor-pointer
                          ${c.bgClass} hover:scale-110
                        `}
                        title={c.name}
                      >
                        {selectedColor === c.hex && (
                          <Check className="w-4 h-4 text-white font-bold" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    آیکون دسته‌بندی
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {CATEGORY_ICONS.map((item) => {
                      const IconComp = item.component;
                      const isSelected = selectedIcon === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedIcon(item.name)}
                          className={`
                            p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer
                            ${isSelected
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }
                          `}
                        >
                          <IconComp className="w-5 h-5" />
                          <span className="text-[10px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت دسته‌بندی</span>
                </button>
              </form>

              {/* Categories List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">دسته‌بندی‌های موجود</h4>
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const IconComp = getCategoryIcon(cat.icon);
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                          >
                            <IconComp className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {cat.name}
                          </span>
                        </div>

                        {!cat.isSystem ? (
                          <button
                            type="button"
                            onClick={() => onDeleteCategory(cat.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            title="حذف دسته‌بندی"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 border border-slate-200 dark:border-slate-800 rounded-md">
                            سیستمی
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
