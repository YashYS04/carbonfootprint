/**
 * @fileoverview Testing-aware logging helper to manage system stdout/stderr streams cleanly.
 * Suppresses system logs during Jest runs unless specifically forced.
 */

const logger = {
  /**
   * Log info messages.
   * @param {...*} args - Message arguments.
   */
  log: (...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(...args);
    }
  },

  /**
   * Log warning messages.
   * @param {...*} args - Message arguments.
   */
  warn: (...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(...args);
    }
  },

  /**
   * Log error messages.
   * @param {...*} args - Message arguments.
   */
  error: (...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(...args);
    }
  }
};

module.exports = logger;
