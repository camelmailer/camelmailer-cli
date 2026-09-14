import type { Command } from 'commander';

import type { ListLogsOptions } from '@camelmailer/sdk';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { paginationLine, renderTable } from '../output.js';
import { parsePositiveInt } from '../parse.js';

interface ListFlags {
  method?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
  perPage?: string;
}

async function listLogs(ctx: Context, flags: ListFlags): Promise<void> {
  const options: ListLogsOptions = {
    method: flags.method,
    // A status class such as `4xx`, so this stays a string rather than
    // being parsed as a number.
    status: flags.status,
    from: flags.from,
    to: flags.to,
    page: parsePositiveInt(flags.page, '--page'),
    per_page: parsePositiveInt(flags.perPage, '--per-page'),
  };
  const data = await ctx.unwrap(ctx.client().logs.list(options));
  ctx.print(data, () => {
    ctx.io.out(
      renderTable(
        ['ID', 'METHOD', 'PATH', 'STATUS', 'MS', 'AT'],
        data.requests.map((r) => [
          r.id,
          r.method,
          r.path,
          r.status_code,
          r.duration_ms,
          r.created_at,
        ]),
      ),
    );
    ctx.io.out(paginationLine(data.pagination));
  });
}

async function listTags(ctx: Context): Promise<void> {
  const data = await ctx.unwrap(ctx.client().logs.tags());
  ctx.print(data, () => {
    ctx.io.out(renderTable(['TAG', 'MESSAGES'], data.tags.map((t) => [t.tag, t.count])));
  });
}

export function registerLogs(program: Command, deps: CliDeps): void {
  const logs = program
    .command('logs')
    .description("Read the server's request log and tag index");

  logs
    .command('list')
    .description('List logged API requests, newest first')
    .option('--method <method>', 'filter by HTTP method')
    .option('--status <class>', 'filter by status class: 2xx, 3xx, 4xx or 5xx')
    .option('--from <time>', 'RFC 3339 lower bound')
    .option('--to <time>', 'RFC 3339 upper bound')
    .option('--page <n>', 'page number')
    .option('--per-page <n>', 'results per page (max 100)')
    .action(action(deps, (ctx, flags: ListFlags) => listLogs(ctx, flags)));

  logs
    .command('tags')
    .description("List the tags used by the server's recent messages")
    .action(action(deps, (ctx) => listTags(ctx)));
}
