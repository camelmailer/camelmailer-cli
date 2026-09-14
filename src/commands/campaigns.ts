import type { Command } from 'commander';

import type { Campaign } from '@camelmailer/sdk';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { renderKeyValues, renderTable } from '../output.js';
import { parseId } from '../parse.js';

interface CreateFlags {
  stream: string;
  from: string;
  name?: string;
  subject?: string;
  html?: string;
  text?: string;
  scheduledAt?: string;
}

interface SendNowFlags {
  name: string;
  from?: string;
  subject?: string;
  html?: string;
  text?: string;
}

interface UpdateFlags {
  name?: string;
  from?: string;
  subject?: string;
  html?: string;
  text?: string;
  scheduledAt?: string;
  clearSchedule?: boolean;
}

const COLUMNS = ['ID', 'NAME', 'STATUS', 'STREAM', 'SENT', 'TOTAL', 'SCHEDULED'] as const;

function row(campaign: Campaign): unknown[] {
  return [
    campaign.id,
    campaign.name,
    campaign.status,
    campaign.stream?.permalink,
    campaign.sent,
    campaign.total,
    campaign.scheduled_at,
  ];
}

async function listCampaigns(ctx: Context, flags: { stream?: string }): Promise<void> {
  const client = ctx.client();
  const data = await ctx.unwrap(
    flags.stream ? client.campaigns.listForStream(flags.stream) : client.campaigns.list(),
  );
  ctx.print(data, () => {
    ctx.io.out(renderTable([...COLUMNS], data.campaigns.map(row)));
  });
}

async function getCampaign(ctx: Context, rawId: string): Promise<void> {
  const id = parseId(rawId);
  const data = await ctx.unwrap(ctx.client().campaigns.get(id));
  ctx.print(data, () => {
    const c = data.campaign;
    ctx.io.out(
      renderKeyValues([
        ['ID', c.id],
        ['Name', c.name],
        ['Status', c.status],
        ['Stream', c.stream?.permalink],
        ['From', c.from],
        ['Subject', c.subject],
        ['Scheduled', c.scheduled_at],
        ['Created', c.created_at],
        ['Completed', c.completed_at],
      ]),
    );
    ctx.io.out('');
    ctx.io.out(
      renderTable(
        ['TOTAL', 'SENT', 'DELIVERED', 'FAILED', 'OPENED', 'CLICKED', 'UNSUBSCRIBED'],
        [
          [
            data.stats.total,
            data.stats.sent,
            data.stats.delivered,
            data.stats.failed,
            data.stats.opened,
            data.stats.clicked,
            data.stats.unsubscribed,
          ],
        ],
      ),
    );
  });
}

async function createDraft(ctx: Context, flags: CreateFlags): Promise<void> {
  const data = await ctx.unwrap(
    ctx.client().campaigns.createDraft({
      stream: flags.stream,
      from: flags.from,
      name: flags.name,
      subject: flags.subject,
      html_body: flags.html,
      text_body: flags.text,
      scheduled_at: flags.scheduledAt,
    }),
  );
  ctx.print(data, () => {
    ctx.io.out(`Created campaign ${data.campaign.id} (${data.campaign.status})`);
  });
}

async function createAndSend(ctx: Context, permalink: string, flags: SendNowFlags): Promise<void> {
  const data = await ctx.unwrap(
    ctx.client().campaigns.createAndSend(permalink, {
      name: flags.name,
      from: flags.from,
      subject: flags.subject,
      html_body: flags.html,
      text_body: flags.text,
    }),
  );
  ctx.print(data, () => {
    ctx.io.out(`Created campaign ${data.campaign.id} and started sending to ${permalink}`);
  });
}

