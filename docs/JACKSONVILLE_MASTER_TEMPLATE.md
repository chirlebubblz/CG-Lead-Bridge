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

### D. Workflow 1 (`Inbound Lead Intake & Auto-Responder`)
Under **Automation ➔ Workflows ➔ Folder: `(Yelp Leads)`**:
- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Step 1:** Create Opportunity in `Yelp Leads Pipeline` ➔ `New Leads`
- **Step 2:** Wait `90 Seconds` (Buffer for Yelp Phone Availability Zap)
- **Step 3 (If/Else):** Check `Contact Details ➔ Phone is not empty`:
  - **Branch A (Has Phone):**
    - Tag `yelp-phone-captured`
    - Sub-check: Are Bed & Bath populated?
      - If Yes: Send SMS with bed/bath specs.
      - If No (Fallback): Send natural fallback SMS asking for bed/bath & sq footage.
    - Go To ➔ Internal Alert to Team ➔ Wait 24h ➔ Follow-up SMS #1.
  - **Branch B (Yelp Relay Email Only):**
    - Tag `yelp-no-phone`
    - Sub-check: Are Bed & Bath populated?
      - If Yes: Send Email with bed/bath specs to `leadsapi+...`.
      - If No (Fallback): Send natural fallback Email to `leadsapi+...`.
    - Go To ➔ Internal Alert to Team ➔ Wait 24h ➔ Follow-up Email #1.

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
if (email && (email.includes('zapiermail.com') || email.includes('jerafisabalo') || email.includes('jacksonvillecleaningco') || email.includes('capableclean'))) {
  email = undefined;
}
```
