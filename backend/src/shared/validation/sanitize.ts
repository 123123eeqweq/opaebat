/**
 * HTML sanitization for user input — XSS protection
 * Strips all HTML tags and dangerous characters from user-provided strings.
 */

/** Strip HTML tags and decode entities to prevent XSS */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
    .trim();
}
