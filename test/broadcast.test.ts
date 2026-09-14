import { describe, expect, it, vi } from 'vitest';

import { ok, runCli } from './helpers/run.js';

describe('subscribers', () => {
  it('lists a stream audience', async () => {
    const list = vi.fn(() =>
      ok({
        subscribers: [
          { id: 1, address: 'ada@example.com', status: 'subscribed', created_at: '2026-09-01T10:00:00Z' },
        ],
      }),
    );
    const result = await runCli(['subscribers', 'list', 'product-news'], {
      subscribers: { list } as never,
    });

    expect(list).toHaveBeenCalledWith('product-news');
    expect(result.stdout).toContain('ada@example.com');
    expect(result.stdout).toContain('subscribed');
  });

  it('adds one address, upserting by address', async () => {
    const add = vi.fn(() =>
      ok({ subscriber: { id: 1, address: 'ada@example.com', status: 'subscribed', created_at: '' } }),
    );
    const result = await runCli(['subscribers', 'add', 'product-news', 'ada@example.com'], {
      subscribers: { add } as never,
    });

    expect(add).toHaveBeenCalledWith('product-news', { address: 'ada@example.com', status: undefined });
    expect(result.stdout).toContain('is subscribed on product-news');
  });

  it('imports many addresses and reports what was written', async () => {
    const importFn = vi.fn(() => ok({ added: 2, total: 5 }));
    const result = await runCli(
      ['subscribers', 'import', 'product-news', 'ada@example.com', 'grace@example.com'],
      { subscribers: { import: importFn } as never },
    );

    expect(importFn).toHaveBeenCalledWith('product-news', [
      'ada@example.com',
      'grace@example.com',
    ]);
    // Blanks and duplicates are skipped, so both numbers are worth showing.
    expect(result.stdout).toContain('Added 2');
    expect(result.stdout).toContain('5 subscribers');
  });

  it('records a complaint, which suppresses and unsubscribes', async () => {
    const complaint = vi.fn(() =>
      ok({ subscriber: { id: 1, address: 'ada@example.com', status: 'unsubscribed', created_at: '' } }),
    );
    const result = await runCli(
      ['subscribers', 'complaint', 'product-news', 'ada@example.com'],
      { subscribers: { complaint } as never },
    );

    expect(complaint).toHaveBeenCalledWith('product-news', 'ada@example.com');
    expect(result.stdout).toContain('unsubscribed and suppressed');
  });

  it('removes a subscriber', async () => {
    const remove = vi.fn(() => ok({ deleted: true }));
    const result = await runCli(
      ['subscribers', 'remove', 'product-news', 'ada@example.com'],
      { subscribers: { remove } as never },
    );

    expect(remove).toHaveBeenCalledWith('product-news', 'ada@example.com');
    expect(result.stdout).toContain('Removed ada@example.com');
  });
});

