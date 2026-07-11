import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { renderKeyValues, renderTable } from '../output.js';

interface SummaryFlags {
  domain?: string;
  from?: string;
  to?: string;
}

async function dmarcSummary(ctx: Context, flags: SummaryFlags): Promise<void> {
  const data = await ctx.unwrap(
    ctx.client().dmarc.summary({ domain: flags.domain, from: flags.from, to: flags.to }),
  );
  ctx.print(data, () => {
    const s = data.summary;
    ctx.io.out(
      renderKeyValues([
        ['Messages', s.total],
        ['Pass', s.pass],
        ['Fail', s.fail],
        ['Pass rate', `${(s.pass_rate * 100).toFixed(1)}%`],
      ]),
    );
    if (s.by_source.length > 0) {
      ctx.io.out('');
      ctx.io.out(
        renderTable(
          ['SOURCE IP', 'COUNT', 'SPF ALIGNED', 'DKIM ALIGNED'],
          s.by_source.map((source) => [
            source.source_ip,
            source.count,
            `${source.spf_aligned_pct.toFixed(1)}%`,
            `${source.dkim_aligned_pct.toFixed(1)}%`,
          ]),
        ),
      );
    }
  });
}

export function registerDmarc(program: Command, deps: CliDeps): void {
  const dmarc = program.command('dmarc').description('DMARC monitoring');

  dmarc
    .command('summary')
    .description('DMARC compliance summary over the stored aggregate reports')
    .option('--domain <domain>', 'limit to one domain')
    .option('--from <iso8601>', 'report window start')
    .option('--to <iso8601>', 'report window end')
    .action(action(deps, (ctx, flags: SummaryFlags) => dmarcSummary(ctx, flags)));
}
