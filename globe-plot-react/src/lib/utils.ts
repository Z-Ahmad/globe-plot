import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date range to be more readable
export const formatDateRange = (dateRange: string): string => {
  const parts = dateRange.split(' - ');
  if (parts.length !== 2) return dateRange;
  try {
    const startDate = new Date(parts[0]);
    const endDate = new Date(parts[1]);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
  } catch (e) {
    return dateRange;
  }
};