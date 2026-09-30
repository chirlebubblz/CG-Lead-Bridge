# Yelp ↔ GoHighLevel Project Rules & Architecture Standard

## Golden Master Standard: The Jacksonville Template
The **Jacksonville Cleaning Co** integration architecture is the official standard golden template for all Yelp ↔ GoHighLevel integrations in this workspace.

Every new client, brand rollout, or location onboarding must strictly adhere to the Jacksonville Master Template documented in [`docs/JACKSONVILLE_MASTER_TEMPLATE.md`](./docs/JACKSONVILLE_MASTER_TEMPLATE.md).

### The 5 Standard Layers for Every Project:
1. **GHL Custom Fields:** Always nested inside folder `Yelp Lead Details` (or `Yelp Leads & Details`) with the 7 standardized fields.
2. **GHL Tags:** Standard 6 lifecycle tags (`source: yelp`, `yelp-lead`, `yelp-phone-captured`, `yelp-no-phone`, `yelp-quote-sent`, `yelp-booked`).
3. **GHL Dedicated Pipeline:** `Pipeline [N] - Yelp Leads Pipeline` with the exact 8 standardized stages.
4. **GHL Workflow 1:** Folder `(Yelp Leads)`, Name `(Yelp Leads) Master Inbound Intake & Auto-Followup` — **Default standard is Pure Email Relay (Zero Outbound Customer SMS)** with Bed/Bath fallback guardrail, 90-second phone buffer, internal team alert, and 24h/48h automated no-answer follow-up with Stop on Response = ON.
5. **The 3 Zapier Zaps + Render Server Bridge:**
   - **Zap 1:** Yelp Leads (`New Lead`) ➔ LeadConnector (`Create/Update Contact`)
   - **Zap 2:** Yelp Leads (`Phone Availability`) ➔ LeadConnector (`Create/Update Contact` with Phone)
   - **Zap 3:** `Email by Zapier` (forwarded from business Gmail) ➔ Webhook POST to Render server (`https://cg-lead-bridge.onrender.com/webhook/yelp`)
   - **Render Middleware Server:** Inbound HTML/footer stripping, subject name extraction, owner email shield, and GHL Inbound Conversations API chat bubble injection.
