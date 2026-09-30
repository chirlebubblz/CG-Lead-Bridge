# Yelp ↔ GoHighLevel Master Integration Template (The Jacksonville Standard)

> **Golden Rule:** The Jacksonville Cleaning Co architecture is the **official standard template** for all Yelp ↔ GoHighLevel deployments across all client sub-accounts. Whenever onboarding a new business, follow this exact structure without deviating.

---

## 1. System Architecture Overview

The Jacksonville standard uses a **hybrid 3-Zap + Server Middleware** architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. ZAP 1: NEW INQUIRY INTAKE                                           │
│    Trigger: Yelp Leads (New Lead)                                      │
│    Action:  LeadConnector (Create/Update Contact in GHL)               │
│             ➔ GHL Workflow fires, creates Opp in Pipeline & waits 90s │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ 2. ZAP 2: PHONE NUMBER CAPTURE                                         │
│    Trigger: Yelp Leads (Phone Availability)                            │
│    Action:  LeadConnector (Updates Contact with Phone & Tag)           │
│             ➔ GHL Workflow finishes 90s wait, sees phone, sends SMS!   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ 3. ZAP 3 + RENDER SERVER: LIVE 2-WAY CHAT IN GHL CONVERSATIONS         │
│    Customer sends chat in Yelp app ➔ Yelp alerts business Gmail        │
│    ➔ Gmail auto-forwards to Zapier Inbound Email Box                   │
│    ➔ Zap 3 (Webhooks by Zapier) POSTs to:                              │
│       https://cg-lead-bridge.onrender.com/webhook/yelp                 │
│    ➔ The Render Server:                                                │
│       • Strips Yelp footer boilerplate & buttons                       │
│       • Extracts real customer name from subject                       │
│       • Protects against owner email hijacking                         │
│       • Injects message live into GHL Conversations as a chat bubble!  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. GoHighLevel Standard Specification

### A. Custom Fields (Inside Folder: `Yelp Lead Details`)
Create folder **`Yelp Lead Details`** under **Settings ➔ Custom Fields** and create these 7 contact fields:

| Field Name | Data Type | Field Key | Purpose |
| :--- | :--- | :--- | :--- |
| **Yelp Service Type** | TEXT | `contact.yelp_service_type` | Deep Clean, Standard, Move-Out, etc. |
| **Yelp Bedrooms** | TEXT | `contact.yelp_bedrooms` | Number of bedrooms from survey |
| **Yelp Bathrooms** | TEXT | `contact.yelp_bathrooms` | Number of bathrooms from survey |
| **Yelp Cleaning Frequency** | TEXT | `contact.yelp_cleaning_frequency` | One-time, weekly, bi-weekly, monthly |
| **Yelp Notes / Customer Request** | LARGE_TEXT | `contact.yelp_notes__customer_request` | Full survey notes & customer request |
| **Yelp Lead ID** | TEXT | `contact.yelp_lead_id` | Yelp unique lead identifier |
| **Yelp Phone Captured** | TEXT | `contact.yelp_phone_captured` | Flag indicating cell phone captured |

---

### B. Standardized Tags
Provision these 6 standard tags:
1. `source: yelp` (Initial ingestion tag)
2. `yelp-lead` (Active lead tag)
3. `yelp-phone-captured` (Attached when cell phone is verified)
4. `yelp-no-phone` (Attached when only Yelp email relay exists)
5. `yelp-quote-sent` (Attached when price estimate is delivered)
6. `yelp-booked` (Attached when scheduled)

---

