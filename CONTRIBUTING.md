# Contributing

## Setup

```bash
npm install
```

Node.js >= 20 required. `npm install` builds the `camelmailer` SDK dependency
from source once (see `scripts/ensure-camelmailer-dist.mjs`) — this shim goes
away when the SDK is published to npm.

## Commands

```bash
npm test            # unit tests (vitest, mocked SDK — no network)
npm run test:watch  # watch mode
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/cli.js
node dist/cli.js    # run the built binary
```

To run the integration suite against a real instance:

```bash
CAMELMAILER_API_KEY=cm_xxx CAMELMAILER_BASE_URL=https://mail.example.com npm test
```

## Conventions

- Test-driven: every command route and error path is covered by an
  in-process test against a fake SDK client (`test/helpers/run.ts`).
- Commands only talk to the SDK through the structural `CliClient` type.
- Human output is compact tables / key-value blocks; `--json` always prints
  the untouched API payload.
- Errors go to stderr as `Error [Code]: message` and set exit code 1.
- Bump `src/version.ts` together with `package.json`, and keep
  `CHANGELOG.md` (Keep a Changelog) up to date.
