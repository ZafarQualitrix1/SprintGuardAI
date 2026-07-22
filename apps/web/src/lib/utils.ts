import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard ShadCN UI helper: merges conditional Tailwind classes without specificity conflicts.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
