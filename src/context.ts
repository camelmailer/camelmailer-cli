import type { Command } from 'commander';

import type { CamelMailerResult } from '@camelmailer/sdk';

import type { CliClient, ClientOverrides } from './client.js';
import { CliError } from './errors.js';
import type { CliIo } from './io.js';
import { renderJson } from './output.js';

/** Dependencies threaded through every command — swapped out in tests. */
export interface CliDeps {
  io: CliIo;
  createClient(overrides?: ClientOverrides): CliClient;
}

/** Global flags read from the root command. */
export interface GlobalOptions {
  json?: boolean;
  apiKey?: string;
  baseUrl?: string;
}

/** Per-invocation state handed to command actions. */
export class Context {
  constructor(
    readonly deps: CliDeps,
    private readonly options: GlobalOptions,
  ) {}

  get io(): CliIo {
    return this.deps.io;
  }

  get json(): boolean {
    return this.options.json === true;
  }

  /** The merged global options (`--json`, `--api-key`, `--base-url`). */
  get globals(): GlobalOptions {
    return this.options;
  }

  client(): CliClient {
    return this.deps.createClient({
      apiKey: this.options.apiKey,
      baseUrl: this.options.baseUrl,
    });
  }

  /** Unwrap an SDK result; API errors become CliErrors with the API code. */
  async unwrap<T>(promise: Promise<CamelMailerResult<T>>): Promise<T> {
    const { data, error } = await promise;
    if (error) throw new CliError(error.code, error.message);
    return data;
  }

  /** Print `data` as JSON when `--json` is set; otherwise call `human()`. */
  print(data: unknown, human: () => void): void {
    if (this.json) {
      this.io.out(renderJson(data));
    } else {
      human();
    }
  }
}

/**
 * Wrap a command action: builds the {@link Context} from the global options
 * and turns thrown {@link CliError}s into stderr output + exit code 1.
 *
 * Commander invokes actions with `(...positionals, options, command)`;
 * the wrapper strips the trailing `command` and forwards the rest.
 */
export function action<A extends unknown[]>(
  deps: CliDeps,
  fn: (ctx: Context, ...args: A) => Promise<void> | void,
): (...args: unknown[]) => Promise<void> {
  return async (...all) => {
    const command = all[all.length - 1] as Command;
    const args = all.slice(0, -1) as A;
    const ctx = new Context(deps, command.optsWithGlobals<GlobalOptions>());
    try {
      await fn(ctx, ...args);
    } catch (error) {
      if (error instanceof CliError) {
        deps.io.err(`Error [${error.code}]: ${error.message}`);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        deps.io.err(`Error [UnexpectedError]: ${message}`);
      }
      deps.io.setExitCode(1);
    }
  };
}
