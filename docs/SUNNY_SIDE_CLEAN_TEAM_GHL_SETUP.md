# Sunny Side Clean Team - GoHighLevel & Yelp Connection Blueprint

**Location Name:** Sunny Side Clean Team  
**Location ID:** `WOwi6fpdaZavuqHU8Rux`  
**Company ID:** `bVgizpg67nHf4Ou7j2Gr`  
**Business Contact:** Deep Patel (`deep@selectservices.llc` | `+13862222790`)  
**Timezone:** `US/Eastern`  
**Address:** 555 W Granada Blvd, Ormond Beach, FL 32174  

---

## 1. Custom Fields (Provisioned & Live via API)

All dedicated Yelp custom fields have been provisioned in GoHighLevel for Sunny Side Clean Team and grouped under folder **`Yelp Lead Details`** (`fye9AoiEAxfj9vxOUfFr`):

| Field Name | Field Key | Field ID | Data Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `nNS0PkuDlkLQDeV1gPCr` | TEXT | Deep Clean, Standard Clean, Move-Out, etc. |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `RmBFkDoAS86T2Ye9LUlL` | TEXT | Number of bedrooms specified in survey |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `ec6tyrx3HNEQylNH2FT9` | TEXT | Number of bathrooms specified in survey |
| **Yelp Cleaning Frequency** | `contact.yelp_cleaning_frequency` | `C4SMEhCrw0ZQHTysmRZZ` | TEXT | One-time, weekly, bi-weekly, monthly |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `tmkJ5te67Zw0iM9lhPSs` | LARGE_TEXT | Full questionnaire summary and customer notes |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `zI2KtX2j7gptvuYwoflv` | TEXT | Yelp's unique lead/conversation identifier |
| **Yelp Phone Captured** | `contact.yelp_phone_captured` | `GVwyTyuwHBGf10VdNu9l` | TEXT | Direct customer phone tracking flag |

---

## 2. Tags (Provisioned & Live via API)

Standardized lifecycle tags have been provisioned:

| Tag Name | Tag ID | Application Trigger |
| :--- | :--- | :--- |
| **`source: yelp`** | `wi6nNppDCalf2PLXIP15` | Applied upon lead creation |
| **`yelp-lead`** | `XNHiRuAMTHn1hjpqdIm9` | Identifies active Yelp leads |
| **`yelp-phone-captured`** | `E0nMmM2GjRH5ppIPyaiD` | Applied when direct customer phone is provided |
| **`yelp-no-phone`** | `3pAHExKUYmIfs0YO69zD` | Applied when customer only uses masked Yelp relay |
| **`yelp-quote-sent`** | `4ZNQMG8wOEq0DOgiXWfL` | Applied when quote message is dispatched |
| **`yelp-booked`** | `SzEjT8mNHfq8JMuaZuHT` | Applied when lead is successfully scheduled |

---

## 3. Dedicated Yelp Pipeline (Created & Live via API)

Target Pipeline: **`Pipeline 6 - Yelp Leads`** (`vW4C7CoS4dMyY2tN7d5F`)

| Stage Name | Stage ID | Yelp Ingestion Role |
| :--- | :--- | :--- |
| **New Leads** | `21a4a59d-4ab7-417d-9c5f-c413a013d3df` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `0e7cdca1-d201-4755-ae90-94032d1076aa` | Customer did not reply to initial intake |
| **Quoted** | `84d20ecc-af13-4522-8f2f-5f33493bff20` | Quote provided to lead |
| **Follow Up (Manual)** | `f8708c5c-1ada-4713-a6ac-5e18964f5f87` | Sales rep manual touchpoint |
| **Follow Up (Automated)** | `bbcdef27-c747-4297-b59d-f224cdcd1585` | Automated nurture drip |
| **Interested but not booked**| `c152ea12-fa9e-4ea8-9300-5126bd9722f4` | High intent, date/time pending |
| **Not Qualified** | `0ee52098-8424-499b-b6fb-e636eab297cc` | Outside service area or declining service |
| **Closed Won** | `93c68738-71f5-4fba-81c7-72eea199a046` | Successfully booked cleaning job |

---

## 4. The Master Workflow: (No Customer SMS Default Standard)

Folder: **`Automation ➔ Workflows ➔ (Yelp Leads)`**  
Workflow Name: **`(Yelp Leads) Master Inbound Intake & Auto-Followup`**

> **Production Standard:** Zero outbound customer SMS. All customer-facing messages route 100% via Email (`leadsapi+...`), which Yelp automatically posts directly into the consumer's Yelp in-app chat thread. This guarantees 100% delivery without A2P 10DLC carrier compliance issues or unprompted texts. The phone number is retained solely on the contact record for sales reps to call/text manually.

### Step-by-Step Actions:
- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Action 1: Create/Update Opportunity:**
  - Pipeline: `Pipeline 6 - Yelp Leads` (`vW4C7CoS4dMyY2tN7d5F`)
  - Stage: `New Leads` (`21a4a59d-4ab7-417d-9c5f-c413a013d3df`)
  - Opportunity Name: `Yelp - {{contact.name}}`
