import { createInterface } from 'node:readline/promises';

import type { Command } from 'commander';

import type { CliDeps, Context } from '../context.js';
import { action } from '../context.js';
import { configPath, readConfig, writeConfig } from '../config.js';
import { CliError } from '../errors.js';

async function promptForKey(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return (await rl.question('Server API key: ')).trim();
  } finally {
    rl.close();
  }
}

async function login(ctx: Context): Promise<void> {
  // `--api-key` / `--base-url` are global options; commander binds them to
  // the root command even when written after `login`.
  let apiKey = ctx.globals.apiKey;
  if (!apiKey) {
    if (!process.stdin.isTTY) {
      throw new CliError(
        'MissingApiKey',
        'No terminal to prompt on — pass the key with --api-key.',
      );
    }
    apiKey = await promptForKey();
    if (!apiKey) {
      throw new CliError('MissingApiKey', 'No API key entered.');
    }
  }

  const config = readConfig();
  config.api_key = apiKey;
  if (ctx.globals.baseUrl !== undefined) {
    config.base_url = ctx.globals.baseUrl;
  }
  writeConfig(config);
  ctx.io.out(`Credentials saved to ${configPath()}`);
}

async function logout(ctx: Context): Promise<void> {
  const config = readConfig();
  delete config.api_key;
  writeConfig(config);
  ctx.io.out(`API key removed from ${configPath()}`);
}

export function registerLogin(program: Command, deps: CliDeps): void {
  program
    .command('login')
    .description(
      'Store an API key in ~/.config/camelmailer/config.json (chmod 600). ' +
        'Pass --api-key/--base-url or answer the prompt.',
    )
    .action(action(deps, (ctx) => login(ctx)));

  program
    .command('logout')
    .description('Remove the stored API key')
    .action(action(deps, (ctx) => logout(ctx)));
}
