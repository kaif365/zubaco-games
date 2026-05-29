/**
 * Formats score.
 *
 * @param {number} score - The score.
 *
 * @returns {string} The result of formatScore.
 */
export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/**
 * Formats duration.
 *
 * @param {number} seconds - The seconds.
 *
 * @returns {string} The result of formatDuration.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins)}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats date.
 *
 * @param {string | Date} date - The date.
 * @param {string} locale - The locale.
 *
 * @returns {string} The result of formatDate.
 */
export function formatDate(date: Date | string, locale = 'en-US'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate.
 *
 * @param {string} str - The str.
 * @param {number} maxLength - The max length.
 *
 * @returns {string} The result of truncate.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize.
 *
 * @param {string} str - The str.
 *
 * @returns {string} The result of capitalize.
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
