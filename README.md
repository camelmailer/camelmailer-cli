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

`--idempotency-key` makes a send replayable: the same key with the same body
returns the first result instead of sending twice, and a different body under
the same key is refused with `InvalidIdempotentRequest`.

```bash
camelmailer emails send --from billing@acme.com --to ada@example.com \
  --text "Your receipt" --idempotency-key "order-4711"
```

### Broadcast to a stream

```bash
camelmailer emails send-to-stream newsletter \
  --from news@acme.com --subject September --text "What shipped this month."
```

Recipients past the per-request cap of 1000 come back as skipped, so a larger
audience wants a campaign.

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

### Campaigns

A campaign is content plus an audience. The two ways to create one behave
differently, so pick deliberately: `create` writes it and waits, `send-now`
expands it to the stream's subscribers before the command returns.

```bash
# Write it and leave it alone. Without --scheduled-at it stays a draft.
camelmailer campaigns create --stream newsletter --from news@acme.com \
  --name September --subject "What shipped" --text "Hello."

# Goes out on the spot, no draft and no schedule.
camelmailer campaigns send-now newsletter --name "Status update" \
  --from news@acme.com --text "All clear."

camelmailer campaigns list
camelmailer campaigns list --stream newsletter
camelmailer campaigns get 7                      # with statistics
camelmailer campaigns update 7 --scheduled-at 2026-10-01T08:00:00Z
camelmailer campaigns update 7 --clear-schedule  # back to a draft
camelmailer campaigns send 7                     # now, whatever the schedule said
camelmailer campaigns cancel 7
```

### Subscribers

A broadcast send to an address that is not subscribed is refused, so this
list is the audience.

```bash
camelmailer subscribers list newsletter
camelmailer subscribers add newsletter ada@example.com
camelmailer subscribers import newsletter ada@example.com grace@example.com
camelmailer subscribers complaint newsletter ada@example.com   # suppress + unsubscribe
camelmailer subscribers remove newsletter ada@example.com
```

### Streams and layouts

```bash
camelmailer streams list
camelmailer streams create --name Broadcasts --permalink broadcasts --stream-type broadcast
camelmailer streams get broadcasts
camelmailer streams update broadcasts --name Newsletter
camelmailer streams archive broadcasts

camelmailer layouts list
camelmailer layouts create --name Default --permalink default \
  --html '<html><body>{{{ content }}}</body></html>'
camelmailer layouts upload-logo default ./logo.png    # prints the URL to reference
camelmailer layouts delete default
```

### Inbound, held mail and logs

```bash
camelmailer inbound list --status held
camelmailer inbound retry 55     # back on the delivery queue
camelmailer inbound bypass 55    # release past the hold

camelmailer logs list --status 4xx
camelmailer logs tags
```

### Everything else

```bash
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
