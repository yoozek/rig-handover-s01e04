import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countNight } from '../src/digest/count.js';

describe('countNight', () => {
  it('counts log lines per status, bad lines count for nothing', () => {
    expect(countNight('runs', '2026-10-27')).toEqual({ ok: 7, retry: 0, fail: 0 });
    expect(countNight('runs', '2026-10-28')).toEqual({ ok: 10, retry: 4, fail: 1 });
  });
  it('returns null for a night with no file', () => {
    expect(countNight('runs', '2000-01-01')).toBeNull();
  });
  it('returns null when the file exists but cannot be read', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-count-'));
    mkdirSync(join(dir, '2026-10-28.jsonl')); // a directory: readFileSync throws EISDIR
    expect(countNight(dir, '2026-10-28')).toBeNull();
  });
});
