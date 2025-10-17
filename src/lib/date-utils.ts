"use strict";

export const MONTH_NAMES = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December'
} as const;

export type MonthNumber = keyof typeof MONTH_NAMES;

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(monthNumber: number): string {
  return MONTH_NAMES[monthNumber as MonthNumber] || '';
}

/**
 * Get month number from date string (YYYY-MM-DD)
 */
export function getMonthFromDate(dateString: string): number {
  return parseInt(dateString.split('-')[1], 10);
}

/**
 * Get year from date string (YYYY-MM-DD)
 */
export function getYearFromDate(dateString: string): number {
  return parseInt(dateString.split('-')[0], 10);
}

/**
 * Group forms by month and year
 */
export function groupFormsByMonth<T extends { createdAt: Date }>(forms: T[]) {
  const grouped = forms.reduce((acc, form) => {
    const date = form.createdAt;
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    
    const key = `${year}-${month}`;
    if (!acc[key]) {
      acc[key] = {
        year,
        month,
        monthName: getMonthName(month),
        forms: []
      };
    }
    
    acc[key].forms.push(form);
    return acc;
  }, {} as Record<string, { year: number; month: number; monthName: string; forms: T[] }>);

  // Convert to array and sort by date (newest first)
  return Object.values(grouped).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

/**
 * Check if a date is in the current month
 */
export function isCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && 
         date.getMonth() === now.getMonth();
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date): string {
  return date.toISOString().split('T')[0];
}