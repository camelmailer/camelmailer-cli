import type { Command } from 'commander';

import type { ListInboundOptions } from '@camelmailer/sdk';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { paginationLine, renderKeyValues, renderTable } from '../output.js';
import { parseId, parsePositiveInt } from '../parse.js';

interface ListFlags {
  status?: string;
  stream?: string;
  query?: string;
  page?: string;
  perPage?: string;
}

async function listInbound(ctx: Context, flags: ListFlags): Promise<void> {
  const options: ListInboundOptions = {
    status: flags.status,
    stream: flags.stream,
    query: flags.query,
    page: parsePositiveInt(flags.page, '--page'),
    per_page: parsePositiveInt(flags.perPage, '--per-page'),
  };
  const data = await ctx.unwrap(ctx.client().inbound.list(options));
  ctx.print(data, () => {
    ctx.io.out(
      renderTable(
        ['ID', 'STATUS', 'HELD', 'FROM', 'TO', 'SUBJECT', 'CREATED'],
        data.inbound.map((m) => [
          m.id,
          m.status,
          m.held,
          m.mail_from,
          m.rcpt_to,
          m.subject,
          m.created_at,
        ]),
      ),
    );
    ctx.io.out(paginationLine(data.pagination));
  });
}

async function getInbound(ctx: Context, rawId: string): Promise<void> {
  const id = parseId(rawId);
  const data = await ctx.unwrap(ctx.client().inbound.get(id));
  ctx.print(data, () => {
    const m = data.message;
    ctx.io.out(
      renderKeyValues([
        ['ID', m.id],
        ['Status', m.status],
        ['Held', m.held],
        ['From', m.mail_from],
        ['To', m.rcpt_to],
        ['Subject', m.subject],
        ['Spam status', m.spam_status],
        ['Spam score', m.spam_score],
        ['Created', m.created_at],
      ]),
    );
  });
}

async function retryInbound(ctx: Context, rawId: string): Promise<void> {
  const id = parseId(rawId);
  const data = await ctx.unwrap(ctx.client().inbound.retry(id));
  ctx.print(data, () => {
    ctx.io.out(
      data.requeued
        ? `Message ${id} is back on the delivery queue`
        : `Message ${id} was not requeued`,
    );
  });
}

async function bypassInbound(ctx: Context, rawId: string): Promise<void> {
  const id = parseId(rawId);
  const data = await ctx.unwrap(ctx.client().inbound.bypass(id));
  ctx.print(data, () => {
    ctx.io.out(
      data.requeued
        ? `Message ${id} was released past the hold`
        : `Message ${id} was not requeued`,
    );
  });
}

export function registerInbound(program: Command, deps: CliDeps): void {
  const inbound = program.command('inbound').description('Inspect inbound and held messages');

  inbound
    .command('list')
    .description('List inbound and held messages, newest first')
    .option('--status <status>', 'filter by status, e.g. held')
    .option('--stream <permalink>', 'filter by message stream')
    .option('--query <text>', 'substring match on subject / addresses')
    .option('--page <n>', 'page number')
    .option('--per-page <n>', 'results per page (max 100)')
    .action(action(deps, (ctx, flags: ListFlags) => listInbound(ctx, flags)));

  inbound
    .command('get <id>')
    .description('Show one inbound message')
    .action(action(deps, (ctx, id: string) => getInbound(ctx, id)));

  inbound
    .command('retry <id>')
    .description('Put a message back on the delivery queue')
    .action(action(deps, (ctx, id: string) => retryInbound(ctx, id)));

  inbound
    .command('bypass <id>')
    .description('Release a held message past the hold and deliver it')
    .action(action(deps, (ctx, id: string) => bypassInbound(ctx, id)));
}
