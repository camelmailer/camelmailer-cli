import { describe, expect, it, vi } from 'vitest';

import type { SendEmailResponse } from '@camelmailer/sdk';

import { email, pagination } from './helpers/fixtures.js';
import { apiError, ok, runCli } from './helpers/run.js';

const sendResponse: SendEmailResponse = {
  message_id: 42,
  recipients: [{ rcpt_to: 'ada@example.com', message_id: 42, token: 'tok42', status: 'Pending' }],
};

describe('emails send', () => {
  it('sends a text email and prints the queued recipients', async () => {
    const send = vi.fn(() => ok(sendResponse));
    const result = await runCli(
      [
        'emails',
        'send',
        '--from',
        'billing@acme.com',
        '--to',
        'ada@example.com',
        '--subject',
        'Hi',
        '--text',
        'Hello!',
      ],
      { emails: { send } as never },
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'billing@acme.com',
        to: ['ada@example.com'],
        subject: 'Hi',
        text_body: 'Hello!',
      }),
      undefined,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Queued 1 message');
    expect(result.stdout).toContain('ada@example.com');
    expect(result.stdout).toContain('tok42');
  });

  it('passes html body, tag, stream and multiple recipients through', async () => {
    const send = vi.fn(() => ok(sendResponse));
    await runCli(
      [
        'emails',
        'send',
        '--from',
        'billing@acme.com',
        '--to',
        'ada@example.com',
        'bob@example.com',
        '--cc',
        'cc@example.com',
        '--html',
        '<p>Hi</p>',
        '--tag',
        'welcome',
        '--stream',
        'broadcasts',
      ],
      { emails: { send } as never },
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['ada@example.com', 'bob@example.com'],
        cc: ['cc@example.com'],
        html_body: '<p>Hi</p>',
        tag: 'welcome',
        stream: 'broadcasts',
      }),
      undefined,
    );
  });

  it('passes --idempotency-key as request options, not as a body field', async () => {
    const send = vi.fn(() => ok(sendResponse));
    await runCli(
      [
        'emails',
        'send',
        '--from',
        'billing@acme.com',
        '--to',
        'ada@example.com',
        '--text',
        'Hello!',
        '--idempotency-key',
        'order-4711',
      ],
      { emails: { send } as never },
    );

    // The key belongs outside the body: the body is what the server hashes
    // to recognise the same request.
    expect(send).toHaveBeenCalledWith(
      expect.not.objectContaining({ idempotencyKey: 'order-4711' }),
      { idempotencyKey: 'order-4711' },
    );
  });

  it('routes --template to sendWithTemplate with the parsed --model', async () => {
    const sendWithTemplate = vi.fn(() => ok(sendResponse));
    const result = await runCli(
      [
        'emails',
        'send',
        '--from',
        'billing@acme.com',
        '--to',
        'ada@example.com',
        '--template',
        'welcome',
        '--model',
        '{"name":"Ada"}',
      ],
      { emails: { sendWithTemplate } as never },
    );

    expect(sendWithTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'welcome', template_model: { name: 'Ada' } }),
      undefined,
    );
    expect(result.exitCode).toBe(0);
  });

  it('fails without --html, --text or --template', async () => {
    const result = await runCli(
      ['emails', 'send', '--from', 'a@b.c', '--to', 'd@e.f', '--subject', 'Hi'],
      {},
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [MissingBody]');
  });

  it('fails when --model is given without --template', async () => {
    const result = await runCli(
      ['emails', 'send', '--from', 'a@b.c', '--to', 'd@e.f', '--text', 'x', '--model', '{}'],
      {},
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [InvalidOption]');
  });

  it('fails on invalid --model JSON', async () => {
    const result = await runCli(
      [
        'emails',
        'send',
        '--from',
        'a@b.c',
        '--to',
        'd@e.f',
        '--template',
        'welcome',
        '--model',
        'not-json',
      ],
      {},
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [InvalidJson]');
  });

  it('surfaces API errors with their code and a non-zero exit', async () => {
    const send = vi.fn(() => apiError('ValidationError', 'from address not allowed'));
    const result = await runCli(
      ['emails', 'send', '--from', 'a@b.c', '--to', 'd@e.f', '--text', 'x'],
      { emails: { send } as never },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Error [ValidationError]: from address not allowed');
    expect(result.stdout).toBe('');
  });

  it('prints raw JSON with --json', async () => {
    const send = vi.fn(() => ok(sendResponse));
    const result = await runCli(
      ['--json', 'emails', 'send', '--from', 'a@b.c', '--to', 'd@e.f', '--text', 'x'],
      { emails: { send } as never },
    );
    expect(JSON.parse(result.stdout)).toEqual(sendResponse);
  });
});

describe('emails list', () => {
  it('lists messages as a table with a pagination line', async () => {
    const list = vi.fn(() => ok({ messages: [email()], pagination: pagination({ total: 5 }) }));
    const result = await runCli(['emails', 'list'], { emails: { list } as never });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ID');
    expect(result.stdout).toContain('ada@example.com');
    expect(result.stdout).toContain('Page 1 of 1 · 5 total');
  });

  it('passes every filter through to the SDK', async () => {
    const list = vi.fn(() => ok({ messages: [], pagination: pagination({ total: 0 }) }));
    await runCli(
      [
        'emails',
        'list',
        '--scope',
        'outgoing',
        '--status',
        'HardFail',
        '--tag',
        'receipt',
        '--query',
        'ada',
        '--stream',
        'default',
        '--page',
        '2',
        '--per-page',
        '50',
      ],
      { emails: { list } as never },
    );
    expect(list).toHaveBeenCalledWith({
      scope: 'outgoing',
      status: 'HardFail',
      tag: 'receipt',
      query: 'ada',
      stream: 'default',
      page: 2,
      per_page: 50,
    });
  });

  it('rejects a non-numeric --page', async () => {
    const result = await runCli(['emails', 'list', '--page', 'two'], {});
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [InvalidOption]');
  });

  it('prints raw JSON with --json', async () => {
    const payload = { messages: [email()], pagination: pagination() };
    const list = vi.fn(() => ok(payload));
    const result = await runCli(['--json', 'emails', 'list'], { emails: { list } as never });
    expect(JSON.parse(result.stdout)).toEqual(payload);
  });
});

describe('emails get', () => {
  it('shows one message with its deliveries', async () => {
    const get = vi.fn(() =>
      ok({
        message: email(),
        deliveries: [
          {
            id: 7,
            status: 'Sent',
            details: 'accepted',
            output: '250 OK',
            sent_with_ssl: true,
            created_at: '2026-07-11T10:00:05Z',
          },
        ],
      }),
    );
    const result = await runCli(['emails', 'get', '42'], { emails: { get } as never });

    expect(get).toHaveBeenCalledWith(42);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Your receipt');
    expect(result.stdout).toContain('accepted');
  });

  it('rejects a non-numeric id', async () => {
    const result = await runCli(['emails', 'get', 'abc'], {});
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error [InvalidArgument]');
  });

  it('surfaces NotFound from the API', async () => {
    const get = vi.fn(() => apiError('NotFound', 'no such message', 404));
    const result = await runCli(['emails', 'get', '999'], { emails: { get } as never });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Error [NotFound]: no such message');
  });
});
