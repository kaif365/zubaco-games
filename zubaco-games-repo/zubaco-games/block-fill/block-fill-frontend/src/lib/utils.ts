import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with `clsx` and resolves Tailwind conflicts via `tailwind-merge`.
 *
 * @param {...ClassValue} inputs - Class name values passed to `clsx`.
 *
 * @returns {string} The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
