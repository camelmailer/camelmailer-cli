#!/usr/bin/env node
import { CommanderError } from 'commander';

import { buildProgram } from './program.js';

const program = buildProgram();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof CommanderError) {
    // Help/version display exits with 0; usage errors with their code.
    process.exitCode = error.exitCode;
  } else {
    throw error;
  }
}
