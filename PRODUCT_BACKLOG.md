# TriadFit Product Backlog

## Locked Direction
- Brand-led site with webinar as primary CTA and resources as soft conversion.
- Warm premium coaching brand with clinical discipline underneath.
- Warm Spring palette as emotional reference, translated into a controlled web system.
- Resources architecture: one flagship lead magnet plus two supporting resources.
- Resources UX: hub page plus sub-pages with preview-first gate and simulated access state.
- Team page remains trust-first with subtle webinar CTA only.

## Locked Integration Architecture
- `MailerLite` is the primary system of record.
- `Brevo` is fallback only on primary failure or limit.
- One unified audience model with segmentation for webinar and resources.
- `Google Apps Script` is the middleware layer.
- `Google Sheet` is the no-code operational control panel.
- Frontend sends normalized internal values directly to one unified Apps Script endpoint in v1.
- Apps Script validates, maps, routes, logs, and alerts.

## Milestone 3: Resource Funnel Build

### P1
- Re-theme the shared design system to the locked spring palette and premium-coaching UI direction.
- Rebuild the Resources hub around one flagship and two supporting lead magnets.
- Update the homepage resource section to feature the flagship resource and route to the full hub.
- Create three resource detail stub pages:
  - Flagship starter kit
  - First-step checklist
  - Simplification guide
- Create three post-gate in-page access states.
- Keep shared goal taxonomy identical across webinar and resource gates.

### P2
- Refine team page trust framing so it visually matches the new resource system.
- Add subtler webinar pathways inside resource flows.
- Improve trust/safety framing blocks for educational-only positioning.

### P3
- Implement real form behavior and integration later.
- Replace placeholder team members with final real profiles later.
- Replace stub resource content with clinically reviewed assets later.

## Milestone 4: Integration Foundation

### P1
- Refactor all forms to submit normalized internal values rather than presentation labels.
- Replace UI-only gate logic with a real submission module scaffold that can call one endpoint later.
- Add frontend handling for operational states:
  - webinar `open`
  - webinar `waitlist_full`
  - webinar `paused_unavailable`
  - `capture_paused_global`
  - `capture_paused_webinar`
  - `capture_paused_resources`
- Keep visitor-facing messaging calm:
  - normal registration/resource access by default
  - visible waitlist only when webinar is actually full
  - hard-stop messaging only when capture truly cannot proceed
- Add resource consent handling for broader educational updates without forcing webinar and resource nurture to merge.

### P2
- Define one unified submission contract for webinar + resources.
- Define Google Sheet control schema and event log schema.
- Define MailerLite field, tag, and segment mapping.
- Define Brevo fallback routing behavior and alert conditions.
- Define operator email alert triggers and payloads.

### P3
- Implement live Apps Script endpoint later.
- Connect MailerLite primary routing later.
- Connect Brevo fallback routing later.
- Add true email delivery and webinar reminder automations later.

## Locked Resource System

### Flagship
- Problem: `I keep restarting and can’t stay consistent`
- Format: `starter kit`
- Promise: `A simple, evidence-informed starting structure for women who want to stop restarting and build consistency with food habits.`

### Supporting Resource 1
- Problem: `I don’t know what to change first`
- Format: `checklist`

### Supporting Resource 2
- Problem: `Healthy eating feels mentally exhausting`
- Format: `simplification guide`

## Shared Goal Taxonomy
- Sustainable fat loss
- Better eating habits
- Higher energy and consistency
- Hormone-friendly nutrition
- Postpartum wellness

## Locked Data Model
- Webinar required fields:
  - `name`
  - `email`
  - `phone`
  - `goal`
- Resource required fields:
  - `name`
  - `email`
  - `goal`
- Resource optional fields:
  - `phone`
  - `educational_updates_opt_in`
- Custom fields:
  - `phone`
  - `goal`
  - `first_conversion_type`
  - `first_conversion_asset`
  - `last_conversion_type`
  - `last_conversion_asset`
  - `educational_updates_opt_in`
- Conversion types:
  - `webinar_registration`
  - `webinar_waitlist`
  - `resource_download`
- Conversion assets:
  - `webinar_main`
  - `resource_starter_kit`
  - `resource_first_steps_checklist`
  - `resource_mental_load_guide`
- Canonical goal keys:
  - `sustainable_fat_loss`
  - `better_eating_habits`
  - `higher_energy_and_consistency`
  - `hormone_friendly_nutrition`
  - `postpartum_wellness`
