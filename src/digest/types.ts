export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null; // null in the log: keep the row, show "—"
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null;
  first: string; // `at` of the first line, offset kept as in the log
  last: string; // `at` of the last line
};

export type Night = {
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse, counted and never thrown
};

// Reads `<runsDir>/<night>.jsonl`. Returns null when the night has no file.
export type ReadNight = (runsDir: string, night: string) => Night | null;
