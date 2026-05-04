# TriadFit Google Sheet Schema

## Purpose
This Sheet is the no-code operational control panel and log surface.

It should not store:
- API keys
- provider secrets
- operator alert recipient configuration

Those live in Apps Script configuration only.

## Tab 1: `controls`

Use a simple key/value structure.

| key | value | notes |
|---|---|---|
| `webinar_mode` | `open \| waitlist_full \| paused_unavailable` | controls webinar state |
| `primary_routing_enabled` | `true \| false` | allows MailerLite routing |
| `fallback_routing_enabled` | `true \| false` | allows Brevo fallback |
| `operator_alerts_enabled` | `true \| false` | enables email alerts |
| `capture_paused_global` | `true \| false` | hard pause all capture |
| `capture_paused_webinar` | `true \| false` | pause webinar only |
| `capture_paused_resources` | `true \| false` | pause resource capture only |

## Tab 2: `submission_log`

Each processed submission should append one row.

| timestamp | event_id | email | form_type | conversion_type | conversion_asset | goal_key | primary_attempted | primary_result | fallback_attempted | fallback_result | final_state | visitor_message_variant |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Suggested `final_state` values:
- `accepted`
- `waitlist`
- `paused`
- `hard_stop`

Suggested `primary_result` / `fallback_result` values:
- `accepted`
- `rejected`
- `error`
- `skipped`

## Tab 3: `ops_notes` (optional)

Optional human-readable instructions for the client/operator:
- what each toggle does
- when to use `waitlist_full`
- when to use `paused_unavailable`
- what happens if capture is paused

## Operator Usage Rules
- Use the Sheet only for operational toggles and log visibility.
- Do not use the Sheet as a CMS.
- Do not edit the `submission_log` manually unless fixing clear operator mistakes.
