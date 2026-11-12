# The Sparkle Squad Co (Miami) — Yelp ↔ GoHighLevel Deployment Guide

**Business:** The Sparkle Squad Co  
**Location ID:** `ThUMNqsKmDfYKMF0jsBb`  
**Company ID:** `ZnXmnDTmK0MNl5R2OH3C`  
**Business Contact:** Mark Cook II (`info@thesparklesquadco.com` | `+17866004088`)  
**Timezone:** `America/New_York`  
**Address:** 1000 NW 7th St Apt 921, Miami, FL 33136  
**Website:** https://thesparklesquadco.com/  
**Standard:** Puget Sound Cleaners Benchmark / Jacksonville Golden Master (Zero Outbound Customer SMS / Pure Email Relay Standard)

---

## 1. Custom Fields Status (Folder: `Yelp Lead Details`)

Folder ID: `EifqWJ53tvOSq54kFOfn`

All dedicated Yelp custom fields are provisioned in GoHighLevel under **Settings ➔ Custom Fields ➔ Yelp Lead Details**:

| Field Name | Field Key | ID | Data Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `7ZNL1dByKvvE4rUgRXp9` | TEXT | Deep Clean, Standard Clean, Move-Out, etc. |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `fH5GLG23EpSzcfYxasWv` | TEXT | Number of bedrooms specified in survey |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `4bX7aQhIgm7iHfO4RyCj` | TEXT | Number of bathrooms specified in survey |
| **Yelp Cleaning Frequency** | `contact.yelp_cleaning_frequency` | `irInG3kLjF8AP4E7qwKM` | TEXT | Cleaning frequency (one-time, weekly, bi-weekly) |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `3r5Mec4SC2mCli169nWP` | LARGE_TEXT | Full questionnaire summary and customer notes |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `yLmWGwpt8XKke8rinDSG` | TEXT | Yelp's unique lead/conversation identifier |
| **Yelp Phone Captured** | `contact.yelp_phone_captured` | `lZdQu39LfUSq7BFp9bky` | TEXT | Flag indicating cell phone captured |

---

## 2. Standardized Tags

Standardized lifecycle tags provisioned via API:

| Tag Name | Tag ID | Role / Trigger |
| :--- | :--- | :--- |
| **`source: yelp`** | `iwoRE5sN7cGADJTan1xQ` | Initial lead ingestion tag (Workflow Trigger) |
| **`yelp-lead`** | `cjDkV7HjSe0uGgwAVHdH` | Identifies active Yelp leads |
| **`yelp-phone-captured`** | `bSztO5AcyA6IHnn0N1sB` | Added when direct customer phone is captured via Zap 2 |
| **`yelp-no-phone`** | `ePeqVTlU41ha7EUzqJr7` | Added when only Yelp masked relay email exists |
| **`yelp-quote-sent`** | `8yUE8caafnApCXwTt9XY` | Added when formal quote estimate is delivered |
| **`yelp-booked`** | `gREJrPWctDsUY0rqrhbr` | Added when booking/job is confirmed |

---

## 3. Dedicated Yelp Pipeline

Target Pipeline: **`Pipeline 6 - Yelp Leads`** (`RhbEvMN7bsMd2bekssNc`)

| Stage Name | Stage ID | Stage Role |
| :--- | :--- | :--- |
| **New Leads** | `1dac1178-efc1-4f67-b508-b7fe4b0cc14b` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `a8b77781-c065-471d-a9fe-40f8b008eed5` | Moved after 24h if customer hasn't responded |
| **Quoted** | `638fd182-787e-4076-83ee-d4e84e6003c0` | Moved when quote is delivered |
| **Follow Up (Manual)** | `2065f7f1-bc97-49af-8717-24e5d00c0a90` | Rep manual outreach |
| **Follow Up (Automated)** | `9ec19e68-2640-4639-9ae7-7248d28ae341` | Automated nurture / 48h-72h drip stage |
| **Interested but not booked** | `fd9fc819-f357-4eb0-8f01-22e50106b240` | Active objection / evaluating |
| **Not Qualified** | `a7903bea-6137-4ced-83c7-8983d1ab1e5a` | Out of service area / declined |
| **Closed Won** | `d499bc88-0911-4f9e-b2fc-00e3b56d9111` | Booked customer |

---

## 4. The Master Workflow: Puget Sound Standard (Zero Customer SMS)

Folder: **`Automation ➔ Workflows ➔ (Yelp Leads)`**  
Workflow Name: **`(Yelp Leads) Master Inbound Intake & Auto-Followup`**

