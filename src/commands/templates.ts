import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { renderKeyValues, renderTable } from '../output.js';
import { parseJsonObject } from '../parse.js';

async function listTemplates(ctx: Context): Promise<void> {
  const data = await ctx.unwrap(ctx.client().templates.list());
  ctx.print(data, () => {
    ctx.io.out(
      renderTable(
        ['ID', 'NAME', 'PERMALINK', 'SUBJECT', 'ARCHIVED'],
        data.templates.map((t) => [t.id, t.name, t.permalink, t.subject, t.archived]),
      ),
    );
  });
}

async function getTemplate(ctx: Context, permalink: string): Promise<void> {
  const data = await ctx.unwrap(ctx.client().templates.get(permalink));
  ctx.print(data, () => {
    const t = data.template;
    ctx.io.out(
      renderKeyValues([
        ['ID', t.id],
        ['Name', t.name],
        ['Permalink', t.permalink],
        ['Subject', t.subject],
        ['Archived', t.archived],
      ]),
    );
    if (t.text_body) {
      ctx.io.out('');
      ctx.io.out('--- text_body ---');
      ctx.io.out(t.text_body);
    }
    if (t.html_body) {
      ctx.io.out('');
      ctx.io.out('--- html_body ---');
      ctx.io.out(t.html_body);
    }
  });
}

async function renderTemplate(ctx: Context, permalink: string, flags: { model?: string }) {
  const model = flags.model ? parseJsonObject(flags.model, '--model') : {};
  const data = await ctx.unwrap(ctx.client().templates.render(permalink, model));
  ctx.print(data, () => {
    const r = data.rendered;
    ctx.io.out(renderKeyValues([['Subject', r.subject]]));
    if (r.text_body) {
      ctx.io.out('');
      ctx.io.out('--- text_body ---');
      ctx.io.out(r.text_body);
    }
    if (r.html_body) {
      ctx.io.out('');
      ctx.io.out('--- html_body ---');
      ctx.io.out(r.html_body);
    }
  });
}

export function registerTemplates(program: Command, deps: CliDeps): void {
  const templates = program.command('templates').description('Manage stored message templates');

  templates
    .command('list')
    .description('List all templates of the server')
    .action(action(deps, (ctx) => listTemplates(ctx)));

  templates
    .command('get <permalink>')
    .description('Show one template including its bodies')
    .action(action(deps, (ctx, permalink: string) => getTemplate(ctx, permalink)));

  templates
    .command('render <permalink>')
    .description('Preview a template rendered against a JSON model (no send)')
    .option('--model <json>', 'JSON object with template variables')
    .action(
      action(deps, (ctx, permalink: string, flags: { model?: string }) =>
        renderTemplate(ctx, permalink, flags),
      ),
    );
}
