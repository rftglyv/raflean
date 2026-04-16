import { describe, test, expect } from 'bun:test';
import { formatBytes, bar, sizeColor } from '../src/core/format.js';
import { HOME, home, xdgCache, IS_MAC } from '../src/core/platform.js';
import { allCleaners, getCleaner } from '../src/core/registry.js';
import { exists } from '../src/core/shell.js';

describe('format', () => {
  test('formatBytes handles zero + units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
  });

  test('bar returns a string of expected shape', () => {
    const b = bar(500, 1000, 20);
    expect(typeof b).toBe('string');
    expect(b).toContain('█');
    expect(b).toContain('░');
  });

  test('sizeColor escalates with magnitude', () => {
    expect(sizeColor(1e9 + 1)).not.toBe(sizeColor(1e3));
  });
});

describe('platform', () => {
  test('HOME is non-empty', () => {
    expect(HOME.length).toBeGreaterThan(0);
  });

  test('home() joins under HOME', () => {
    expect(home('foo').startsWith(HOME)).toBe(true);
  });

  test('xdgCache() returns a plausible path', () => {
    const p = xdgCache();
    expect(p.length).toBeGreaterThan(0);
    if (IS_MAC) expect(p).toContain('Caches');
  });
});

describe('registry', () => {
  test('allCleaners returns ≥10 cleaners', () => {
    expect(allCleaners().length).toBeGreaterThanOrEqual(10);
  });

  test('every cleaner has id, label, scan', () => {
    for (const c of allCleaners()) {
      expect(c.id).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(typeof c.scan).toBe('function');
    }
  });

  test('getCleaner finds by id', () => {
    expect(getCleaner('node')?.id).toBe('node');
    expect(getCleaner('does-not-exist')).toBeNull();
  });

  test('every scan() returns an array', async () => {
    for (const c of allCleaners()) {
      // Skip slow filesystem walk for tests
      if (c.id === 'projects') continue;
      const result = await c.scan();
      expect(Array.isArray(result)).toBe(true);
    }
  }, 60000);
});

describe('shell', () => {
  test('exists returns false for falsy + nonexistent', () => {
    expect(exists(null)).toBe(false);
    expect(exists('')).toBe(false);
    expect(exists('/nonexistent/zzz/xyz')).toBe(false);
    expect(exists(HOME)).toBe(true);
  });
});
