# TriadFit Apps Script Web App

This folder contains the first live integration layer for:
- webinar registration
- webinar waitlist
- resource gate capture

It is designed to work with:
- `MailerLite` as primary
- `Brevo` as fallback
- `Google Sheets` as the no-code operator control panel

## Files
- [Code.gs](/Users/blaknwhite/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/TriadFit/apps-script/Code.gs)
- [appsscript.json](/Users/blaknwhite/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/TriadFit/apps-script/appsscript.json)

## What this script does
- exposes one `doPost` endpoint
- validates the normalized TriadFit payload
- reads controls from the `controls` sheet
- routes to MailerLite first
- falls back to Brevo if enabled and needed
- logs every submission to `submission_log`
- sends operator email alerts when configured

## Required Google Sheet
Create the sheet exactly as described in:
- [GOOGLE_SHEET_SCHEMA.md](/Users/blaknwhite/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/TriadFit/GOOGLE_SHEET_SCHEMA.md)

You already completed this step, so the next requirement is the sheet ID.

## Required Script Properties
Set these in `Project Settings -> Script properties`.

### Required
- `TRIADFIT_SHEET_ID`
- `MAILERLITE_API_KEY`
- `BREVO_API_KEY`

### Required JSON mappings
- `MAILERLITE_GROUP_IDS_JSON`
- `BREVO_LIST_IDS_JSON`

### Optional
- `OPERATOR_ALERT_EMAILS`

## Example property values

### `MAILERLITE_GROUP_IDS_JSON`
```json
{
  "webinar_registered": "12345678901234567",
  "webinar_waitlist": "22345678901234567",
  "resource_starter_kit": "32345678901234567",
  "resource_first_steps_checklist": "42345678901234567",
  "resource_mental_load_guide": "52345678901234567",
  "consent_educational_updates": "62345678901234567"
}
```

### `BREVO_LIST_IDS_JSON`
```json
{
  "webinar_registered": 11,
  "webinar_waitlist": 12,
  "resource_starter_kit": 21,
  "resource_first_steps_checklist": 22,
  "resource_mental_load_guide": 23,
  "consent_educational_updates": 31
}
```

## Required provider-side setup

### MailerLite
Create custom fields matching these keys:
- `phone`
- `goal`
- `first_conversion_type`
- `first_conversion_asset`
- `last_conversion_type`
- `last_conversion_asset`
- `educational_updates_opt_in`

Create groups for:
- `webinar_registered`
- `webinar_waitlist`
- `resource_starter_kit`
- `resource_first_steps_checklist`
- `resource_mental_load_guide`
- `consent_educational_updates`

Reference:
- [MailerLite Subscribers API](https://developers.mailerlite.com/docs/subscribers)

### Brevo
Create contact attributes in uppercase:
- `NAME`
- `PHONE`
- `GOAL`
- `FIRST_CONVERSION_TYPE`
- `FIRST_CONVERSION_ASSET`
- `LAST_CONVERSION_TYPE`
- `LAST_CONVERSION_ASSET`
- `EDUCATIONAL_UPDATES_OPT_IN`

Create lists corresponding to the JSON map above.

Reference:
- [Brevo Create Contact API](https://developers.brevo.com/reference/create-contact)

## Deployment steps
1. Open [script.new](https://script.new/) while signed into the client-owned Google account.
2. Replace the default files with the contents of this folder.
3. Set the script properties listed above.
4. Deploy as `Web app`.
5. Execute as:
   - `Me`
6. Who has access:
   - `Anyone`

## Testing order
1. `GET` the deployed URL to confirm the service is alive.
2. `POST` one resource payload.
3. Confirm:
   - row appended to `submission_log`
   - MailerLite contact created or updated
4. Disable `primary_routing_enabled` in the sheet.
5. `POST` another test submission.
6. Confirm:
   - Brevo fallback handled it
   - operator alert sent if enabled

## Important caveat before frontend hookup
The current frontend plan calls Apps Script directly from the browser. Before wiring `script.js` to the deployed web app, verify that your final hosting setup can call the Apps Script URL successfully from the browser. If cross-origin restrictions block direct `fetch`, use a proxy layer or a same-origin host step before trying to force the frontend integration.
