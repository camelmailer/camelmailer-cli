import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { renderTable } from '../output.js';

async function listSubscribers(ctx: Context, permalink: string): Promise<void> {
  const data = await ctx.unwrap(ctx.client().subscribers.list(permalink));
  ctx.print(data, () => {
    ctx.io.out(
      renderTable(
        ['ID', 'ADDRESS', 'STATUS', 'CREATED'],
        data.subscribers.map((s) => [s.id, s.address, s.status, s.created_at]),
      ),
    );
  });
}

async function addSubscriber(
  ctx: Context,
  permalink: string,
  address: string,
  flags: { status?: string },
): Promise<void> {
  const data = await ctx.unwrap(
    ctx.client().subscribers.add(permalink, {
      address,
      status: flags.status as 'subscribed' | 'unsubscribed' | undefined,
    }),
  );
  ctx.print(data, () => {
    ctx.io.out(`${data.subscriber.address} is ${data.subscriber.status} on ${permalink}`);
  });
}

async function importSubscribers(
  ctx: Context,
  permalink: string,
  addresses: string[],
): Promise<void> {
  const data = await ctx.unwrap(ctx.client().subscribers.import(permalink, addresses));
  ctx.print(data, () => {
    // Blanks and duplicates within the request are skipped, so the two
    // numbers usually differ from what was passed.
    ctx.io.out(`Added ${data.added}; ${permalink} now has ${data.total} subscribers`);
  });
}

async function complain(ctx: Context, permalink: string, address: string): Promise<void> {
  const data = await ctx.unwrap(ctx.client().subscribers.complaint(permalink, address));
  ctx.print(data, () => {
    ctx.io.out(`${address} is ${data.subscriber.status} and suppressed on ${permalink}`);
  });
}

async function removeSubscriber(
  ctx: Context,
  permalink: string,
  address: string,
): Promise<void> {
  const data = await ctx.unwrap(ctx.client().subscribers.remove(permalink, address));
  ctx.print(data, () => {
    ctx.io.out(data.deleted ? `Removed ${address} from ${permalink}` : `${address} was not found`);
  });
}

export function registerSubscribers(program: Command, deps: CliDeps): void {
  const subscribers = program
    .command('subscribers')
    .description('Manage the audience of a broadcast stream');

  subscribers
    .command('list <stream>')
    .description('List the subscribers of a stream, subscribed and unsubscribed alike')
    .action(action(deps, (ctx, stream: string) => listSubscribers(ctx, stream)));

  subscribers
    .command('add <stream> <address>')
    .description('Add or update one subscriber; upserts by address')
    .option('--status <status>', 'subscribed (default) or unsubscribed')
    .action(
      action(deps, (ctx, stream: string, address: string, flags: { status?: string }) =>
        addSubscriber(ctx, stream, address, flags),
      ),
    );

  subscribers
    .command('import <stream> <addresses...>')
    .description('Add many addresses at once, all as subscribed')
    .action(
      action(deps, (ctx, stream: string, addresses: string[]) =>
        importSubscribers(ctx, stream, addresses),
      ),
    );

  subscribers
    .command('complaint <stream> <address>')
    .description('Record a spam complaint: suppress the address and unsubscribe it')
    .action(
      action(deps, (ctx, stream: string, address: string) => complain(ctx, stream, address)),
    );

  subscribers
    .command('remove <stream> <address>')
    .description('Remove a subscriber from the stream entirely')
    .action(
      action(deps, (ctx, stream: string, address: string) =>
        removeSubscriber(ctx, stream, address),
      ),
    );
}
