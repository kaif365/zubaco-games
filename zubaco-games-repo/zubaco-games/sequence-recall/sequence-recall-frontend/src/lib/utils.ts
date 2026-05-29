import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Cn.
 *
 * @param {ClassValue[]} inputs - The inputs.
 *
 * @returns {string} The result of cn.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