- **Action 2: Bed & Bath Guardrail (If / Else):**
  - **Branch 1 (Both Present):** `contact.yelp_bedrooms is not empty` **AND** `contact.yelp_bathrooms is not empty`
    - **Action:** Send Email to `{{contact.email}}` (`leadsapi+...` relay):
      - Subject: `Your Cleaning Request - Sunny Side Clean Team`
      - Body:
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Sunny Side Clean Team on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote and check availability, what is your approximate square footage and preferred days for your cleaning? You can reply directly here or call/text us directly at (386) 222-2790.\n\nBest regards,\nSunny Side Clean Team"*
  - **Branch 2 (Fallback - Either or Both Missing):** *Default Else*
    - **Action:** Send Email to `{{contact.email}}` (`leadsapi+...` relay):
      - Subject: `Your Cleaning Request - Sunny Side Clean Team`
      - Body:
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Sunny Side Clean Team on Yelp! We received your request for a {{contact.yelp_service_type}}.\n\nTo give you an accurate quote and check availability, could you share how many bedrooms and bathrooms you have, as well as your approximate square footage? You can reply directly here or call/text us directly at (386) 222-2790.\n\nBest regards,\nSunny Side Clean Team"*
- **Action 3: Wait (90 Seconds):**
  - Buffer for companion Zap 2 to attach phone number to the contact record.
- **Action 4: Internal Team Notification:**
  - Send SMS to Deep Patel (`+13862222790`):
    > *"🚨 New Yelp Lead: {{contact.name}} requested {{contact.yelp_service_type}}.\nPhone: {{contact.phone}}\nInitial Yelp response sent. View conversation: https://app.gohighlevel.com"*
- **Action 5: Wait 24 Hours** *(Settings: Stop on Response = ON)*
- **Action 6: Update Opportunity ➔ Stage: `No Answer`** (`0e7cdca1-d201-4755-ae90-94032d1076aa`)
- **Action 7: Send Follow-Up Email #1 (24h Nudge via Yelp Relay)**
- **Action 8: Wait 48 Hours**
- **Action 9: Update Opportunity ➔ Stage: `Follow Up (Automated)`** (`bbcdef27-c747-4297-b59d-f224cdcd1585`)
- **Action 10: Send Final Follow-Up Email #2 (72h Check-in via Yelp Relay)**

### Workflow Settings (Gear Icon in Builder):
* **Allow Re-entry:** ❌ **Off**
* **Stop on Response:** ✅ **ON**
* **Status:** **Published**

---

## 5. Zapier Mapping Guide

### Zap 1: Yelp Leads ➔ GoHighLevel Contact & Opportunity
- **Trigger:** Yelp Leads ➔ `New Lead`
  - Yelp Account: Connect Sunny Side Clean Team Yelp business listing
- **Action 1:** LeadConnector ➔ `Create/Update Contact`
  - **Location:** `WOwi6fpdaZavuqHU8Rux` (Sunny Side Clean Team)
  - **First Name / Last Name:** Lead Name
  - **Email:** `leadsapi+...` (Temporary Email from Yelp) - **Never use `reply+...`**
  - **Tags:** `source: yelp, yelp-lead`
  - **Custom Field - Yelp Service Type:** `Project Job Names`
  - **Custom Field - Yelp Bedrooms:** Survey Answer [Bedrooms]
  - **Custom Field - Yelp Bathrooms:** Survey Answer [Bathrooms]
  - **Custom Field - Yelp Cleaning Frequency:** Survey Answer [Frequency]
  - **Custom Field - Yelp Notes / Customer Request:** `Project Summary` / Survey text
  - **Custom Field - Yelp Lead ID:** `Lead ID`
- **Action 2:** LeadConnector ➔ `Create/Update Opportunity`
  - **Pipeline:** `Pipeline 6 - Yelp Leads` (`vW4C7CoS4dMyY2tN7d5F`)
  - **Stage:** `New Leads` (`21a4a59d-4ab7-417d-9c5f-c413a013d3df`)
  - **Opportunity Name:** `Yelp - {{contact.name}}`

### Zap 2 (Companion): Yelp Phone Availability ➔ Update Contact
- **Trigger:** Yelp Leads ➔ `Phone Availability`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Location:** `WOwi6fpdaZavuqHU8Rux`
  - **Email:** `leadsapi+...` (matches existing contact created in Zap 1)
  - **Phone:** `Phone Number` (from Step 1)
  - **Tags:** `yelp-phone-captured`

---

## 6. Email-to-Webhook Bridge for Ongoing Messages

To receive subsequent chat bubbles sent by consumers on Yelp directly into GHL Conversations:

1. **Gmail Auto-Forwarding Filter (on `deep@selectservices.llc`):**
   - **From:** `yelp.com`
   - **Has the words:** `Sunny Side` (or `Sunny Side Clean Team`)
   - **Action:** Forward to Zapier Inbound Email Box (e.g. `sunnyside.[id]@zapiermail.com`).
   - *Note on verification:* Copy the 9-digit alphanumeric code from Zapier into Gmail Settings; do not click the link (avoids Google Error 400).
2. **Zapier Inbound Email ➔ Webhook POST:**
   - **URL:** `https://cg-lead-bridge.onrender.com/webhook/yelp`
   - **Payload Type:** `json`
   - **Mapping:**
     - `name`: `1. From Name`
     - `subject`: `1. Subject`
     - `message`: `1. Body Plain`
     - `email`: *(Leave blank)*
3. **Outbound Messaging:**
   - When agents respond to `leadsapi+<hex>@messaging.yelp.com` via GHL Conversations, Yelp delivers the message directly to the customer's Yelp app chat bubble.