### C. Dedicated Pipeline (`Pipeline [N] - Yelp Leads Pipeline`)
Create a dedicated pipeline with these exact 8 stages:
1. **New Leads** (Initial landing stage)
2. **No Answer** (Customer didn't respond to greeting)
3. **Quoted** (Formal estimate delivered)
4. **Follow Up (Manual)** (Rep manual outreach)
5. **Follow Up (Automated)** (Automated follow-up drip)
6. **Interested but not booked** (Evaluating / objections)
7. **Not Qualified** (Out of area / declined)
8. **Closed Won** (Booked job)

---

### D. Workflow 1 (`(Yelp Leads) Master Inbound Intake & Auto-Followup`) — Default Standard (No Customer SMS)
Under **Automation ➔ Workflows ➔ Folder: `(Yelp Leads)`**:
> **Production Standard:** Zero outbound customer SMS. All customer-facing messages route 100% via Email (`leadsapi+...`), which Yelp automatically posts directly into the consumer's Yelp in-app chat thread. This guarantees 100% delivery without A2P 10DLC carrier compliance issues or unprompted texts. The phone number is retained solely on the contact record for sales reps to call/text manually.

- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Step 1:** Create Opportunity in `Pipeline [N] - Yelp Leads` ➔ Stage: `New Leads`
- **Step 2 (Bed & Bath Guardrail If/Else):**
  - **Branch 1 (Both Filled):** `Yelp Bedrooms is not empty` **AND** `Yelp Bathrooms is not empty`
    - Send Email to `{{contact.email}}` (`leadsapi+...` relay) with bed/bath counts.
  - **Branch 2 (Fallback - Either or Both Missing):** *Default Else*
    - Send Email to `{{contact.email}}` (`leadsapi+...` relay) asking naturally for bed/bath & sq footage.
- **Step 3:** Wait `90 Seconds` (Buffer for companion Zap 2 to capture direct phone number)
- **Step 4:** Internal Alert to Sales Team / Owner (via SMS or GHL In-App Notification with customer phone number)
- **Step 5:** Wait `24 Hours` *(Settings: Stop on Response = ON)*
- **Step 6:** Update Opportunity ➔ Stage: `No Answer`
- **Step 7:** Send 24h Follow-up Email #1 via Yelp Relay
- **Step 8:** Wait `48 Hours`
- **Step 9:** Update Opportunity ➔ Stage: `Follow Up (Automated)`
- **Step 10:** Send Final 72h Check-in Email #2 via Yelp Relay

---

## 3. Zapier Standard Specification

### Zap 1: New Lead Intake
- **Trigger:** `Yelp Leads` ➔ `New Lead`
- **Action:** `LeadConnector` ➔ `Create/Update Contact`:
  - Email: `Temporary Email Address` (`leadsapi+...`)
  - Tags: `source: yelp, yelp-lead`
  - Map: Service Type, Bedrooms, Bathrooms, Cleaning Frequency, Notes, Lead ID.

### Zap 2: Phone Availability
- **Trigger:** `Yelp Leads` ➔ `Phone Availability`
- **Action:** `LeadConnector` ➔ `Create/Update Contact`:
  - Email: `Temporary Email Address` (`leadsapi+...`) *(Matches existing contact)*
  - Phone: `Phone Number`
  - Tag: `yelp-phone-captured`
  - Custom Field: `Yelp Phone Captured` = `Yes`

### Zap 3: Inbound Chat Webhook (Server Bridge)
- **Trigger:** `Email by Zapier` ➔ `New Inbound Email`
- **Action:** `Webhooks by Zapier` ➔ `POST`:
  - URL: `https://cg-lead-bridge.onrender.com/webhook/yelp`
  - Payload Type: `json`
  - Data:
    - `name`: `1. From Name`
    - `subject`: `1. Subject`
    - `message`: `1. Body Plain`
    - `email`: *(Leave empty)*

---

## 4. Gmail Forwarding Standard
In the client's business Gmail receiving Yelp alerts:
- **Settings ➔ Forwarding:** Add Zapier inbound email address and verify with the 9-digit code.
- **Settings ➔ Filters:** 
  - `from: yelp.com`
  - `has the words: [Business Name]`
  - Action: Forward to Zapier inbound address.

---

## 5. Middleware Server Shielding (`src/server.ts`)
When adding new business email domains, append them to the blacklist guardrail in `src/server.ts` so owner/forwarder emails are never ingested as leads:
```typescript
if (email && (email.includes('zapiermail.com') || email.includes('jerafisabalo') || email.includes('jacksonvillecleaningco') || email.includes('capableclean') || email.includes('ascendcleaning'))) {
  email = undefined;
}
```

---

## 6. Deployed Render Services

| Client | Render URL | GHL Location ID |
| :--- | :--- | :--- |
| **Clean Genie / Jacksonville** | `https://cg-lead-bridge.onrender.com` | `EKXbBmGEV6hnLQFQRPc7` |
| **Capable Clean** | `https://cg-lead-bridge.onrender.com` | `s94e80clit6bCL9VBWgl` |
| **The Sparkle Squad Co (Miami)** | `https://cg-lead-bridge.onrender.com` | `ThUMNqsKmDfYKMF0jsBb` |
| **Sunny Side Clean Team** | `https://cg-lead-bridge.onrender.com` | `WOwi6fpdaZavuqHU8Rux` |
| **Ascend Cleaning** | `https://cg-lead-bridge-ascend.onrender.com` | `IdJoWa68hD3nVj45Fv7f` |
| **Puget Sound Cleaners** | `https://cg-lead-bridge.onrender.com` | `MucxtGIfmvLViGQWD0CG` |
