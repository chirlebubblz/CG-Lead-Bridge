# Rapids Cleaning Services — Yelp ↔ GoHighLevel Deployment Guide

**Business:** Rapids Cleaning Services  
**Address:** 4917 Deer Creek Cir S, Washington, MI  
**Owner / Notification Contact:** `zach@rapidscleaningservices.com` | `+12483450221`  
**GHL Location ID:** `8duUHE4ENvhQTCtg3z6o`  
**GHL Private Integration Token:** `pit-us-19731ed6-4097-48e4-89aa-934c295b91d0`  
**Standard:** Jacksonville Golden Master (Zero Outbound Customer SMS / Pure Email Relay Standard)

---

## 1. Custom Fields Status (Folder: `Yelp Lead Details`)

Folder ID: `fKwcsREYUlDFZYCRjtnS`

| Field Name | Key | ID | Type |
| :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `KH5DvLfnkL8naKsiUB9X` | TEXT |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `McT26pdprbCTWlFCgcZH` | TEXT |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `s8oenOwOibaRCMcMHAIx` | TEXT |
| **Yelp Cleaning Frequency** | `contact.yelp_cleaning_frequency` | `QqKWwcJoVViq4q7iTvAr` | TEXT |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `fdJu3yspvo92Yczg6Pwd` | LARGE_TEXT |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `owoZ7ZXYbiQeM8dla8AI` | TEXT |
| **Yelp Phone Captured** | `contact.yelp_phone_captured` | `lYpvGAZg8mkvyNCYZcjV` | TEXT |

---

## 2. Standardized Tags

| Tag Name | Tag ID | Role |
| :--- | :--- | :--- |
| `source: yelp` | `V8YmWBKl59DV5gIinTef` | Initial lead ingestion tag (Workflow Trigger) |
| `yelp-lead` | `gFA8954iY9cVRG0nCWWk` | Active lead identifier |
| `yelp-phone-captured` | `95VAmqkALLfuW9FplT0c` | Added when customer phone is captured via Zap 2 |
| `yelp-no-phone` | `TDwkez4TmrXEkgv8I3WJ` | Added when only Yelp relay email exists |
| `yelp-quote-sent` | `qJ1h4VDb4pFlYBB6U0GZ` | Added when price estimate is delivered |
| `yelp-booked` | `6Rtf4hcivKft0hqGXT90` | Added when appointment/job is booked |

---

## 3. Dedicated Yelp Pipeline

Target Pipeline: **`Pipeline 5 - Yelp Leads Pipeline`** (`bHG1epKxLmE812KHzc78`)

| Stage Name | Stage ID | Stage Role |
| :--- | :--- | :--- |
| **New Leads** | `b7c17a87-4ba9-4fb2-b73e-a4b63e308d42` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `d479526f-4c2f-4901-b7be-38ced645d9b3` | Moved after 24h if customer hasn't responded |
| **Quoted** | `b73d6777-d52f-40e5-9be6-3b56f700efae` | Moved when quote is delivered |
| **Follow Up (Manual)** | `a17c5e1d-80cc-42bd-8dad-754b96a6c1d3` | Rep manual outreach |
| **Follow Up (Automated)** | `3c694f1c-0701-4ca6-b4f7-0649a82a4138` | Automated nurture / 48h-72h drip stage |
| **Interested but not booked** | `0d9bc083-5f4f-49a6-8ac1-7c0c9bfc2bdb` | Active objection / evaluating |
| **Not Qualified** | `ec343e95-603d-47aa-945b-9d90a6e73a95` | Out of service area / declined |
| **Closed Won** | `f5345572-6e44-4e8c-a15a-5dea714c8dac` | Booked customer |

---

## 4. The Master Workflow: Up-To-Date Standard (Zero Customer SMS)

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
  - Pipeline: `Pipeline 5 - Yelp Leads Pipeline` (`bHG1epKxLmE812KHzc78`)
  - Stage: `New Leads` (`b7c17a87-4ba9-4fb2-b73e-a4b63e308d42`)
  - Opportunity Name: `Yelp - {{contact.name}}`
  - Status: `Open`

