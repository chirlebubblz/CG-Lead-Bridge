# Clean Genie ↔ Yelp & Thumbtack Conversation Bridge

A lightweight, serverless-ready TypeScript middleware connecting **Yelp Leads API** and **Thumbtack** directly into **GoHighLevel (Clean Genie)** Conversations.

---

## Features
- **Native Two-Way Messaging:** Respond to Yelp quote requests directly from the Clean Genie Conversations inbox.
- **Thumbtack Expansion:** Built-in modular adapter to connect Thumbtack inquiries into the same CRM chat window.
- **Echo & Duplicate Prevention:** Filters out `API-SELF` messages so outbound messages never echo back into GHL.
- **Automatic 12-Day Webhook Renewal:** A background cron service automatically tears down and renews Yelp's 14-day webhook subscriptions before they expire.
- **Plain-Text Sanitizer:** Strips all rich HTML tags, CSS styling, and email tracking links to comply with Yelp's strict plain-text message rules.

---

## Directory Structure
```
├── src/
│   ├── config.ts              # Environment & API configuration
│   ├── server.ts              # Express API hosting webhooks & OAuth
│   └── services/
│       ├── yelp.ts            # Yelp Leads API client (/v3/leads, webhooks)
│       ├── ghl.ts             # GoHighLevel API client (conversations/messages/inbound)
│       ├── thumbtack.ts       # Thumbtack messaging adapter
│       ├── cron.ts            # 12-day webhook auto-renewal engine
│       └── token-store.ts     # Persistent token & webhook ID manager
├── tests/
│   └── bridge.test.ts         # Unit & integration tests
├── references/
│   └── highlevel-api-docs/   # Cloned HighLevel OpenAPI specs & docs
├── .env.example               # Configuration template
├── package.json
└── tsconfig.json
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and populate your credentials:
```env
PORT=3000
BASE_URL=https://your-server-domain.com

GHL_LOCATION_ID=YVtPYdLotWLwuy5AA8Vv
GHL_CONVERSATION_PROVIDER_ID=your_ghl_provider_id
GHL_ACCESS_TOKEN=your_ghl_token

YELP_CLIENT_ID=your_yelp_client_id
YELP_CLIENT_SECRET=your_yelp_client_secret
YELP_BUSINESS_ID=your_yelp_biz_id
```

### 3. Run Tests
```bash
npm test
```

### 4. Build & Start
```bash
npm run build
npm start
```

---

## API Endpoints
- `POST /webhook/yelp` - Ingests Yelp `NEW_EVENT` webhooks and posts to GHL Conversations.
- `POST /webhook/ghl-delivery?channel=yelp` - Receives outbound replies from GHL and posts to Yelp.
- `POST /webhook/ghl-delivery?channel=thumbtack` - Receives outbound replies from GHL for Thumbtack.
- `GET /oauth/yelp/callback` - Yelp OAuth 2.0 authorization code exchange.
- `GET /health` - Health check & webhook expiration status.