> **Official Standard Reason:**  
> Inbound Yelp consumers expect communication inside the Yelp app chat thread. Directly sending unsolicited customer SMS outside Yelp violates A2P 10DLC compliance and triggers customer pushback.  
> Instead, all automated customer communication is sent as **Email to `{{contact.email}}`** (`leadsapi+...`), which Yelp automatically converts into an **in-app chat message directly in the customer's Yelp inbox**.  
> The customer's mobile phone number is safely captured via Zap 2 and saved to their contact card for internal sales team alerts and manual follow-up.

### Step-by-Step Workflow Blueprint:

- **Trigger: Contact Tag Added**
  - Tag: `source: yelp` (or `yelp-lead`)

- **Action 1: Create/Update Opportunity**
  - Pipeline: `Pipeline 6 - Yelp Leads` (`RhbEvMN7bsMd2bekssNc`)
  - Stage: `New Leads` (`1dac1178-efc1-4f67-b508-b7fe4b0cc14b`)
  - Opportunity Name: `Yelp - {{contact.name}}`
  - Status: `Open`

- **Action 2: Bed & Bath Guardrail (If / Else)**
  - **Branch 1 (Both Present):** `contact.yelp_bedrooms is not empty` **AND** `contact.yelp_bathrooms is not empty`
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - From Name: `The Sparkle Squad Co`
      - From Email: `info@thesparklesquadco.com`
      - Subject: `Your Cleaning Request - The Sparkle Squad Co`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to The Sparkle Squad Co on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote and check availability, what is your approximate square footage and preferred days for your cleaning? You can reply directly here to chat with us on Yelp!\n\nBest regards,\nThe Sparkle Squad Co Team"*
  - **Branch 2 (Fallback - Either or Both Missing):** *Default Else*
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - From Name: `The Sparkle Squad Co`
      - From Email: `info@thesparklesquadco.com`
      - Subject: `Your Cleaning Request - The Sparkle Squad Co`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to The Sparkle Squad Co on Yelp! We received your request for a {{contact.yelp_service_type}}.\n\nTo give you an accurate quote and check availability, could you share how many bedrooms and bathrooms you have, as well as your approximate square footage? You can reply directly here to chat with us on Yelp!\n\nBest regards,\nThe Sparkle Squad Co Team"*

- **Action 3: Wait 90 Seconds**
  - Wait Time: `90 Seconds` (Buffer for companion Zap 2 to attach customer phone number)

- **Action 4: Internal Team Alert**
  - Action Type: `Internal Notification` ➔ `SMS` (or App Notification)
  - To: Mark Cook II (`+17866004088`)
  - Message:
    > *"🚨 New Yelp Lead: {{contact.name}} requested {{contact.yelp_service_type}}.\nPhone: {{contact.phone}}\nInitial response sent via Yelp Relay. View conversation in GHL: https://app.gohighlevel.com/v2/location/ThUMNqsKmDfYKMF0jsBb/conversations"*

- **Action 5: Wait 24 Hours (No-Answer Delay)**
  - Wait Time: `24 Hours`
  - Settings: **Stop on Response = ON**

- **Action 6: Update Opportunity ➔ Stage: `No Answer`**
  - Pipeline: `Pipeline 6 - Yelp Leads` (`RhbEvMN7bsMd2bekssNc`)
  - Stage: `No Answer` (`a8b77781-c065-471d-a9fe-40f8b008eed5`)

- **Action 7: Send Follow-Up Email #1 (24h Nudge via Yelp Relay)**
  - To: `{{contact.email}}`
  - From Name: `The Sparkle Squad Co`
  - From Email: `info@thesparklesquadco.com`
  - Subject: `Following up on your cleaning request - The Sparkle Squad Co`
  - Body:
    > *"Hi {{contact.first_name}},\n\nI wanted to follow up on your cleaning inquiry on Yelp for {{contact.yelp_service_type}}.\n\nWere you still looking to get a quote or schedule a cleaning for this week? Let us know and we'd be happy to get you taken care of!\n\nBest,\nThe Sparkle Squad Co Team"*

- **Action 8: Wait 48 Hours**
  - Wait Time: `48 Hours`

- **Action 9: Update Opportunity ➔ Stage: `Follow Up (Automated)`**
  - Pipeline: `Pipeline 6 - Yelp Leads` (`RhbEvMN7bsMd2bekssNc`)
  - Stage: `Follow Up (Automated)` (`9ec19e68-2640-4639-9ae7-7248d28ae341`)

