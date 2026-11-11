import { Task } from '../types';
import {
  parseJalaliString,
  jalaliToGregorian,
  getJalaliString,
  compareJalaliDates,
  addDaysToJalali,
} from './jalali';

/**
 * Checks if a JS weekday index (0=Sunday, 1=Monday, ..., 6=Saturday) is an Iranian "Even" day.
 * Even days (روزهای زوج) in Iran are: Saturday (شنبه=6), Monday (دوشنبه=1), Wednesday (چهارشنبه=3)
 */
export function isPersianEvenDay(jsDay: number): boolean {
  return jsDay === 6 || jsDay === 1 || jsDay === 3;
}

/**
 * Checks if a JS weekday index is an Iranian "Odd" day.
 * Odd days (روزهای فرد) in Iran are: Sunday (یکشنبه=0), Tuesday (سه‌شنبه=2), Thursday (پنجشنبه=4)
 */
export function isPersianOddDay(jsDay: number): boolean {
  return jsDay === 0 || jsDay === 2 || jsDay === 4;
}

/**
 * Processes all tasks, identifies master recurring tasks, and generates
 * instance tasks for any missing days up to the current date (today).
 *
 * @param tasks All current tasks in state
 * @param todayJalali The current Persian date formatted as "YYYY/MM/DD"
 * @returns A new array of tasks containing both old and newly generated instances
 */
export function generateRecurringTasks(tasks: Task[], todayJalali: string): { updatedTasks: Task[]; generatedCount: number } {
  let hasChanges = false;
  const updatedTasks = [...tasks];
  let generatedCount = 0;

  // We only look at tasks that are "master" templates.
  // A master task is any task with a repeat pattern, NOT generated from another parent.
  const masterTasks = tasks.filter(t => t.repeatPattern !== 'none' && !t.parentTaskId);

  // Generate occurrences up to 30 days in the future (1 month) so they are visible in "Tomorrow", "Custom Date", and "All Tasks"
  const futureHorizon = addDaysToJalali(todayJalali, 30);

  for (const master of masterTasks) {
    const startDateStr = master.date;

    // Determine the end boundary for generating occurrences
    let endDateStr = futureHorizon;
    if (master.repeatEndDate) {
      // If there is an end date, we generate only up to the smaller of (futureHorizon, repeatEndDate)
      if (compareJalaliDates(master.repeatEndDate, endDateStr) < 0) {
        endDateStr = master.repeatEndDate;
      }
    }

    // Relative patterns have specific short-term boundaries
    if (master.repeatPattern === 'until_tomorrow') {
      const tomorrowStr = addDaysToJalali(startDateStr, 1);
      if (compareJalaliDates(tomorrowStr, endDateStr) < 0) {
        endDateStr = tomorrowStr;
      }
    } else if (master.repeatPattern === 'until_after_tomorrow') {
      const dayAfterTomorrowStr = addDaysToJalali(startDateStr, 2);
      if (compareJalaliDates(dayAfterTomorrowStr, endDateStr) < 0) {
        endDateStr = dayAfterTomorrowStr;
      }
    }

    // If master start date is in the future relative to our target end date, skip it
    if (compareJalaliDates(startDateStr, endDateStr) > 0) {
      continue;
    }

    // Loop through each day from the master's start date + 1 up to endDateStr
    let currentJalali = addDaysToJalali(startDateStr, 1);

    while (compareJalaliDates(currentJalali, endDateStr) <= 0) {
      // Check if an instance already exists for this date and this parent
      const alreadyExists = updatedTasks.some(
        t => t.parentTaskId === master.id && t.date === currentJalali
      );

      if (!alreadyExists) {
        // Parse date D to Gregorian to get the day of the week
        const [jy, jm, jd] = parseJalaliString(currentJalali);
        const gDate = jalaliToGregorian(jy, jm, jd);
        const jsDay = gDate.getDay();

        let matchesPattern = false;

        switch (master.repeatPattern) {
          case 'daily':
            matchesPattern = true;
            break;
          case 'even_odd':
            // نوع روزهای تکرار از تاریخ شروع الگو تعیین می‌شود.
            const masterGDate = jalaliToGregorian(...parseJalaliString(master.date));
            const masterJsDay = masterGDate.getDay();

            if (isPersianEvenDay(masterJsDay)) {
              matchesPattern = isPersianEvenDay(jsDay);
            } else if (isPersianOddDay(masterJsDay)) {
              matchesPattern = isPersianOddDay(jsDay);
            } else {
              // Fallback if started on Friday: generate on Even days
              matchesPattern = isPersianEvenDay(jsDay);
            }
            break;
          case 'weekly':
            // Check if jsDay (0-6) is in repeatDays
            if (master.repeatDays && master.repeatDays.includes(jsDay)) {
              matchesPattern = true;
            }
            break;
          case 'until_tomorrow':
          case 'until_after_tomorrow':
            // Within range bounds, they always match
            matchesPattern = true;
            break;
          default:
            break;
        }

        if (matchesPattern) {
          const newId = `${master.id}_gen_${currentJalali.replace(/\//g, '')}`;
          const newInstance: Task = {
            id: newId,
            title: master.title,
            description: master.description,
            categoryId: master.categoryId,
            date: currentJalali,
            hasTime: master.hasTime,
            startTime: master.startTime,
            endTime: master.endTime,
            durationMinutes: master.durationMinutes,
            priority: master.priority,
            repeatPattern: master.repeatPattern,
            repeatDays: master.repeatDays,
            repeatEndDate: master.repeatEndDate,
            isCompleted: false,
            parentTaskId: master.id,
            createdAt: new Date().toISOString(),
          };

          updatedTasks.push(newInstance);
          generatedCount++;
          hasChanges = true;
        }
      }

      // Increment date
      currentJalali = addDaysToJalali(currentJalali, 1);
    }
  }

  return { updatedTasks, generatedCount };
}
