import type { Command } from 'commander';

import type { ListBouncesOptions } from '@camelmailer/sdk';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { paginationLine, renderTable } from '../output.js';
import { parsePositiveInt } from '../parse.js';

interface ListFlags {
  status?: string;
  tag?: string;
  query?: string;
  page?: string;
  perPage?: string;
}

async function listBounces(ctx: Context, flags: ListFlags): Promise<void> {
  const options: ListBouncesOptions = {
    status: flags.status,
    tag: flags.tag,
    query: flags.query,
    page: parsePositiveInt(flags.page, '--page'),
    per_page: parsePositiveInt(flags.perPage, '--per-page'),
  };
  const data = await ctx.unwrap(ctx.client().bounces.list(options));
  ctx.print(data, () => {
    ctx.io.out(
      renderTable(
        ['ID', 'STATUS', 'TO', 'SUBJECT', 'TAG', 'CREATED'],
        data.bounces.map((b) => [b.id, b.status, b.rcpt_to, b.subject, b.tag, b.created_at]),
      ),
    );
    ctx.io.out(paginationLine(data.pagination));
  });
}

export function registerBounces(program: Command, deps: CliDeps): void {
  const bounces = program.command('bounces').description('Inspect bounced messages');

  bounces
    .command('list')
    .description('List bounced messages')
    .option('--status <status>', 'filter by status')
    .option('--tag <tag>', 'filter by tag')
    .option('--query <text>', 'substring match on subject / addresses')
    .option('--page <n>', 'page number')
    .option('--per-page <n>', 'results per page (max 100)')
    .action(action(deps, (ctx, flags: ListFlags) => listBounces(ctx, flags)));
}
