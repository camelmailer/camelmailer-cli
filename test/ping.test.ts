import { describe, expect, it, vi } from 'vitest';

import { apiError, ok, runCli } from './helpers/run.js';

describe('ping', () => {
  it('prints pong with the server identity', async () => {
    const ping = vi.fn(() => ok({ pong: true, server_id: 7, server: 'acme-prod' }));
    const result = await runCli(['ping'], { ping } as never);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('pong — server "acme-prod" (id 7)');
  });

  it('prints raw JSON with --json', async () => {
    const ping = vi.fn(() => ok({ pong: true, server_id: 7, server: 'acme-prod' }));
    const result = await runCli(['--json', 'ping'], { ping } as never);
    expect(JSON.parse(result.stdout)).toEqual({ pong: true, server_id: 7, server: 'acme-prod' });
  });

  it('surfaces an invalid key as Unauthorized with exit 1', async () => {
    const ping = vi.fn(() => apiError('Unauthorized', 'invalid API key', 401));
    const result = await runCli(['ping'], { ping } as never);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Error [Unauthorized]: invalid API key');
  });

  it('surfaces network failures as NetworkError', async () => {
    const ping = vi.fn(() => apiError('NetworkError', 'Unable to reach https://x — refused', null));
    const result = await runCli(['ping'], { ping } as never);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [NetworkError]');
  });
});
