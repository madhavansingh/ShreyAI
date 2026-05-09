/**
 * utils/timeFormatter.js
 * Converts between seconds and human-readable time labels.
 */

/**
 * Convert seconds to "MM:SS" or "H:MM:SS"
 * @param {number} totalSeconds
 * @returns {string}
 */
function secondsToLabel(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return '0:00';
  const s = Math.floor(totalSeconds);
  const hours   = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/**
 * Convert "MM:SS" or "H:MM:SS" label back to seconds
 * @param {string} label
 * @returns {number}
 */
function labelToSeconds(label) {
  if (!label) return 0;
  const parts = label.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/**
 * Convert milliseconds to seconds (2 decimal places)
 * @param {number} ms
 * @returns {number}
 */
function msToSeconds(ms) {
  return Math.round((ms / 1000) * 100) / 100;
}

module.exports = { secondsToLabel, labelToSeconds, msToSeconds };
