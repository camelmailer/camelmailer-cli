import { Command } from 'commander';

import { createClient } from './client.js';
import { registerBounces } from './commands/bounces.js';
import { registerDmarc } from './commands/dmarc.js';
import { registerEmails } from './commands/emails.js';
import { registerLogin } from './commands/login.js';
import { registerPing } from './commands/ping.js';
import { registerStats } from './commands/stats.js';
import { registerStreams } from './commands/streams.js';
import { registerTemplates } from './commands/templates.js';
import type { CliDeps } from './context.js';
import { defaultIo } from './io.js';
import { VERSION } from './version.js';

/**
 * Build the `camelmailer` command tree. Dependencies (output sink, SDK
 * client factory) are injectable so tests can run commands in-process.
 */
export function buildProgram(deps: Partial<CliDeps> = {}): Command {
  const resolved: CliDeps = {
    io: deps.io ?? defaultIo,
    createClient: deps.createClient ?? createClient,
  };

  const program = new Command();
  program
    .name('@camelmailer/sdk')
    .description('CamelMailer from your terminal — send and inspect transactional email')
    .version(VERSION)
    .option('--json', 'print raw JSON instead of tables')
    .option('--api-key <key>', 'server API key (overrides env and config file)')
    .option('--base-url <url>', 'instance base URL, e.g. https://mail.example.com')
    .exitOverride()
    .configureOutput({
      writeOut: (text) => resolved.io.out(text.replace(/\n$/, '')),
      writeErr: (text) => resolved.io.err(text.replace(/\n$/, '')),
    });

  registerEmails(program, resolved);
  registerTemplates(program, resolved);
  registerStreams(program, resolved);
  registerStats(program, resolved);
  registerBounces(program, resolved);
  registerDmarc(program, resolved);
  registerPing(program, resolved);
  registerLogin(program, resolved);

  return program;
}
