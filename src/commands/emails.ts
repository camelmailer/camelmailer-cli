import type { Command } from 'commander';

import type { ListEmailsOptions, SendEmailOptions } from '@camelmailer/sdk';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { CliError } from '../errors.js';
import { paginationLine, renderKeyValues, renderTable } from '../output.js';
import { parseId, parseJsonObject, parsePositiveInt } from '../parse.js';

interface SendFlags {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject?: string;
  html?: string;
  text?: string;
  template?: string;
  model?: string;
  tag?: string;
  stream?: string;
  idempotencyKey?: string;
}

async function sendEmail(ctx: Context, flags: SendFlags): Promise<void> {
  if (flags.model !== undefined && flags.template === undefined) {
    throw new CliError('InvalidOption', '--model requires --template.');
  }
  if (flags.template === undefined && flags.html === undefined && flags.text === undefined) {
    throw new CliError(
      'MissingBody',
      'Provide a body: --html, --text, or --template <permalink>.',
    );
  }

  // Validate local input (JSON model) before touching the network client.
  const templateModel = flags.model ? parseJsonObject(flags.model, '--model') : undefined;

  const base: SendEmailOptions = {
    from: flags.from,
    to: flags.to,
    cc: flags.cc,
    bcc: flags.bcc,
    reply_to: flags.replyTo,
    subject: flags.subject,
    html_body: flags.html,
    text_body: flags.text,
    tag: flags.tag,
    stream: flags.stream,
  };

  const client = ctx.client();
  // The key travels as a header, so it never becomes part of the body the
  // server hashes to recognise a replay.
  const request = flags.idempotencyKey ? { idempotencyKey: flags.idempotencyKey } : undefined;
  const data = flags.template
    ? await ctx.unwrap(
        client.emails.sendWithTemplate(
          { ...base, template: flags.template, template_model: templateModel },
          request,
        ),
      )
    : await ctx.unwrap(client.emails.send(base, request));

  ctx.print(data, () => {
    const count = data.recipients.length;
    ctx.io.out(`Queued ${count} message${count === 1 ? '' : 's'}`);
    ctx.io.out(
      renderTable(
        ['ID', 'RECIPIENT', 'STATUS', 'TOKEN'],
        data.recipients.map((r) => [r.message_id, r.rcpt_to, r.status, r.token]),
      ),
    );
  });
}

interface BroadcastFlags {
  from: string;
  subject?: string;
  html?: string;
  text?: string;
  template?: string;
  model?: string;
}

async function sendToStream(
  ctx: Context,
  permalink: string,
  flags: BroadcastFlags,
): Promise<void> {
  if (flags.model !== undefined && flags.template === undefined) {
    throw new CliError('InvalidOption', '--model requires --template.');
  }
  if (flags.template === undefined && flags.html === undefined && flags.text === undefined) {
    throw new CliError(
      'MissingBody',
      'Provide a body: --html, --text, or --template <permalink>.',
    );
  }
  const templateModel = flags.model ? parseJsonObject(flags.model, '--model') : undefined;

  const data = await ctx.unwrap(
    ctx.client().emails.sendToStream(permalink, {
      from: flags.from,
      subject: flags.subject,
      html_body: flags.html,
      text_body: flags.text,
      template: flags.template,
      template_model: templateModel,
    }),
  );
  ctx.print(data, () => {
    ctx.io.out(`Queued ${data.queued}, skipped ${data.skipped}`);
    if (data.skipped > 0) {
      // The endpoint caps a single request at 1000 recipients.
      ctx.io.out('Recipients past the per-request cap of 1000 were skipped; use a campaign.');
    }
  });
}

interface ListFlags {
  scope?: string;
  status?: string;
  tag?: string;
  query?: string;
  stream?: string;
  page?: string;
  perPage?: string;
}

