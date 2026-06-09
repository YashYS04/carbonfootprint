/**
 * @fileoverview Unit tests for the custom in-memory TTL caching utility.
 */

const { SimpleCache } = require('../src/utils/cache');

describe('SimpleCache Utility Class', () => {
  let cache;

  beforeEach(() => {
    cache = new SimpleCache();
  });

  test('should return null for non-existent keys', () => {
    expect(cache.get('missing')).toBeNull();
  });

  test('should store and retrieve values within TTL window', () => {
    cache.set('key1', 'value1', 5); // 5s TTL
    expect(cache.get('key1')).toBe('value1');
    expect(cache.size()).toBe(1);
  });

  test('should expire items after TTL duration', () => {
    jest.useFakeTimers();
    cache.set('key2', 'value2', 2); // 2s TTL
    expect(cache.get('key2')).toBe('value2');

    // Advance time by 3 seconds
    jest.advanceTimersByTime(3000);

    expect(cache.get('key2')).toBeNull();
    expect(cache.size()).toBe(0);
    jest.useRealTimers();
  });

  test('should delete cache entries manually', () => {
    cache.set('key3', 'value3', 10);
    expect(cache.get('key3')).toBe('value3');

    cache.delete('key3');
    expect(cache.get('key3')).toBeNull();
    expect(cache.size()).toBe(0);
  });

  test('should clear all entries', () => {
    cache.set('k1', 'v1', 10);
    cache.set('k2', 'v2', 10);
    expect(cache.size()).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
