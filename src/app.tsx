import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readNight } from './digest/read.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  // Digest as JSON: same rows, same order as the page (readNight sorts by job).
  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    const data = readNight(config.runsDir, night);
    if (data === null) return c.json({ error: 'not found' }, 404);
    return c.json({ night, rows: data.rows, badLines: data.badLines });
  });

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  return app;
}
