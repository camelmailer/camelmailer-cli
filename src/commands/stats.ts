import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { renderKeyValues } from '../output.js';

async function showStats(ctx: Context, flags: { from?: string; to?: string }): Promise<void> {
  const data = await ctx.unwrap(ctx.client().stats.get({ from: flags.from, to: flags.to }));
  ctx.print(data, () => {
    const s = data.stats;
    ctx.io.out(
      renderKeyValues([
        ['Total', s.total],
        ['Outgoing', s.outgoing],
        ['Incoming', s.incoming],
        ['Sent', s.sent],
        ['Pending', s.pending],
        ['Held', s.held],
        ['Bounced', s.bounced],
        ['Soft fail', s.soft_fail],
        ['Hard fail', s.hard_fail],
        ['Opens', `${s.opens} (${s.unique_opens} unique)`],
        ['Clicks', `${s.clicks} (${s.unique_clicks} unique)`],
      ]),
    );
  });
}

export function registerStats(program: Command, deps: CliDeps): void {
  program
    .command('stats')
    .description('Message counters of the server')
    .option('--from <iso8601>', 'window start (created_at >=)')
    .option('--to <iso8601>', 'window end (created_at <=)')
    .action(action(deps, (ctx, flags: { from?: string; to?: string }) => showStats(ctx, flags)));
}
