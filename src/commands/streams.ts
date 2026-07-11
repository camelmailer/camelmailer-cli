import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { renderTable } from '../output.js';

async function listStreams(ctx: Context): Promise<void> {
  const data = await ctx.unwrap(ctx.client().streams.list());
  ctx.print(data, () => {
    ctx.io.out(
      renderTable(
        ['ID', 'NAME', 'PERMALINK', 'TYPE', 'ARCHIVED'],
        data.streams.map((s) => [s.id, s.name, s.permalink, s.stream_type, s.archived]),
      ),
    );
  });
}

export function registerStreams(program: Command, deps: CliDeps): void {
  const streams = program.command('streams').description('Inspect message streams');

  streams
    .command('list')
    .description('List all message streams of the server')
    .action(action(deps, (ctx) => listStreams(ctx)));
}
