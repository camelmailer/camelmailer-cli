import { describe, expect, it, vi } from 'vitest';

import type { Campaign } from '@camelmailer/sdk';

import { apiError, ok, runCli } from './helpers/run.js';

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 7,
    name: 'September',
    subject: 'What shipped',
    from: 'news@acme.com',
    html_body: null,
    text_body: 'Hello.',
    status: 'draft',
    total: 120,
    sent: 0,
    stream_id: 3,
    stream: { permalink: 'product-news', name: 'Product news' },
    scheduled_at: null,
    created_at: '2026-09-01T10:00:00Z',
    completed_at: null,
    ...overrides,
  } as Campaign;
}

describe('campaigns list', () => {
  it('lists every campaign with its stream', async () => {
    const list = vi.fn(() => ok({ campaigns: [campaign()] }));
    const result = await runCli(['campaigns', 'list'], { campaigns: { list } as never });

    expect(list).toHaveBeenCalled();
    expect(result.stdout).toContain('product-news');
    expect(result.stdout).toContain('draft');
    expect(result.exitCode).toBe(0);
  });

  it('--stream narrows to one stream', async () => {
    const listForStream = vi.fn(() => ok({ campaigns: [] }));
    await runCli(['campaigns', 'list', '--stream', 'product-news'], {
      campaigns: { listForStream } as never,
    });

    expect(listForStream).toHaveBeenCalledWith('product-news');
  });
});

describe('campaigns create', () => {
  it('posts to the planning route, leaving the campaign a draft', async () => {
    const createDraft = vi.fn(() => ok({ campaign: campaign() }));
    const result = await runCli(
      [
        'campaigns',
        'create',
        '--stream',
        'product-news',
        '--from',
        'news@acme.com',
        '--name',
        'September',
      ],
      { campaigns: { createDraft } as never },
    );

    expect(createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ stream: 'product-news', from: 'news@acme.com' }),
    );
    expect(result.stdout).toContain('Created campaign 7 (draft)');
  });

  it('--scheduled-at arms the schedule', async () => {
    const createDraft = vi.fn(() =>
      ok({ campaign: campaign({ status: 'scheduled', scheduled_at: '2026-10-01T08:00:00Z' }) }),
    );
    const result = await runCli(
      [
        'campaigns',
        'create',
        '--stream',
        'product-news',
        '--from',
        'news@acme.com',
        '--scheduled-at',
        '2026-10-01T08:00:00Z',
      ],
      { campaigns: { createDraft } as never },
    );

    expect(createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled_at: '2026-10-01T08:00:00Z' }),
    );
    expect(result.stdout).toContain('(scheduled)');
  });
});

describe('campaigns send-now', () => {
  it('uses the stream route, which sends before it answers', async () => {
    const createAndSend = vi.fn(() => ok({ campaign: campaign({ id: 9, status: 'sending' }) }));
    const result = await runCli(
      ['campaigns', 'send-now', 'product-news', '--name', 'Status update'],
      { campaigns: { createAndSend } as never },
    );

    expect(createAndSend).toHaveBeenCalledWith(
      'product-news',
      expect.objectContaining({ name: 'Status update' }),
    );
    expect(result.stdout).toContain('started sending to product-news');
  });
});

describe('campaigns update', () => {
  it('--clear-schedule sends an explicit null', async () => {
    const update = vi.fn(() => ok({ campaign: campaign({ status: 'draft' }) }));
    await runCli(['campaigns', 'update', '7', '--clear-schedule'], {
      campaigns: { update } as never,
    });

    // An omitted field leaves the schedule standing, so the null has to be
    // in the body.
    expect(update).toHaveBeenCalledWith(7, expect.objectContaining({ scheduled_at: null }));
  });

  it('leaves the schedule alone when neither flag is given', async () => {
    const update = vi.fn(() => ok({ campaign: campaign() }));
    await runCli(['campaigns', 'update', '7', '--subject', 'Corrected'], {
      campaigns: { update } as never,
    });

    expect(update).toHaveBeenCalledWith(7, expect.not.objectContaining({ scheduled_at: null }));
    const [, body] = update.mock.calls[0] as [number, Record<string, unknown>];
    expect('scheduled_at' in body).toBe(false);
  });

  it('reports the API refusing to edit a sending campaign', async () => {
    const update = vi.fn(() =>
      apiError('ValidationError', 'a sent campaign can no longer be edited'),
    );
    const result = await runCli(['campaigns', 'update', '7', '--subject', 'Too late'], {
      campaigns: { update } as never,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [ValidationError]');
  });

  it('rejects a non-numeric id before touching the client', async () => {
    const update = vi.fn(() => ok({ campaign: campaign() }));
    const result = await runCli(['campaigns', 'update', 'abc'], {
      campaigns: { update } as never,
    });

    expect(update).not.toHaveBeenCalled();
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [InvalidArgument]');
  });
});

describe('campaigns get', () => {
  it('prints the campaign and its statistics', async () => {
    const get = vi.fn(() =>
      ok({
        campaign: campaign(),
        stats: {
          total: 120,
          sent: 118,
          delivered: 110,
          failed: 8,
          opened: 40,
          clicked: 9,
          unsubscribed: 1,
        },
      }),
    );
    const result = await runCli(['campaigns', 'get', '7'], { campaigns: { get } as never });

    expect(get).toHaveBeenCalledWith(7);
    expect(result.stdout).toContain('September');
    expect(result.stdout).toContain('DELIVERED');
    expect(result.stdout).toContain('110');
  });
});

describe('campaigns send and cancel', () => {
  it('sends now and cancels', async () => {
    const send = vi.fn(() => ok({ campaign: campaign({ status: 'sending' }) }));
    const cancel = vi.fn(() => ok({ campaign: campaign({ status: 'canceled' }) }));

    const sent = await runCli(['campaigns', 'send', '7'], { campaigns: { send } as never });
    expect(send).toHaveBeenCalledWith(7);
    expect(sent.stdout).toContain('now sending');

    const canceled = await runCli(['campaigns', 'cancel', '7'], {
      campaigns: { cancel } as never,
    });
    expect(cancel).toHaveBeenCalledWith(7);
    expect(canceled.stdout).toContain('now canceled');
  });
});