- **Action 10: Send Final Follow-Up Email #2 (72h Check-in)**
  - To: `{{contact.email}}`
  - From Name: `The Sparkle Squad Co`
  - From Email: `info@thesparklesquadco.com`
  - Subject: `Checking in - The Sparkle Squad Co`
  - Body:
    > *"Hi {{contact.first_name}},\n\nJust checking in one last time regarding your {{contact.yelp_service_type}} request. If you still need cleaning service or have any questions about pricing, feel free to reply directly here.\n\nHave a great week!\nThe Sparkle Squad Co Team"*

---

### Critical Workflow Settings (Gear Icon in Builder):
* **Allow Re-entry:** ❌ **Off**
* **Stop on Response:** ✅ **ON** *(Crucial: As soon as the customer replies at any point, GHL automatically halts the workflow so they never receive follow-up automated nudges!)*
* **Status:** **Published**

---

## 5. Companion Workflows (The Puget Standard Suite)

### Workflow 2: `(Yelp Leads) Quote Sent Follow-Up`
* **Folder:** `(Yelp Leads)`
* **Trigger:** Opportunity Stage Changed ➔ `Quoted` (`638fd182-787e-4076-83ee-d4e84e6003c0`) in `Pipeline 6 - Yelp Leads`
* **Settings:** Allow Re-entry = OFF, **Stop on Response = ON**
* **Step 1:** Add Tag `yelp-quote-sent` (`8yUE8caafnApCXwTt9XY`)
* **Step 2:** Remove from Workflow `(Yelp Leads) Master Inbound Intake & Auto-Followup`
* **Step 3:** Wait `48 Hours`
* **Step 4:** Send Email to `{{contact.email}}` (Quote Nudge #1):
  - Subject: `Checking in on your cleaning quote - The Sparkle Squad Co`
  - Body:
    > *"Hi {{contact.first_name}}, I wanted to follow up and see if you had any questions regarding the quote we sent over for your {{contact.yelp_service_type}}. We have availability coming up this week in Miami—let us know if you'd like to get scheduled! — The Sparkle Squad Co"*
* **Step 5:** Wait `48 Hours`
* **Step 6:** Move Opportunity ➔ `Follow Up (Automated)` (`9ec19e68-2640-4639-9ae7-7248d28ae341`)
* **Step 7:** Send Email to `{{contact.email}}` (Final Quote Check-in #2):
  - Subject: `Following up on your cleaning quote - The Sparkle Squad Co`
  - Body:
    > *"Hi {{contact.first_name}}, just checking in one last time regarding your quote for {{contact.yelp_service_type}}. Feel free to reply here if you'd like to proceed or if you have any questions! — The Sparkle Squad Co Team"*
* **Step 8:** Internal Notification to Mark Cook II if still no response after 4 days.

---

### Workflow 3: `(Yelp Leads) Closed Won & Disarm`
* **Folder:** `(Yelp Leads)`
* **Trigger:** Opportunity Stage Changed ➔ `Closed Won` (`d499bc88-0911-4f9e-b2fc-00e3b56d9111`) in `Pipeline 6 - Yelp Leads`
* **Step 1:** Add Tag `yelp-booked` (`gREJrPWctDsUY0rqrhbr`)
* **Step 2:** Remove from `(Yelp Leads) Master Inbound Intake & Auto-Followup`
* **Step 3:** Remove from `(Yelp Leads) Quote Sent Follow-Up`
* **Step 4:** Send Booking Confirmation Email to `{{contact.email}}`:
  - Subject: `Booking Confirmed - The Sparkle Squad Co`
  - Body:
    > *"Hi {{contact.first_name}}, thank you for booking with The Sparkle Squad Co! We are excited to clean your home. Our team will reach out with your exact arrival window and details. Reply here anytime with questions!"*

---

### Workflow 4: `(Yelp Leads) Not Qualified / Archive`
* **Folder:** `(Yelp Leads)`
* **Trigger:** Opportunity Stage Changed ➔ `Not Qualified` (`a7903bea-6137-4ced-83c7-8983d1ab1e5a`) in `Pipeline 6 - Yelp Leads`
* **Step 1:** Remove from all Yelp active workflows:
  - Remove from `(Yelp Leads) Master Inbound Intake & Auto-Followup`
  - Remove from `(Yelp Leads) Quote Sent Follow-Up`
* **Step 2 (Optional):** Polite decline email via Yelp relay.

---

### Workflow 5: `(Yelp Leads) Customer Replied (Exit Followup)`
* **Folder:** `(Yelp Leads)`
* **Trigger:** Customer Replied (Channel: `Live_Chat`, `Custom`, or `Email`)
* **Filter:** Contact Tag contains `yelp-lead`
* **Step 1:** Remove from Workflow `(Yelp Leads) Master Inbound Intake & Auto-Followup`
* **Step 2:** Internal Notification ➔ `SMS` to `+17866004088`:
  > *"💬 Yelp Customer Replied: {{contact.name}} just sent a new message in Yelp chat. Open GHL to view and reply: https://app.gohighlevel.com/v2/location/ThUMNqsKmDfYKMF0jsBb/conversations"*

---

## 6. Zapier 3-Zap Architecture

### Zap 1: New Lead Intake
- **Trigger:** `Yelp Leads` ➔ `New Lead`
- **Action 1:** `LeadConnector` ➔ `Create/Update Contact`:
  - **Location:** `ThUMNqsKmDfYKMF0jsBb` (The Sparkle Squad Co)
  - **First Name / Last Name:** Lead Name
  - **Email:** `leadsapi+...` (Temporary Email Address from Yelp)
  - **Tags:** `source: yelp, yelp-lead`
  - **Yelp Service Type:** `Project Job Names`
  - **Yelp Bedrooms:** Survey Answer [Bedrooms]
  - **Yelp Bathrooms:** Survey Answer [Bathrooms]
  - **Yelp Cleaning Frequency:** Survey Answer [Frequency]
  - **Yelp Notes / Customer Request:** `Project Summary` / Survey text
  - **Yelp Lead ID:** `Lead ID`
- **Action 2:** `LeadConnector` ➔ `Create/Update Opportunity`:
  - **Pipeline:** `Pipeline 6 - Yelp Leads` (`RhbEvMN7bsMd2bekssNc`)
  - **Stage:** `New Leads` (`1dac1178-efc1-4f67-b508-b7fe4b0cc14b`)
  - **Opportunity Name:** `Yelp - {{contact.name}}`

### Zap 2: Phone Availability
- **Trigger:** `Yelp Leads` ➔ `Phone Availability`
- **Action:** `LeadConnector` ➔ `Create/Update Contact`:
  - **Location:** `ThUMNqsKmDfYKMF0jsBb`
  - **Email:** `leadsapi+...` (matches existing record)
  - **Phone:** `Phone Number` (from Yelp step 1)
  - **Tags:** `yelp-phone-captured`
  - **Yelp Phone Captured:** `Yes`

### Zap 3: Live 2-Way Chat Ingest (Render Bridge)
- **Trigger:** `Email by Zapier` ➔ `New Inbound Email` (e.g. `thesparklesquadco.[id]@zapiermail.com`)
  - Auto-forward from `info@thesparklesquadco.com` (Filter: `from: yelp.com`)
- **Action:** `Webhooks by Zapier` ➔ `POST`
  - **URL:** `https://cg-lead-bridge.onrender.com/webhook/yelp`
  - **Payload Type:** `json`
  - **Data Mapping:**
    | Key | Value (from Step 1) | Purpose |
    | :--- | :--- | :--- |
    | `location_id` | `ThUMNqsKmDfYKMF0jsBb` | Explicit multi-tenant route to Sparkle Squad |
    | `name` | `1. From Name` | Sender identification |
    | `subject` | `1. Subject` | Server parses customer name from subject |
    | `message` | `1. Body Plain` | Raw incoming message body |
    | `email` | *(Leave blank)* | Prevents owner email shielding hijack |

---

## 7. Middleware Server & Multi-Tenancy

- **Server URL:** `https://cg-lead-bridge.onrender.com`
- **Health Check:** `https://cg-lead-bridge.onrender.com/health` (Status: `healthy`)
- **Webhook Endpoint:** `https://cg-lead-bridge.onrender.com/webhook/yelp`
- **Location Mapping in Server:**
  - Token: `pit-e378012e-1c77-4b34-acb0-ddd61e22880e` mapped in `KNOWN_TOKENS`
  - Pipeline: `RhbEvMN7bsMd2bekssNc` (`Pipeline 6 - Yelp Leads`) mapped in `KNOWN_PIPELINES`
  - Brand Guardrail: Regex `/sparkle\s*squad/i` automatically associates messages with `ThUMNqsKmDfYKMF0jsBb`
  - Email Shielding: `thesparklesquadco` and `sparklesquad` blacklisted from becoming contact emails
