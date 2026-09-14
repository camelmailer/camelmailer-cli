import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { renderKeyValues, renderTable } from '../output.js';

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

interface StreamFlags {
  name?: string;
  permalink?: string;
  streamType?: string;
}

function describe(ctx: Context, stream: {
  id: number;
  name: string;
  permalink: string;
  stream_type: string;
  archived: boolean;
}): void {
  ctx.io.out(
    renderKeyValues([
      ['ID', stream.id],
      ['Name', stream.name],
      ['Permalink', stream.permalink],
      ['Type', stream.stream_type],
      ['Archived', stream.archived],
    ]),
  );
}

async function createStream(ctx: Context, flags: StreamFlags & { name: string }): Promise<void> {
  const data = await ctx.unwrap(
    ctx.client().streams.create({
      name: flags.name,
      permalink: flags.permalink,
      stream_type: flags.streamType as 'transactional' | 'broadcast' | undefined,
    }),
  );
  ctx.print(data, () => describe(ctx, data.stream));
}

async function getStream(ctx: Context, permalink: string): Promise<void> {
  const data = await ctx.unwrap(ctx.client().streams.get(permalink));
  ctx.print(data, () => describe(ctx, data.stream));
}

async function updateStream(
  ctx: Context,
  permalink: string,
  flags: StreamFlags & { archived?: boolean },
): Promise<void> {
  const data = await ctx.unwrap(
    ctx.client().streams.update(permalink, {
      name: flags.name,
      stream_type: flags.streamType as 'transactional' | 'broadcast' | undefined,
      archived: flags.archived,
    }),
  );
  ctx.print(data, () => describe(ctx, data.stream));
}

async function archiveStream(ctx: Context, permalink: string): Promise<void> {
  const data = await ctx.unwrap(ctx.client().streams.archive(permalink));
  ctx.print(data, () => {
    ctx.io.out(`Archived ${data.stream.permalink}; it rejects new messages now`);
  });
}

export function registerStreams(program: Command, deps: CliDeps): void {
  const streams = program.command('streams').description('Manage message streams');

  streams
    .command('list')
    .description('List all message streams of the server')
    .action(action(deps, (ctx) => listStreams(ctx)));

  streams
    .command('get <permalink>')
    .description('Show one stream')
    .action(action(deps, (ctx, permalink: string) => getStream(ctx, permalink)));

  streams
    .command('create')
    .description('Create a message stream')
    .requiredOption('--name <name>', 'display name')
    .option(
      '--permalink <permalink>',
      'URL-safe identifier; derived from the name when omitted',
    )
    .option('--stream-type <type>', 'transactional (default) or broadcast')
    .action(
      action(deps, (ctx, flags: StreamFlags & { name: string }) => createStream(ctx, flags)),
    );

  streams
    .command('update <permalink>')
    .description('Update a stream; only the given fields change')
    .option('--name <name>', 'display name')
    .option('--stream-type <type>', 'transactional or broadcast')
    .option('--archived', 'archive the stream')
    .option('--no-archived', 'unarchive the stream')
    .action(
      action(deps, (ctx, permalink: string, flags: StreamFlags & { archived?: boolean }) =>
        updateStream(ctx, permalink, flags),
      ),
    );

  streams
    .command('archive <permalink>')
    .description('Archive a stream; archived streams reject new messages')
    .action(action(deps, (ctx, permalink: string) => archiveStream(ctx, permalink)));
}