async function listEmails(ctx: Context, flags: ListFlags): Promise<void> {
  const options: ListEmailsOptions = {
    scope: flags.scope as ListEmailsOptions['scope'],
    status: flags.status,
    tag: flags.tag,
    query: flags.query,
    stream: flags.stream,
    page: parsePositiveInt(flags.page, '--page'),
    per_page: parsePositiveInt(flags.perPage, '--per-page'),
  };
  const data = await ctx.unwrap(ctx.client().emails.list(options));
  ctx.print(data, () => {
    ctx.io.out(
      renderTable(
        ['ID', 'SCOPE', 'STATUS', 'TO', 'SUBJECT', 'TAG', 'CREATED'],
        data.messages.map((m) => [
          m.id,
          m.scope,
          m.status,
          m.rcpt_to,
          m.subject,
          m.tag,
          m.created_at,
        ]),
      ),
    );
    ctx.io.out(paginationLine(data.pagination));
  });
}

async function getEmail(ctx: Context, rawId: string): Promise<void> {
  const id = parseId(rawId); // validate before touching the network client
  const data = await ctx.unwrap(ctx.client().emails.get(id));
  ctx.print(data, () => {
    const m = data.message;
    ctx.io.out(
      renderKeyValues([
        ['ID', m.id],
        ['Token', m.token],
        ['Scope', m.scope],
        ['Status', m.status],
        ['From', m.mail_from],
        ['To', m.rcpt_to],
        ['Subject', m.subject],
        ['Tag', m.tag],
        ['Bounce', m.bounce],
        ['Held', m.held],
        ['Created', m.created_at],
      ]),
    );
    if (data.deliveries.length > 0) {
      ctx.io.out('');
      ctx.io.out(
        renderTable(
          ['DELIVERY', 'STATUS', 'DETAILS', 'AT'],
          data.deliveries.map((d) => [d.id, d.status, d.details, d.created_at]),
        ),
      );
    }
  });
}

export function registerEmails(program: Command, deps: CliDeps): void {
  const emails = program.command('emails').description('Send and inspect messages');

  emails
    .command('send')
    .description('Send an email (direct body or stored template)')
    .requiredOption('--from <address>', 'sender address (verified domain)')
    .requiredOption('--to <address...>', 'recipient address(es)')
    .option('--cc <address...>', 'CC recipient(s)')
    .option('--bcc <address...>', 'BCC recipient(s)')
    .option('--reply-to <address...>', 'Reply-To address(es)')
    .option('--subject <subject>', 'message subject')
    .option('--html <html>', 'HTML body')
    .option('--text <text>', 'plain-text body')
    .option('--template <permalink>', 'send a stored template instead of a body')
    .option('--model <json>', 'JSON object with template variables')
    .option('--tag <tag>', 'tag for filtering and stats')
    .option('--stream <permalink>', 'message stream to send through')
    .option(
      '--idempotency-key <key>',
      'make the send replayable: the same key with the same body returns the first result',
    )
    .action(action(deps, (ctx, flags: SendFlags) => sendEmail(ctx, flags)));

  emails
    .command('send-to-stream <stream>')
    .description("Send the same content to every subscriber of a broadcast stream")
    .requiredOption('--from <address>', 'sender address (verified domain)')
    .option('--subject <subject>', 'message subject')
    .option('--html <html>', 'HTML body')
    .option('--text <text>', 'plain-text body')
    .option('--template <permalink>', 'send a stored template instead of a body')
    .option('--model <json>', 'JSON object with template variables')
    .action(
      action(deps, (ctx, stream: string, flags: BroadcastFlags) =>
        sendToStream(ctx, stream, flags),
      ),
    );

  emails
    .command('list')
    .description('List messages, newest first')
    .option('--scope <scope>', 'incoming | outgoing')
    .option('--status <status>', 'filter by status (e.g. Sent, HardFail)')
    .option('--tag <tag>', 'filter by tag')
    .option('--query <text>', 'substring match on subject / addresses')
    .option('--stream <permalink>', 'filter by message stream')
    .option('--page <n>', 'page number')
    .option('--per-page <n>', 'results per page (max 100)')
    .action(action(deps, (ctx, flags: ListFlags) => listEmails(ctx, flags)));

  emails
    .command('get <id>')
    .description('Show one message with its delivery attempts')
    .action(action(deps, (ctx, id: string) => getEmail(ctx, id)));
}
