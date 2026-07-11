/** Injectable stdout/stderr/exit-code sink — swapped out in tests. */
export interface CliIo {
  out(text: string): void;
  err(text: string): void;
  setExitCode(code: number): void;
}

export const defaultIo: CliIo = {
  out: (text) => process.stdout.write(`${text}\n`),
  err: (text) => process.stderr.write(`${text}\n`),
  setExitCode: (code) => {
    process.exitCode = code;
  },
};