describe('emails send-to-stream', () => {
  it('broadcasts and reports what was queued against what was skipped', async () => {
    const sendToStream = vi.fn(() => ok({ queued: 42, skipped: 3 }));
    const result = await runCli(
      ['emails', 'send-to-stream', 'newsletter', '--from', 'news@acme.com', '--text', 'Hello.'],
      { emails: { sendToStream } as never },
    );

    expect(sendToStream).toHaveBeenCalledWith(
      'newsletter',
      expect.objectContaining({ from: 'news@acme.com', text_body: 'Hello.' }),
    );
    expect(result.stdout).toContain('Queued 42, skipped 3');
    // A skip means the audience is past the per-request cap.
    expect(result.stdout).toContain('use a campaign');
  });

  it('fails without a body', async () => {
    const result = await runCli(
      ['emails', 'send-to-stream', 'newsletter', '--from', 'news@acme.com'],
      {},
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [MissingBody]');
  });
});

describe('layouts', () => {
  it('lists layouts and shows whether a text wrapper exists', async () => {
    const list = vi.fn(() =>
      ok({
        layouts: [
          {
            id: 1,
            uuid: 'l-1',
            name: 'Default',
            permalink: 'default',
            html_wrapper: '<html>{{{ content }}}</html>',
            text_wrapper: null,
          },
        ],
      }),
    );
    const result = await runCli(['layouts', 'list'], { layouts: { list } as never });

    expect(result.stdout).toContain('default');
    expect(result.stdout).toContain('TEXT WRAPPER');
  });

  it('creates a layout', async () => {
    const create = vi.fn(() =>
      ok({
        layout: {
          id: 1,
          uuid: 'l-1',
          name: 'Default',
          permalink: 'default',
          html_wrapper: '<html>{{{ content }}}</html>',
          text_wrapper: null,
        },
      }),
    );
    const result = await runCli(
      ['layouts', 'create', '--name', 'Default', '--html', '<html>{{{ content }}}</html>'],
      { layouts: { create } as never },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Default', html_wrapper: '<html>{{{ content }}}</html>' }),
    );
    expect(result.stdout).toContain('Created layout default');
  });

  it('refuses an unreadable logo file before touching the client', async () => {
    const uploadLogo = vi.fn(() => ok({ url: 'https://example.test/logo' }));
    const result = await runCli(
      ['layouts', 'upload-logo', 'default', '/nonexistent/logo.png'],
      { layouts: { uploadLogo } as never },
    );

    expect(uploadLogo).not.toHaveBeenCalled();
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [FileNotFound]');
  });

  it('refuses a file whose image type it cannot tell', async () => {
    const uploadLogo = vi.fn(() => ok({ url: 'https://example.test/logo' }));
    const result = await runCli(['layouts', 'upload-logo', 'default', 'logo.txt'], {
      layouts: { uploadLogo } as never,
    });

    expect(uploadLogo).not.toHaveBeenCalled();
    expect(result.stderr).toContain('Error [UnsupportedFile]');
  });
});

describe('inbound', () => {
  it('lists held messages', async () => {
    const list = vi.fn(() =>
      ok({
        inbound: [
          {
            id: 55,
            status: 'Held',
            held: true,
            mail_from: 'someone@example.com',
            rcpt_to: 'support@acme.com',
            subject: 'Help',
            created_at: '2026-09-01T10:00:00Z',
          },
        ],
        pagination: { page: 1, per_page: 30, total: 1, total_pages: 1 },
      }),
    );
    const result = await runCli(['inbound', 'list', '--status', 'held'], {
      inbound: { list } as never,
    });

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ status: 'held' }));
    expect(result.stdout).toContain('Help');
    expect(result.stdout).toContain('Page 1 of 1');
  });

  it('retries and bypasses, reading the requeued flag', async () => {
    // The endpoint answers with `requeued`, not `queued`.
    const retry = vi.fn(() => ok({ message: {}, requeued: true }));
    const bypass = vi.fn(() => ok({ message: {}, requeued: true }));

    const retried = await runCli(['inbound', 'retry', '55'], { inbound: { retry } as never });
    expect(retry).toHaveBeenCalledWith(55);
    expect(retried.stdout).toContain('back on the delivery queue');

    const bypassed = await runCli(['inbound', 'bypass', '55'], { inbound: { bypass } as never });
    expect(bypass).toHaveBeenCalledWith(55);
    expect(bypassed.stdout).toContain('released past the hold');
  });
});

describe('logs', () => {
  it('lists logged requests', async () => {
    const list = vi.fn(() =>
      ok({
        requests: [
          {
            id: 1,
            method: 'POST',
            path: '/api/v2/server/messages',
            status_code: 201,
            duration_ms: 12,
            user_agent: 'camelmailer-cli',
            created_at: '2026-09-14T08:00:00Z',
          },
        ],
        pagination: { page: 1, per_page: 30, total: 1, total_pages: 1 },
      }),
    );
    const result = await runCli(['logs', 'list', '--status', '4xx'], { logs: { list } as never });

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ status: '4xx' }));
    expect(result.stdout).toContain('/api/v2/server/messages');
  });

  it('lists tags with their counts', async () => {
    const tags = vi.fn(() => ok({ tags: [{ tag: 'receipt', count: 12 }] }));
    const result = await runCli(['logs', 'tags'], { logs: { tags } as never });

    expect(result.stdout).toContain('receipt');
    expect(result.stdout).toContain('12');
  });
});

describe('streams', () => {
  const stream = {
    id: 2,
    uuid: 'u-2',
    name: 'Broadcasts',
    permalink: 'broadcasts',
    stream_type: 'broadcast',
    archived: false,
  };

  it('creates a stream with an explicit permalink', async () => {
    const create = vi.fn(() => ok({ stream }));
    const result = await runCli(
      ['streams', 'create', '--name', 'Broadcasts', '--permalink', 'broadcasts', '--stream-type', 'broadcast'],
      { streams: { create } as never },
    );

    // Without a permalink the API derives one from the name, which a caller
    // that has to know it up front cannot rely on.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ permalink: 'broadcasts', stream_type: 'broadcast' }),
    );
    expect(result.stdout).toContain('broadcasts');
  });

  it('archives a stream', async () => {
    const archive = vi.fn(() => ok({ stream: { ...stream, archived: true } }));
    const result = await runCli(['streams', 'archive', 'broadcasts'], {
      streams: { archive } as never,
    });

    expect(archive).toHaveBeenCalledWith('broadcasts');
    expect(result.stdout).toContain('rejects new messages');
  });
});
