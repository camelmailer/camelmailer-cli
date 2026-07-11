import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';

async function ping(ctx: Context): Promise<void> {
  const data = await ctx.unwrap(ctx.client().ping());
  ctx.print(data, () => {
    ctx.io.out(`pong — server "${data.server}" (id ${data.server_id})`);
  });
}

export function registerPing(program: Command, deps: CliDeps): void {
  program
    .command('ping')
    .description('Validate the API key against the instance')
    .action(action(deps, (ctx) => ping(ctx)));
}
