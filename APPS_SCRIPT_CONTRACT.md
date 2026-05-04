# TriadFit Apps Script Contract

## Purpose
One unified submission endpoint for:
- webinar registration
- webinar waitlist
- resource download gates

The Apps Script layer is responsible for:
- validating payloads
- reading operational toggles from Google Sheets
- routing to MailerLite primary
- routing to Brevo fallback when allowed
- logging events to Google Sheets
- sending operator email alerts when required
- returning a normalized response to the frontend

## Endpoint Model
- Method: `POST`
- Content type: `application/json`
- One unified endpoint only

## Request Payload
```json
{
  "form_type": "webinar|resource",
  "conversion_type": "webinar_registration|webinar_waitlist|resource_download",
  "conversion_asset": "webinar_main|resource_starter_kit|resource_first_steps_checklist|resource_mental_load_guide",
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "phone": "+91 98765 43210",
  "goal_key": "sustainable_fat_loss",
  "goal_label": "Sustainable fat loss",
  "educational_updates_opt_in": true,
  "page_path": "/resource-starter-kit.html",
  "user_agent": "browser user agent",
  "submitted_at": "2026-05-01T12:00:00.000Z"
}
```

## Field Rules
- `form_type` is required
- `conversion_type` is required
- `conversion_asset` is required
- `name` is required
- `email` is required
- `goal_key` is required
- `goal_label` is required
- `phone` is required for webinar, optional for resources
- `educational_updates_opt_in` is only relevant to resources

## Canonical Goal Keys
- `sustainable_fat_loss`
- `better_eating_habits`
- `higher_energy_and_consistency`
- `hormone_friendly_nutrition`
- `postpartum_wellness`

## Server-Side Validation And Mapping
- Accept normalized internal values from the frontend.
- Validate all enums.
- Defensively map known labels to canonical keys if needed.
- Reject unknown values with a stable error response.

## Response Contract
```json
{
  "ok": true,
  "submission_state": "accepted|waitlist|paused|hard_stop",
  "visitor_message": "string",
  "access_unlocked": true,
  "waitlist_mode": false,
  "contact_path": "primary|fallback",
  "event_id": "optional-log-id"
}
```

## Response Semantics
- `accepted`
  - normal webinar registration or resource capture
- `waitlist`
  - webinar full, but waitlist accepted
- `paused`
  - capture intentionally paused
- `hard_stop`
  - no successful route available

## Visitor-Facing Copy Rules
- Webinar open:
  - normal registration flow
- Webinar full:
  - visible waitlist flow
- Webinar degraded but fallback works:
  - normal-looking registration
- Resource normal:
  - normal gate flow
- Resource fallback but works:
  - normal gate flow
- Webinar hard-stop:
  - `We’re unable to accept registrations at the moment. Please try again later, or contact us at contact@triadfit.in if this is urgent.`
- Resource hard-stop:
  - `We’re unable to deliver this resource at the moment. Please try again later.`

## Audience Update Rules
- One person per email
- Update existing contact rather than creating duplicates
- Overwrite `goal` with latest submitted value
- Overwrite `phone` only when a new non-empty phone is provided
- Preserve first-touch fields once set
- Always update last-touch fields

## Custom Fields
- `phone`
- `goal`
- `first_conversion_type`
- `first_conversion_asset`
- `last_conversion_type`
- `last_conversion_asset`
- `educational_updates_opt_in`

## Tagging Model
Use tags for source and state, not for operational plumbing.

Suggested tags:
- `webinar_registered`
- `webinar_waitlist`
- `resource_starter_kit`
- `resource_first_steps_checklist`
- `resource_mental_load_guide`
- `consent_educational_updates`

## Operational Alerts
Send operator alert when:
- MailerLite primary fails
- Brevo fallback is triggered
- both primary and fallback fail
- capture is attempted while paused

Operator recipients live in Apps Script configuration, not in the Sheet.
