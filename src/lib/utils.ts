import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency based on currency code
export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  const locale = currency === 'LKR' ? 'en-LK' : 'en-AU';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format currency with symbol only (no decimals for display)
export function formatCurrencySimple(amount: number, currency: string = 'AUD'): string {
  const symbol = currency === 'LKR' ? 'LKR' : '$';
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
