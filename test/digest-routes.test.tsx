import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Contract under test (routes are added on other branches, not here):
//   GET /digest/:night      HTML table of rows; 404 for unknown night; "nothing ran" for empty file
//   GET /api/digest/:night  JSON { night, rows, badLines }; 404 JSON { error: 'not found' }

type DigestJson = { night: string; rows: { job: string }[]; badLines: number };

const NORMAL = '2026-10-28';
const EMPTY = '2026-10-29';
const BAD = '2026-10-30';
const MISSING = '2000-01-01';

// Lines are deliberately out of job order in the file; the page and JSON must both sort by job.
const line = (at: string, job: string, status: string, owner: string | null = null, error: string | null = null) =>
  JSON.stringify({ at, job, status, owner, error });

const normalLines = [
  line('2026-10-28T02:00:00+01:00', 'rig/rotate-logs', 'ok', 'ops'),
  line('2026-10-28T02:05:00+01:00', 'digest/render', 'retry', null, 'timeout'),
  line('2026-10-28T02:06:00+01:00', 'digest/render', 'ok', 'lane'),
  line('2026-10-28T02:10:00+01:00', 'notes/backup', 'fail', 'ops', 'quota exceeded'),
  line('2026-10-28T02:15:00+01:00', 'fixtures/refresh', 'ok', 'lane'),
  line('2026-10-28T02:20:00+01:00', 'lane/sync', 'ok', 'lane'),
];

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  writeFileSync(join(runsDir, `${NORMAL}.jsonl`), normalLines.join('\n') + '\n');
  writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '');
  writeFileSync(
    join(runsDir, `${BAD}.jsonl`),
    [
      line('2026-10-30T02:00:00+01:00', 'lane/sync', 'ok', 'lane'),
      'this is not json',
      line('2026-10-30T02:05:00+01:00', 'notes/backup', 'ok', 'ops'),
    ].join('\n') + '\n',
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night (page)', () => {
  it('200 for a normal night and lists its jobs', async () => {
    const res = await app.request(`/digest/${NORMAL}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']) {
      expect(html).toContain(job);
    }
  });

  it('404 for a night with no file', async () => {
    const res = await app.request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
  });

  it('200 for an empty night and says "nothing ran"', async () => {
    const res = await app.request(`/digest/${EMPTY}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('200 for a night with a bad line and still shows the good jobs', async () => {
    const res = await app.request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toContain('notes/backup');
  });
});

describe('GET /api/digest/:night (JSON)', () => {
  it('200 for a normal night with rows and no bad lines', async () => {
    const res = await app.request(`/api/digest/${NORMAL}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.night).toBe(NORMAL);
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual([
      'digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs',
    ]);
  });

  it('404 JSON for a night with no file', async () => {
    const res = await app.request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });

  it('200 for an empty night with rows []', async () => {
    const res = await app.request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: EMPTY, rows: [], badLines: 0 });
  });

  it('200 for a night with a bad line and counts it', async () => {
    const res = await app.request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestJson;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['lane/sync', 'notes/backup']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const json = (await (await app.request(`/api/digest/${NORMAL}`)).json()) as DigestJson;
    const html = await (await app.request(`/digest/${NORMAL}`)).text();

    const positions = json.rows.map((r) => {
      const at = html.indexOf(r.job);
      expect(at, `job ${r.job} missing from page`).toBeGreaterThanOrEqual(0);
      return at;
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
