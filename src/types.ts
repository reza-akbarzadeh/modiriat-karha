export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex string
  icon?: string; // Lucide icon name
  isSystem?: boolean;
}

export type Priority = 'high' | 'medium' | 'low';

export type RepeatPattern =
  | 'none'          // No repeat
  | 'daily'         // Every day
  | 'even_odd'      // Persian Even/Odd days: زوج (Sat, Mon, Wed) or فرد (Sun, Tue, Thu)
  | 'weekly'        // On specific days of the week
  | 'until_tomorrow'      // Automatically copy to tomorrow
  | 'until_after_tomorrow'; // Automatically copy to day after tomorrow

export interface Task {
  id: string;
  title: string;
  description?: string;
  categoryId: string; // Link to Category
  date: string; // Jalali date formatted as "YYYY/MM/DD" (e.g. "1405/04/15")
  hasTime: boolean; // Whether starting/ending times are specified
  startTime?: string; // "HH:MM" 24h format
  endTime?: string; // "HH:MM" 24h format
  durationMinutes?: number; // Calculated useful work duration in minutes
  priority: Priority;
  repeatPattern: RepeatPattern;
  repeatDays?: number[]; // For weekly pattern: array of JS week days (0=Sunday, 1=Monday, ..., 6=Saturday)
  repeatEndDate?: string; // Jalali date string "YYYY/MM/DD"
  isCompleted: boolean;
  isAbandoned?: boolean; // If true, marked as abandoned/canceled and no longer overdue
  parentTaskId?: string; // For recurring tasks, points to the master/template task ID
  createdAt: string; // ISO string
}

export interface Alarm {
  taskId: string;
  taskTitle: string;
  time: string; // "HH:MM"
  date: string; // "YYYY/MM/DD"
  triggered: boolean;
}
