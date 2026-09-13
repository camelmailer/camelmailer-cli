import { CommanderError } from 'commander';

import type { CamelMailerResult } from '@camelmailer/sdk';

import type { CliClient } from '../../src/client.js';
import { buildProgram } from '../../src/program.js';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** A successful SDK result envelope. */
export function ok<T>(data: T): Promise<CamelMailerResult<T>> {
  return Promise.resolve({ data, error: null });
}

/** A failed SDK result envelope carrying a CamelMailerError-shaped error. */
export function apiError(
  code: string,
  message: string,
  statusCode: number | null = 422,
): Promise<CamelMailerResult<never>> {
  return Promise.resolve({
    data: null,
    error: Object.assign(new Error(message), { code, statusCode }) as never,
  });
}

/**
 * Run the CLI in-process against a (partial) fake SDK client and capture
 * stdout, stderr and the exit code.
 */
export async function runCli(
  argv: string[],
  client: Partial<CliClient> = {},
): Promise<RunResult> {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode = 0;

  const program = buildProgram({
    io: {
      out: (text) => out.push(text),
      err: (text) => err.push(text),
      setExitCode: (code) => {
        exitCode = code;
      },
    },
    createClient: () => client as CliClient,
  });

  try {
    await program.parseAsync(argv, { from: 'user' });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (exitCode === 0) exitCode = error.exitCode;
    } else {
      throw error;
    }
  }

  return { stdout: out.join('\n'), stderr: err.join('\n'), exitCode };
}