- **Action 2: Bed & Bath Guardrail (If / Else)**
  - **Branch 1 (Both Present):** `contact.yelp_bedrooms is not empty` **AND** `contact.yelp_bathrooms is not empty`
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - From Name: `Rapids Cleaning Services`
      - Subject: `Your Cleaning Request - Rapids Cleaning Services`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Rapids Cleaning Services on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote and check availability, what is your approximate square footage and preferred days for your cleaning? You can reply directly here to chat with us on Yelp!\n\nBest regards,\nRapids Cleaning Services Team"*
  - **Branch 2 (Fallback - Either or Both Missing):** *Default Else*
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - From Name: `Rapids Cleaning Services`
      - Subject: `Your Cleaning Request - Rapids Cleaning Services`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Rapids Cleaning Services on Yelp! We received your request for a {{contact.yelp_service_type}}.\n\nTo give you an accurate quote and check availability, could you share how many bedrooms and bathrooms you have, as well as your approximate square footage? You can reply directly here to chat with us on Yelp!\n\nBest regards,\nRapids Cleaning Services Team"*

- **Action 3: Wait 90 Seconds**
  - Wait Time: `90 Seconds` (Buffer for companion Zap 2 to attach customer phone number)

- **Action 4: Internal Team Alert**
  - Action: `Internal Notification` (Email or Internal App Notification to owner/sales reps)
  - Message:
    > *"🚨 New Yelp Lead: {{contact.name}} requested {{contact.yelp_service_type}}.\nPhone: {{contact.phone}}\nInitial response sent via Yelp Relay. View conversation in GHL: https://app.gohighlevel.com"*

- **Action 5: Wait 24 Hours (No-Answer Delay)**
  - Wait Time: `24 Hours`

- **Action 6: Update Opportunity ➔ Stage: `No Answer`**
  - Pipeline: `Pipeline 5 - Yelp Leads Pipeline`
  - Stage: `No Answer` (`d479526f-4c2f-4901-b7be-38ced645d9b3`)

- **Action 7: Send Follow-Up Email #1 (24h Nudge via Yelp Relay)**
  - To: `{{contact.email}}`
  - From Name: `Rapids Cleaning Services`
  - Subject: `Following up on your cleaning request - Rapids Cleaning Services`
  - Body:
    > *"Hi {{contact.first_name}},\n\nI wanted to follow up on your cleaning inquiry on Yelp for {{contact.yelp_service_type}}.\n\nWere you still looking to get a quote or schedule a cleaning for this week? Let us know and we'd be happy to get you taken care of!\n\nBest,\nRapids Cleaning Services Team"*

- **Action 8: Wait 48 Hours**
  - Wait Time: `48 Hours`

- **Action 9: Update Opportunity ➔ Stage: `Follow Up (Automated)`**
  - Pipeline: `Pipeline 5 - Yelp Leads Pipeline`
  - Stage: `Follow Up (Automated)` (`3c694f1c-0701-4ca6-b4f7-0649a82a4138`)

- **Action 10: Send Final Follow-Up Email #2 (72h Check-in)**
  - To: `{{contact.email}}`
  - From Name: `Rapids Cleaning Services`
  - Subject: `Checking in - Rapids Cleaning Services`
  - Body:
    > *"Hi {{contact.first_name}},\n\nJust checking in one last time regarding your {{contact.yelp_service_type}} request. If you still need cleaning service or have any questions about pricing, feel free to reply directly here.\n\nHave a great week!\nRapids Cleaning Services Team"*

---

### Critical Workflow Settings (Gear Icon in Builder):
* **Allow Re-entry:** ❌ **Off**
* **Stop on Response:** ✅ **ON** *(Crucial: As soon as the customer replies at any point, GHL automatically halts the workflow so they never receive follow-up automated nudges!)*
* **Status:** **Published**

---

## 5. Companion Workflows (Recommended)

