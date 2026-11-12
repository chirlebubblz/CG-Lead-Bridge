# Project State Summary: Yelp & Thumbtack to GoHighLevel Conversation Bridge

## 1. Project Name & Identity
- **Project Name:** Clean Genie Lead Bridge (`cleangenie-lead-bridge`) / Yelp Integration
- **Version:** `0.1.0` (Production Master)
- **Primary Objective:** High-speed serverless middleware connecting Yelp Leads API quote requests and Thumbtack inquiries directly into GoHighLevel (Clean Genie) Conversations. Provides true 2-way real-time messaging, webhook auto-renewal, anti-echo filtering, and plain-text sanitization.
- **Standard of Record:** Built on the **Jacksonville Master Template** (`JACKSONVILLE_MASTER_TEMPLATE.md`), establishing the repeatable 5-layer deployment standard across multiple cleaning brand accounts (Ascend Cleaning, Capable Clean, Maid Co, Sunny Side, Sparkle Squad, Puget Sound, Rapids Cleaning).

---

## 2. Tech Stack & Architecture
- **Language & Runtime:** TypeScript 5.7+, Node.js 22+
- **HTTP Server & Routing:** Express 4.21+ (`src/server.ts`)
- **Scheduling & Background Tasks:** Node-Cron (`node-cron`) for 12-day automated Yelp webhook renewals
- **HTTP Client:** Axios (`axios`) for REST communication with Yelp Fusion API & HighLevel API
- **Testing Framework:** Vitest 3.0+ (`tests/bridge.test.ts`)
- **Hosting / Infrastructure:** Render Web Service (`render.yaml`), Zapier Webhook Relays, Render Secret Storage
- **Key External Integrations:**
  - **Yelp Leads API:** Inbound message capture, webhook subscriptions, and outbound message dispatch (`/v3/leads`)
  - **GoHighLevel (GHL) Conversations API:** Inbound message injection (`/conversations/messages/inbound`) and outbound message webhooks
  - **Thumbtack Adapter:** Modular conversation integration for home service inquiries
  - **Zapier Webhook Chain:** 3-Zap ingestion relay (New Lead -> Phone Availability -> Email Forward -> Render server)

---

## 3. Key File Inventory

| File / Path | Type | Purpose |
| :--- | :--- | :--- |
| `src/server.ts` | Express Server | Core entry point; handles Yelp/Zapier inbound webhooks and GHL outbound webhooks |
| `src/config.ts` | Configuration | Environment variables, API tokens, port bindings, and location IDs |
| `src/services/yelp.ts` | Service Client | Yelp Leads API integration: outbound posting, conversation lookup, webhook setup |
| `src/services/ghl.ts` | Service Client | HighLevel API client: contact matching, custom field updates, inbound message creation |
| `src/services/thumbtack.ts` | Service Client | Thumbtack messaging adapter for multi-channel inbox consolidation |
| `src/services/cron.ts` | Cron Engine | Auto-renews Yelp 14-day webhooks at day 12 to eliminate message dropouts |
| `src/services/token-store.ts` | State Persistence | Secure token and active webhook ID persistent storage |
| `scripts/setup-ghl-account.ts`| Setup Automation | CLI script to automatically configure GHL custom fields, tags, and pipelines |
| `scripts/dedup-audit.ts` | Maintenance Utility| Contact deduplication audit and cleanup utility |
| `docs/JACKSONVILLE_MASTER_TEMPLATE.md`| Master Spec | The Golden Master blueprint for all GHL Yelp onboardings |
| `render.yaml` | Cloud Deployment | Render web service blueprint and infrastructure declaration |

---

## 4. Current Operational State
- **Two-Way Messaging:** Fully operational. Messages submitted on Yelp appear instantly as conversation bubbles in GHL; agent replies from GHL post directly to the Yelp customer thread.
- **Echo Prevention (`API-SELF`):** Tested and active. Outbound messages from the CRM are tagged to prevent webhook loop-backs from echoing into GHL.
- **Plain-Text Sanitizer:** Operational. Strips HTML markup, inline styles, and tracking pixels to comply with Yelp's plain-text message constraints.
- **Automated Webhook Renewal:** Operational. Cron job runs on schedule to refresh Yelp subscriptions before the 14-day expiration window.
- **Client Deployment Standard:** 8 separate GHL location setups verified and documented in `docs/`.

---

## 5. Run & Launch Commands

### Development Server
```bash
# Install dependencies
npm install

# Run in TypeScript development mode with hot-reloading
npm run dev
```

### Production Build & Run
```bash
# Compile TypeScript to JavaScript
npm run build

# Start production server
npm start
```

### Testing & Audits
```bash
# Run unit and integration tests
npm test

# Run contact deduplication audit (dry run)
npm run dedup:audit

# Provision new GHL sub-account according to Jacksonville standard
npm run setup:ghl
```

---

## 6. Next Steps & Pending Backlog
- **Thumbtack OAuth UI:** Build frontend OAuth flow to automate Thumbtack API token refreshes without manual bearer token pasting.
- **Multi-Tenant Gateway:** Consolidate multiple location webhooks into a unified multi-tenant routing table keyed by GHL Location ID.
- **Automated Follow-Up SMS Guardrail:** Add opt-in toggle for clients wishing to enable direct SMS follow-ups once phone numbers are captured via Zap 2.
