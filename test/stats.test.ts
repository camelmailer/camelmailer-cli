import { describe, expect, it, vi } from 'vitest';

import type { Stats } from 'camelmailer';

import { apiError, ok, runCli } from './helpers/run.js';

const stats: Stats = {
  total: 120,
  incoming: 20,
  outgoing: 100,
  sent: 95,
  pending: 2,
  held: 1,
  bounced: 2,
  soft_fail: 1,
  hard_fail: 1,
  opens: 40,
  clicks: 12,
  unique_opens: 30,
  unique_clicks: 10,
};

describe('stats', () => {
  it('shows the message counters', async () => {
    const get = vi.fn(() => ok({ stats }));
    const result = await runCli(['stats'], { stats: { get } as never });

    expect(get).toHaveBeenCalledWith({ from: undefined, to: undefined });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Total');
    expect(result.stdout).toContain('120');
    expect(result.stdout).toContain('40 (30 unique)');
  });

  it('passes the --from/--to window through', async () => {
    const get = vi.fn(() => ok({ stats }));
    await runCli(['stats', '--from', '2026-07-01', '--to', '2026-07-11'], {
      stats: { get } as never,
    });
    expect(get).toHaveBeenCalledWith({ from: '2026-07-01', to: '2026-07-11' });
  });

  it('prints raw JSON with --json', async () => {
    const get = vi.fn(() => ok({ stats }));
    const result = await runCli(['--json', 'stats'], { stats: { get } as never });
    expect(JSON.parse(result.stdout)).toEqual({ stats });
  });

  it('surfaces API errors', async () => {
    const get = vi.fn(() => apiError('Forbidden', 'nope', 403));
    const result = await runCli(['stats'], { stats: { get } as never });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Error [Forbidden]: nope');
  });
});
