# TriadFit Implementation Plan

## Phase 1: Shared Design System
1. Update the palette to a controlled spring system:
   - cream/off-white base
   - refined coral-apricot primary CTA
   - warm turquoise as dominant support
   - light olive green as rare accent
2. Reduce card overuse and reserve card treatment for:
   - profile items
   - resource items
   - takeaways
   - gate and access states
3. Keep heroes and trust sections more editorial and layout-led.

## Phase 2: Homepage Update
1. Preserve webinar as primary CTA.
2. Replace the current three-card resources block with:
   - one flagship feature
   - one compact supporting summary area
   - route to the full Resources hub

## Phase 3: Resources Funnel
1. Rebuild the hub page with:
   - one flagship dominant card
   - two supporting cards
   - trust/safety framing
2. Create three detail pages with preview-first structure:
   - problem
   - what it helps with
   - who it is for
   - what is inside
   - trust/safety note
   - gate form
3. Create three in-page simulated access states with:
  - success state
  - resource title
  - next-step guidance
  - download placeholder
  - subtle webinar CTA
  - back to resources hub

## Phase 4: Integration Preparation
1. Refactor all forms to a normalized payload model:
   - stable field names
   - stable goal keys
   - stable conversion asset keys
   - explicit form types
2. Replace UI-only gate logic with a submission module scaffold:
   - one frontend submission client
   - swappable endpoint configuration
   - no provider-specific code in the page templates
3. Add frontend operational state handling:
   - `webinar_mode`: `open`, `waitlist_full`, `paused_unavailable`
   - `capture_paused_global`
   - `capture_paused_webinar`
   - `capture_paused_resources`
4. Add consent handling on resource forms:
   - immediate delivery by form purpose
   - optional educational updates opt-in

## Phase 5: Middleware And Control Specs
1. Define one unified Apps Script submission contract.
2. Define Google Sheet control schema:
   - operational toggles
   - event logging
3. Define audience mapping:
   - MailerLite fields
   - MailerLite tags/segments
   - Brevo fallback behavior
4. Define alerting:
   - operator email alerts
   - logging triggers

## Phase 6: Review
1. Browser QA on Home, Resources hub, and all detail pages.
2. QA normal, waitlist, paused, and hard-stop states.
3. Final polish before live provider integration.
