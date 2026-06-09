/**
 * @fileoverview In-memory cache implementation with TTL (Time To Live) support.
 * Used to cache repetitive AI assistant requests to save api tokens and optimize performance.
 */

class SimpleCache {
  /**
   * Create an in-memory cache store.
   */
  constructor() {
    /** @private */
    this.store = new Map();
  }

  /**
   * Retrieves an item from the cache if it exists and is not expired.
   * @param {string} key - Cache key.
   * @returns {*} Cached value or null if expired or missing.
   */
  get(key) {
    if (!this.store.has(key)) {
      return null;
    }

    const entry = this.store.get(key);
    const now = Date.now();

    if (now > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Sets an item in the cache with a specified TTL.
   * @param {string} key - Cache key.
   * @param {*} value - The value to store.
   * @param {number} [ttlSeconds=300] - TTL in seconds. Defaults to 5 minutes (300s).
   */
  set(key, value, ttlSeconds = 300) {
    const now = Date.now();
    const expiry = now + (ttlSeconds * 1000);
    this.store.set(key, { value, expiry });
  }

  /**
   * Deletes a cache entry manually.
   * @param {string} key - Cache key.
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clears all cached items.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Gets the number of items stored in the cache.
   * @returns {number} Cache size.
   */
  size() {
    return this.store.size;
  }
}

// Export a singleton instance
const aiCache = new SimpleCache();

module.exports = {
  SimpleCache,
  aiCache
};
