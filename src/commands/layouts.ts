import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { CliError } from '../errors.js';
import { renderKeyValues, renderTable } from '../output.js';

/** MIME types the logo endpoint accepts, by file extension. */
const LOGO_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/** Read an image file into the `data:` URL the endpoint expects. */
function toDataUrl(file: string): string {
  const type = LOGO_TYPES[path.extname(file).toLowerCase()];
  if (!type) {
    throw new CliError(
      'UnsupportedFile',
      `Cannot tell the image type of "${file}". Use one of: ${Object.keys(LOGO_TYPES).join(', ')}.`,
    );
  }
  let bytes: Buffer;
  try {
    bytes = readFileSync(file);
  } catch {
    throw new CliError('FileNotFound', `Could not read "${file}".`);
  }
  return `data:${type};base64,${bytes.toString('base64')}`;
}

async function listLayouts(ctx: Context): Promise<void> {
  const data = await ctx.unwrap(ctx.client().layouts.list());
  ctx.print(data, () => {
    ctx.io.out(
      renderTable(
        ['ID', 'NAME', 'PERMALINK', 'TEXT WRAPPER'],
        data.layouts.map((l) => [l.id, l.name, l.permalink, l.text_wrapper ? 'yes' : 'no']),
      ),
    );
  });
}

async function getLayout(ctx: Context, permalink: string): Promise<void> {
  const data = await ctx.unwrap(ctx.client().layouts.get(permalink));
  ctx.print(data, () => {
    ctx.io.out(
      renderKeyValues([
        ['ID', data.layout.id],
        ['Name', data.layout.name],
        ['Permalink', data.layout.permalink],
      ]),
    );
    ctx.io.out('');
    ctx.io.out(data.layout.html_wrapper);
  });
}

interface LayoutFlags {
  name?: string;
  permalink?: string;
  html?: string;
  text?: string;
}

async function createLayout(ctx: Context, flags: LayoutFlags & { name: string }): Promise<void> {
  if (flags.html === undefined) {
    throw new CliError(
      'MissingOption',
      '--html is required; it has to embed the body with {{{ content }}}.',
    );
  }
  const data = await ctx.unwrap(
    ctx.client().layouts.create({
      name: flags.name,
      permalink: flags.permalink,
      html_wrapper: flags.html,
      text_wrapper: flags.text,
    }),
  );
  ctx.print(data, () => {
    ctx.io.out(`Created layout ${data.layout.permalink}`);
  });
}

async function updateLayout(
  ctx: Context,
  permalink: string,
  flags: LayoutFlags,
): Promise<void> {
  const data = await ctx.unwrap(
    ctx.client().layouts.update(permalink, {
      name: flags.name,
      html_wrapper: flags.html,
      text_wrapper: flags.text,
    }),
  );
  ctx.print(data, () => {
    ctx.io.out(`Updated layout ${data.layout.permalink}`);
  });
}

async function deleteLayout(ctx: Context, permalink: string): Promise<void> {
  const data = await ctx.unwrap(ctx.client().layouts.delete(permalink));
  ctx.print(data, () => {
    ctx.io.out(
      data.deleted
        ? `Deleted layout ${permalink}; templates that used it fall back to no wrapper`
        : `Layout ${permalink} was not found`,
    );
  });
}

async function uploadLogo(ctx: Context, permalink: string, file: string): Promise<void> {
  // Read and encode before touching the network client.
  const dataUrl = toDataUrl(file);
  const data = await ctx.unwrap(ctx.client().layouts.uploadLogo(permalink, dataUrl));
  ctx.print(data, () => {
    ctx.io.out(data.url);
  });
}

export function registerLayouts(program: Command, deps: CliDeps): void {
  const layouts = program
    .command('layouts')
    .description('Manage the wrappers shared by templates');

  layouts
    .command('list')
    .description('List all layouts of the server')
    .action(action(deps, (ctx) => listLayouts(ctx)));

  layouts
    .command('get <permalink>')
    .description('Show one layout with its HTML wrapper')
    .action(action(deps, (ctx, permalink: string) => getLayout(ctx, permalink)));

  layouts
    .command('create')
    .description('Create a layout')
    .requiredOption('--name <name>', 'display name')
    .option('--permalink <permalink>', 'URL-safe identifier; derived from the name when omitted')
    .requiredOption('--html <html>', 'HTML wrapper; has to embed the body with {{{ content }}}')
    .option('--text <text>', 'plain-text wrapper')
    .action(
      action(deps, (ctx, flags: LayoutFlags & { name: string }) => createLayout(ctx, flags)),
    );

  layouts
    .command('update <permalink>')
    .description('Update a layout; only the given fields change')
    .option('--name <name>', 'display name')
    .option('--html <html>', 'HTML wrapper')
    .option('--text <text>', 'plain-text wrapper')
    .action(
      action(deps, (ctx, permalink: string, flags: LayoutFlags) =>
        updateLayout(ctx, permalink, flags),
      ),
    );

  layouts
    .command('delete <permalink>')
    .description('Delete a layout')
    .action(action(deps, (ctx, permalink: string) => deleteLayout(ctx, permalink)));

  layouts
    .command('upload-logo <permalink> <file>')
    .description('Upload the layout logo and print the URL to reference from the wrapper')
    .action(
      action(deps, (ctx, permalink: string, file: string) => uploadLogo(ctx, permalink, file)),
    );
}
