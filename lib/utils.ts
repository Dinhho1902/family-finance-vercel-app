import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const _fmtVND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const _fmtNum = new Intl.NumberFormat('vi-VN');
const _fmtCompact = new Intl.NumberFormat('vi-VN', { notation: 'compact' });
const _fmtQty = new Intl.NumberFormat('en-US');

export const fmtVND = (n: number) => _fmtVND.format(n);
export const fmtNum = (n: number) => _fmtNum.format(n);
export const fmtCompact = (n: number) => _fmtCompact.format(n);
export const fmtQty = (n: number) => _fmtQty.format(n);
// Hiển thị theo đơn vị nghìn VND (VD: 651.990 nghìn)
export const fmtK = (n: number) => _fmtNum.format(Math.round(n / 1000));

export function calcAccruedInterest(principal: number, rate: number, startDate: string): number {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 0;
  const diffDays = Math.max(0, (Date.now() - start.getTime()) / (1000 * 3600 * 24));
  return Math.round(principal * (rate / 100) * (diffDays / 365.25));
}

export function calcInterestBetween(principal: number, rate: number, start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diffDays = Math.max(0, (e.getTime() - s.getTime()) / (1000 * 3600 * 24));
  return Math.round(principal * (rate / 100) * (diffDays / 365.25));
}
