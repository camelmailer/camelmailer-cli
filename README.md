# Camelmailer CLI

[![CI](https://github.com/camelmailer/camelmailer-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/camelmailer/camelmailer-cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40camelmailer%2Fcli.svg)](https://www.npmjs.com/package/@camelmailer/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Camelmailer](https://camelmailer.com) from your terminal — send and inspect transactional email. Works with the Camelmailer cloud and any self-hosted instance.

## Install

```bash
npm install -g @camelmailer/cli
```

## Quickstart

```bash
camelmailer login                       # stores the key in ~/.config/camelmailer/config.json (600)
camelmailer ping                        # validate the key
camelmailer emails send \
  --from billing@acme.com \
  --to ada@example.com \
  --subject "Your receipt" \
  --html "<p>Thanks for your purchase.</p>"
```

Credentials resolve as flags → environment → config file:

```bash
export CAMELMAILER_API_KEY=cm_xxxx
export CAMELMAILER_BASE_URL=https://mail.example.com   # self-hosted; defaults to the cloud
# or per invocation:
camelmailer --api-key cm_xxxx --base-url https://mail.example.com ping
```

## Commands

### Send

```bash
# direct body
camelmailer emails send --from billing@acme.com --to ada@example.com \
  --subject Hi --text "Hello!" --tag welcome --stream broadcasts

# stored template + variables
camelmailer emails send --from billing@acme.com --to ada@example.com \
  --template welcome --model '{"name":"Ada"}'
```

`--to`, `--cc`, `--bcc` and `--reply-to` accept multiple addresses.

### Inspect messages

```bash
camelmailer emails list --scope outgoing --status HardFail --page 2
camelmailer emails list --tag receipt --query ada
camelmailer emails get 42
```

### Templates

```bash
camelmailer templates list
camelmailer templates get welcome
camelmailer templates render welcome --model '{"name":"Ada"}'   # preview, no send
```

### Everything else

```bash
camelmailer streams list
camelmailer stats --from 2026-07-01 --to 2026-07-11
camelmailer bounces list
camelmailer dmarc summary --domain acme.com
camelmailer ping
```

## JSON output

Every command prints a compact table by default; add `--json` for the raw API payload — ideal for piping into `jq`:

```bash
camelmailer --json emails list --status HardFail | jq '.messages[].rcpt_to'
```

## Errors & exit codes

Failures print `Error [Code]: message` to stderr and exit non-zero. Codes are the stable Camelmailer API codes (`Unauthorized`, `NotFound`, `ValidationError`, …) plus CLI-local ones (`MissingApiKey`, `MissingBody`, `InvalidJson`).

```bash
camelmailer emails get 999999 || echo "exit $?"
# Error [NotFound]: no such message
# exit 1
```

## Docs

Full API reference: [camelmailer.com/docs](https://camelmailer.com/docs) · SDK: [camelmailer-node](https://github.com/camelmailer/camelmailer-node)

## License

[MIT](LICENSE)
