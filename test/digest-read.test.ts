import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 5 jobs and counts 1 bad line for 2026-10-28', () => {
    const n = readNight('runs', '2026-10-28');
    expect(n?.badLines).toBe(1);
    expect(n?.rows.map((r) => r.job)).toEqual([
      'digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs',
    ]);
    const fx = n?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fx).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null });
    expect(n?.rows.find((r) => r.job === 'digest/render')?.owner).toBeNull();
    expect(n?.rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });
  it('returns null for a night with no file', () => {
    expect(readNight('runs', '2000-01-01')).toBeNull();
  });
});
