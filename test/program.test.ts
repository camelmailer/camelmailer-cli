import { describe, expect, it } from 'vitest';

import { runCli } from './helpers/run.js';

describe('program', () => {
  it('shows help without an exit failure', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('emails');
    expect(result.stdout).toContain('templates');
    expect(result.stdout).toContain('ping');
  });

  it('fails with a usage error for unknown commands', async () => {
    const result = await runCli(['does-not-exist']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('unknown command');
  });

  it('fails when a required option is missing', async () => {
    const result = await runCli(['emails', 'send', '--to', 'a@b.c']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('--from');
  });
});
