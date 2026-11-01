import type { Night } from '../digest/types.js';

const dash = '—';

// Retries of 3 or more and a last status of fail are flagged twice: the `warn` class and a
// text mark, so the flag survives without colour (ADR 0001: the page is read, not only looked at).
function flags(row: Night['rows'][number]): string[] {
  const out: string[] = [];
  if (row.retries >= 3) out.push(`retries ${row.retries}`);
  if (row.lastStatus === 'fail') out.push('fail');
  return out;
}

export function DigestTable({ night, data }: { night: string; data: Night }) {
  return (
    <>
      <h1>digest · {night}</h1>
      {data.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last</th>
              <th>error</th>
              <th>first</th>
              <th>last at</th>
              <th>flag</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const f = flags(row);
              return (
                <tr class={f.length > 0 ? 'warn' : undefined}>
                  <td>{row.job}</td>
                  <td>{row.owner ?? dash}</td>
                  <td>{row.runs}</td>
                  <td>{row.retries}</td>
                  <td>{row.lastStatus}</td>
                  <td>{row.lastError ?? dash}</td>
                  <td>{row.first}</td>
                  <td>{row.last}</td>
                  <td>{f.length > 0 ? `⚠ ${f.join(', ')}` : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {data.badLines > 0 ? (
        <p class="warn">
          {data.badLines} bad {data.badLines === 1 ? 'line' : 'lines'} skipped
        </p>
      ) : null}
    </>
  );
}

export function DigestMissing({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="warn">no run log for {night}</p>
      <p class="mute">
        <a href="/">back to status</a>
      </p>
    </>
  );
}