async function updateCampaign(ctx: Context, rawId: string, flags: UpdateFlags): Promise<void> {
  const id = parseId(rawId);
  const data = await ctx.unwrap(
    ctx.client().campaigns.update(id, {
      name: flags.name,
      from: flags.from,
      subject: flags.subject,
      html_body: flags.html,
      text_body: flags.text,
      // An omitted field leaves the schedule standing; only an explicit
      // null clears it, which is what --clear-schedule sends.
      ...(flags.clearSchedule
        ? { scheduled_at: null }
        : flags.scheduledAt !== undefined
          ? { scheduled_at: flags.scheduledAt }
          : {}),
    }),
  );
  ctx.print(data, () => {
    ctx.io.out(`Campaign ${data.campaign.id} is now ${data.campaign.status}`);
  });
}

async function sendCampaign(ctx: Context, rawId: string): Promise<void> {
  const id = parseId(rawId);
  const data = await ctx.unwrap(ctx.client().campaigns.send(id));
  ctx.print(data, () => {
    ctx.io.out(`Campaign ${data.campaign.id} is now ${data.campaign.status}`);
  });
}

async function cancelCampaign(ctx: Context, rawId: string): Promise<void> {
  const id = parseId(rawId);
  const data = await ctx.unwrap(ctx.client().campaigns.cancel(id));
  ctx.print(data, () => {
    ctx.io.out(`Campaign ${data.campaign.id} is now ${data.campaign.status}`);
  });
}

export function registerCampaigns(program: Command, deps: CliDeps): void {
  const campaigns = program.command('campaigns').description('Plan and send broadcast campaigns');

  campaigns
    .command('list')
    .description('List campaigns, newest first')
    .option('--stream <permalink>', 'only the campaigns of one broadcast stream')
    .action(action(deps, (ctx, flags: { stream?: string }) => listCampaigns(ctx, flags)));

  campaigns
    .command('get <id>')
    .description('Show one campaign with its statistics')
    .action(action(deps, (ctx, id: string) => getCampaign(ctx, id)));

  campaigns
    .command('create')
    .description('Write a campaign without sending it')
    .requiredOption('--stream <permalink>', 'the broadcast stream to send to')
    .requiredOption('--from <address>', 'sender address (verified domain)')
    .option('--name <name>', 'display name')
    .option('--subject <subject>', 'message subject')
    .option('--html <html>', 'HTML body')
    .option('--text <text>', 'plain-text body')
    .option('--scheduled-at <time>', 'RFC 3339 send time; schedules the campaign')
    .action(action(deps, (ctx, flags: CreateFlags) => createDraft(ctx, flags)));

  campaigns
    .command('send-now <stream>')
    .description('Create a campaign and send it to the stream immediately')
    .requiredOption('--name <name>', 'display name')
    .option('--from <address>', 'sender address (verified domain)')
    .option('--subject <subject>', 'message subject')
    .option('--html <html>', 'HTML body')
    .option('--text <text>', 'plain-text body')
    .action(
      action(deps, (ctx, stream: string, flags: SendNowFlags) =>
        createAndSend(ctx, stream, flags),
      ),
    );

  campaigns
    .command('update <id>')
    .description('Edit a draft or scheduled campaign')
    .option('--name <name>', 'display name')
    .option('--from <address>', 'sender address')
    .option('--subject <subject>', 'message subject')
    .option('--html <html>', 'HTML body')
    .option('--text <text>', 'plain-text body')
    .option('--scheduled-at <time>', 'RFC 3339 send time')
    .option('--clear-schedule', 'drop the schedule, returning the campaign to a draft')
    .action(action(deps, (ctx, id: string, flags: UpdateFlags) => updateCampaign(ctx, id, flags)))
    .addHelpText(
      'after',
      '\nA campaign that is already sending cannot be edited.',
    );

  campaigns
    .command('send <id>')
    .description('Send a campaign now, whatever its schedule said')
    .action(action(deps, (ctx, id: string) => sendCampaign(ctx, id)));

  campaigns
    .command('cancel <id>')
    .description('Cancel a scheduled or in-flight campaign')
    .action(action(deps, (ctx, id: string) => cancelCampaign(ctx, id)));
}