### Workflow 2: `(Yelp Leads) Quote Sent Follow-Up`
* **Trigger:** Opportunity Stage Changed ➔ `Quoted` (`b73d6777-d52f-40e5-9be6-3b56f700efae`)
* **Settings:** Allow Re-entry = OFF, **Stop on Response = ON**
* **Step 1:** Add Tag `yelp-quote-sent`
* **Step 2:** Remove from Workflow `(Yelp Leads) Master Inbound Intake & Auto-Followup`
* **Step 3:** Wait `48 Hours`
* **Step 4:** Send Email to `{{contact.email}}` (Quote Nudge #1):
  > *"Hi {{contact.first_name}}, I wanted to follow up and see if you had any questions regarding the quote we sent over for your {{contact.yelp_service_type}}. We have availability coming up this week—let us know if you'd like to get scheduled! — Rapids Cleaning Services"*
* **Step 5:** Wait `48 Hours`
* **Step 6:** Move Opportunity ➔ `Follow Up (Automated)` (`3c694f1c-0701-4ca6-b4f7-0649a82a4138`)
* **Step 7:** Send Email to `{{contact.email}}` (Final Quote Check-in #2)
* **Step 8:** Internal alert to sales rep if still no response after 4 days.

---

### Workflow 3: `(Yelp Leads) Closed Won & Disarm`
* **Trigger:** Opportunity Stage Changed ➔ `Closed Won` (`f5345572-6e44-4e8c-a15a-5dea714c8dac`)
* **Step 1:** Add Tag `yelp-booked`
* **Step 2:** Remove from `(Yelp Leads) Master Inbound Intake & Auto-Followup`
* **Step 3:** Remove from `(Yelp Leads) Quote Sent Follow-Up`
* **Step 4:** Send Booking Confirmation Email to `{{contact.email}}`:
  > *"Hi {{contact.first_name}}, thank you for booking with Rapids Cleaning Services! We are excited to clean your home. Our team will reach out with your exact arrival window. Reply here anytime with questions!"*

---

### Workflow 4: `(Yelp Leads) Not Qualified / Archive`
* **Trigger:** Opportunity Stage Changed ➔ `Not Qualified` (`ec343e95-603d-47aa-945b-9d90a6e73a95`)
* **Step 1:** Remove from all Yelp active workflows
* **Step 2 (Optional):** Polite decline email via Yelp relay.

---

## 6. Zapier 3-Zap Architecture

### Zap 1: Ingestion
- **Trigger:** Yelp Leads ➔ `New Lead`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - Location: `8duUHE4ENvhQTCtg3z6o`
  - Email: `Temporary Email Address` (`leadsapi+...`)
  - Tags: `source: yelp, yelp-lead`
  - Custom Fields: Map `Yelp Service Type`, `Yelp Bedrooms`, `Yelp Bathrooms`, `Yelp Cleaning Frequency`, `Yelp Notes / Customer Request`, `Yelp Lead ID` (`owoZ7ZXYbiQeM8dla8AI`)

### Zap 2: Phone Number Availability
- **Trigger:** Yelp Leads ➔ `Phone Availability`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - Location: `8duUHE4ENvhQTCtg3z6o`
  - Email: `Temporary Email Address` (`leadsapi+...`) *(Matches existing contact)*
  - Phone: `Phone Number`
  - Tags: `yelp-phone-captured`
  - Yelp Phone Captured: `Yes`

### Zap 3: Live 2-Way Chat Ingest (Render Bridge)
- **Trigger:** Email by Zapier ➔ `New Inbound Email`
  - Auto-forward from `zach@rapidscleaningservices.com` (Filter: `from: yelp.com`)
- **Action:** Webhooks by Zapier ➔ `POST`
  - URL: `https://cg-lead-bridge.onrender.com/webhook/yelp`
  - Payload Type: `json`
  - Data:
    - `location_id`: `8duUHE4ENvhQTCtg3z6o`
    - `name`: `1. From Name`
    - `subject`: `1. Subject`
    - `message`: `1. Body Plain`
    - `email`: *(Leave blank)*
