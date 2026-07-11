import { describe, expect, it, vi } from 'vitest';

import { apiError, ok, runCli } from './helpers/run.js';

describe('streams list', () => {
  it('lists streams as a table', async () => {
    const list = vi.fn(() =>
      ok({
        streams: [
          {
            id: 1,
            uuid: 'uuid-1',
            name: 'Default',
            permalink: 'default',
            stream_type: 'transactional' as const,
            archived: false,
          },
        ],
      }),
    );
    const result = await runCli(['streams', 'list'], { streams: { list } as never });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('default');
    expect(result.stdout).toContain('transactional');
  });

  it('prints raw JSON with --json', async () => {
    const payload = { streams: [] };
    const list = vi.fn(() => ok(payload));
    const result = await runCli(['--json', 'streams', 'list'], { streams: { list } as never });
    expect(JSON.parse(result.stdout)).toEqual(payload);
  });

  it('surfaces Unauthorized with a non-zero exit', async () => {
    const list = vi.fn(() => apiError('Unauthorized', 'invalid API key', 401));
    const result = await runCli(['streams', 'list'], { streams: { list } as never });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Error [Unauthorized]: invalid API key');
  });
});
