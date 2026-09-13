import { describe, expect, it, vi } from 'vitest';

import type { DmarcSummary } from '@camelmailer/sdk';

import { apiError, ok, runCli } from './helpers/run.js';

const summary: DmarcSummary = {
  total: 200,
  pass: 180,
  fail: 20,
  pass_rate: 0.9,
  by_source: [
    {
      source_ip: '192.0.2.10',
      count: 150,
      spf_aligned_pct: 98.5,
      dkim_aligned_pct: 97.2,
      disposition_counts: { none: 150 },
    },
  ],
  by_disposition: { none: 180, quarantine: 20 },
};

describe('dmarc summary', () => {
  it('shows the compliance summary and top sources', async () => {
    const summaryFn = vi.fn(() => ok({ summary }));
    const result = await runCli(['dmarc', 'summary'], { dmarc: { summary: summaryFn } as never });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Pass rate');
    expect(result.stdout).toContain('90.0%');
    expect(result.stdout).toContain('192.0.2.10');
  });

  it('passes --domain/--from/--to through', async () => {
    const summaryFn = vi.fn(() => ok({ summary }));
    await runCli(
      ['dmarc', 'summary', '--domain', 'acme.com', '--from', '2026-07-01', '--to', '2026-07-11'],
      { dmarc: { summary: summaryFn } as never },
    );
    expect(summaryFn).toHaveBeenCalledWith({
      domain: 'acme.com',
      from: '2026-07-01',
      to: '2026-07-11',
    });
  });

  it('prints raw JSON with --json', async () => {
    const summaryFn = vi.fn(() => ok({ summary }));
    const result = await runCli(['--json', 'dmarc', 'summary'], {
      dmarc: { summary: summaryFn } as never,
    });
    expect(JSON.parse(result.stdout)).toEqual({ summary });
  });

  it('surfaces API errors', async () => {
    const summaryFn = vi.fn(() => apiError('Unauthorized', 'invalid API key', 401));
    const result = await runCli(['dmarc', 'summary'], {
      dmarc: { summary: summaryFn } as never,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Error [Unauthorized]: invalid API key');
  });
});
