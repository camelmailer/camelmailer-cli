import { describe, expect, it, vi } from 'vitest';

import { email, pagination } from './helpers/fixtures.js';
import { apiError, ok, runCli } from './helpers/run.js';

describe('bounces list', () => {
  it('lists bounces as a table with pagination', async () => {
    const list = vi.fn(() =>
      ok({
        bounces: [email({ status: 'HardFail', bounce: true })],
        pagination: pagination({ total: 1 }),
      }),
    );
    const result = await runCli(['bounces', 'list'], { bounces: { list } as never });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('HardFail');
    expect(result.stdout).toContain('Page 1 of 1 · 1 total');
  });

  it('passes filters and pagination through', async () => {
    const list = vi.fn(() => ok({ bounces: [], pagination: pagination({ total: 0 }) }));
    await runCli(
      ['bounces', 'list', '--status', 'HardFail', '--tag', 'x', '--page', '3', '--per-page', '10'],
      { bounces: { list } as never },
    );
    expect(list).toHaveBeenCalledWith({
      status: 'HardFail',
      tag: 'x',
      query: undefined,
      page: 3,
      per_page: 10,
    });
  });

  it('prints raw JSON with --json', async () => {
    const payload = { bounces: [email()], pagination: pagination() };
    const list = vi.fn(() => ok(payload));
    const result = await runCli(['--json', 'bounces', 'list'], { bounces: { list } as never });
    expect(JSON.parse(result.stdout)).toEqual(payload);
  });

  it('surfaces API errors', async () => {
    const list = vi.fn(() => apiError('Unauthorized', 'invalid API key', 401));
    const result = await runCli(['bounces', 'list'], { bounces: { list } as never });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Error [Unauthorized]: invalid API key');
  });
});
