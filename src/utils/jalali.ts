import * as jalaali from 'jalaali-js';

// Jalali (Solar Hijri) Calendar Utilities
// Natively offline conversion algorithms

export const PERSIAN_WEEKDAYS = [
  'شنبه',      // Index 0
  'یکشنبه',    // Index 1
  'دوشنبه',    // Index 2
  'سه‌شنبه',   // Index 3
  'چهارشنبه',  // Index 4
  'پنجشنبه',   // Index 5
  'جمعه',      // Index 6
];

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// Conversions for Arabic/Persian digits
export function toPersianDigits(num: number | string): string {
  const pDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/[0-9]/g, (w) => pDigits[+w]);
}

export function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (w) => {
      return (w.charCodeAt(0) - 1776).toString();
    })
    .replace(/[٠-٩]/g, (w) => {
      return (w.charCodeAt(0) - 1632).toString();
    });
}

export function isJalaliLeap(jy: number): boolean {
  return jalaali.isLeapJalaaliYear(jy);
}

export function getJalaliDaysInMonth(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

/**
 * Converts a Gregorian Date to Jalali [year, month, day]
 */
export function gregorianToJalali(date: Date): [number, number, number] {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const res = jalaali.toJalaali(gy, gm, gd);
  return [res.jy, res.jm, res.jd];
}

/**
 * Converts a Jalali date to Gregorian Date
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const res = jalaali.toGregorian(jy, jm, jd);
  return new Date(res.gy, res.gm - 1, res.gd);
}

/**
 * Returns the formatted Jalali date (e.g. "1405/04/15") of a Date object
 */
export function getJalaliString(date: Date): string {
  const [jy, jm, jd] = gregorianToJalali(date);
  return `${jy}/${jm.toString().padStart(2, '0')}/${jd.toString().padStart(2, '0')}`;
}

/**
 * Parses Jalali string "YYYY/MM/DD" into [year, month, day]
 */
export function parseJalaliString(jStr: string): [number, number, number] {
  const parts = jStr.split('/').map(num => parseInt(toEnglishDigits(num), 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    return [1405, 1, 1];
  }
  return [parts[0], parts[1], parts[2]];
}

/**
 * Get name of Jalali day of the week
 */
export function getPersianWeekdayName(date: Date): string {
  const jsDay = date.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  // In our PERSIAN_WEEKDAYS list: 0 is Saturday, 1 is Sunday, ...
  const persianIndex = (jsDay + 1) % 7;
  return PERSIAN_WEEKDAYS[persianIndex];
}

/**
 * Compare two Jalali dates ("YYYY/MM/DD")
 * Returns -1 if d1 < d2, 1 if d1 > d2, 0 if equal
 */
export function compareJalaliDates(d1: string, d2: string): number {
  const [y1, m1, d1_] = parseJalaliString(d1);
  const [y2, m2, d2_] = parseJalaliString(d2);

  if (y1 !== y2) return y1 - y2;
  if (m1 !== m2) return m1 - m2;
  return d1_ - d2_;
}

/**
 * Increment Jalali date by N days
 */
export function addDaysToJalali(jStr: string, days: number): string {
  const [jy, jm, jd] = parseJalaliString(jStr);
  const gDate = jalaliToGregorian(jy, jm, jd);
  gDate.setDate(gDate.getDate() + days);
  return getJalaliString(gDate);
}

/**
 * Formats Jalali date to human readable string, e.g. "۱۵ تیر ۱۴۰۵"
 */
export function formatJalaliHuman(jStr: string, usePersianDigits = true): string {
  const [jy, jm, jd] = parseJalaliString(jStr);
  if (jm < 1 || jm > 12) return jStr;
  const monthName = PERSIAN_MONTHS[jm - 1];
  const gDate = jalaliToGregorian(jy, jm, jd);
  const weekday = getPersianWeekdayName(gDate);

  const text = `${weekday}، ${jd} ${monthName} ${jy}`;
  return usePersianDigits ? toPersianDigits(text) : text;
}

/**
 * Calculates start (Saturday) and end (Friday) of the week for a given Jalali date
 */
export function getJalaliWeekRange(jStr: string): { start: string; end: string } {
  const [jy, jm, jd] = parseJalaliString(jStr);
  const date = jalaliToGregorian(jy, jm, jd);
  const jsDay = date.getDay(); // Sunday=0, Monday=1, ..., Saturday=6
  const persianDayIndex = (jsDay + 1) % 7; // Saturday=0, Sunday=1, ..., Friday=6

  // Saturday of this week is `persianDayIndex` days ago
  const startG = new Date(date);
  startG.setDate(date.getDate() - persianDayIndex);

  // Friday of this week is `6 - persianDayIndex` days ahead
  const endG = new Date(date);
  endG.setDate(date.getDate() + (6 - persianDayIndex));

  return {
    start: getJalaliString(startG),
    end: getJalaliString(endG),
  };
}
