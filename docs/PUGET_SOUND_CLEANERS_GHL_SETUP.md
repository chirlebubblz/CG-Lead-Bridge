# Puget Sound Cleaners — Yelp ↔ GoHighLevel Deployment Guide

**Business:** Puget Sound Cleaners  
**Address:** 1525 11th Ave, Fl 5, Seattle, WA 98122  
**GHL Location ID:** `MucxtGIfmvLViGQWD0CG`  
**GHL Private Integration Token:** `pit-3e2b6d46-5ff3-472c-bd48-16ee70d76fbc`  
**Standard:** Jacksonville Golden Master (Zero Outbound Customer SMS / Pure Email Relay Standard)

---

## 1. Custom Fields Status (Folder: `Yelp Lead Details`)

Folder ID: `TllcZV0VDzpPaoXVs1La`

| Field Name | Key | ID | Type |
| :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `MPWbzTG27cBfCRmRXxQ9` | TEXT |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `nSI3DXfn36at0AAMKEqR` | TEXT |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `qw8PgZeGE93IiBG5mcwh` | TEXT |
| **Yelp Cleaning Frequency** | `contact.yelp_cleaning_frequency` | `CzUZPm7AqEnEfgHBqOam` | TEXT |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `DgCDxzJcWvEs7qjpxzbg` | LARGE_TEXT |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `VxYsxN4PvMUo3fcc5VU2` | TEXT |
| **Yelp Phone Captured** | `contact.yelp_phone_captured` | `hm6rTooUTVskHMriXY0r` | TEXT |

---

## 2. Standardized Tags

| Tag Name | Tag ID | Role |
| :--- | :--- | :--- |
| `source: yelp` | `CU3DBZXNNCIrsOY85Lu7` | Initial lead ingestion tag (Workflow Trigger) |
| `yelp-lead` | `J4XTMj0lOPgZqZlL9Ecv` | Active lead identifier |
| `yelp-phone-captured` | `wsU3EqKsA51I9cdS7uO8` | Added when customer phone is captured via Zap 2 |
| `yelp-no-phone` | `54lPovSp7k0tD3Q7xxZy` | Added when only Yelp relay email exists |
| `yelp-quote-sent` | `3uNsx9oddeXPozwD3ZAB` | Added when price estimate is delivered |
| `yelp-booked` | `05kKmxsKQfVRCS28sMGO` | Added when appointment/job is booked |

---

## 3. Dedicated Yelp Pipeline

Target Pipeline: **`Pipeline 7 - Yelp Leads Pipeline`** (`86PQ8Pz1Fo7R8oo2MTQQ`)

| Stage Name | Stage ID | Stage Role |
| :--- | :--- | :--- |
| **New Leads** | `8d0c1f69-1903-40db-8e92-d337792ef202` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `866252d0-0ba8-4865-bf9e-95c554e148f0` | Moved after 24h if customer hasn't responded |
| **Quoted** | `c4669d2c-4706-4edf-b3cb-088265a9c9cc` | Moved when quote is delivered |
| **Follow Up (Manual)** | `9799dc7f-f1c6-4da7-bcf0-4c32e6a2c4ba` | Rep manual outreach |
| **Follow Up (Automated)** | `4f868046-9a6a-4805-845e-721843184473` | Automated nurture / 48h-72h drip stage |
| **Interested but not booked** | `38ed6741-877c-40b0-9bce-cac09a6f4416` | Active objection / evaluating |
| **Not Qualified** | `92a4a0ba-cf0e-4391-a2ab-22ec33ed66a8` | Out of Seattle area / declined |
| **Closed Won** | `5d2b4460-54d1-4663-8665-d6837d4e8ed7` | Booked customer |

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
  - Pipeline: `Pipeline 7 - Yelp Leads Pipeline` (`86PQ8Pz1Fo7R8oo2MTQQ`)
  - Stage: `New Leads` (`8d0c1f69-1903-40db-8e92-d337792ef202`)
  - Opportunity Name: `Yelp - {{contact.name}}`
  - Status: `Open`

- **Action 2: Bed & Bath Guardrail (If / Else)**
  - **Branch 1 (Both Present):** `contact.yelp_bedrooms is not empty` **AND** `contact.yelp_bathrooms is not empty`
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - From Name: `Puget Sound Cleaners`
      - Subject: `Your Cleaning Request - Puget Sound Cleaners`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Puget Sound Cleaners on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote and check availability, what is your approximate square footage and preferred days for your cleaning? You can reply directly here to chat with us on Yelp!\n\nBest regards,\nPuget Sound Cleaners Team"*
  - **Branch 2 (Fallback - Either or Both Missing):** *Default Else*
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - From Name: `Puget Sound Cleaners`
      - Subject: `Your Cleaning Request - Puget Sound Cleaners`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Puget Sound Cleaners on Yelp! We received your request for a {{contact.yelp_service_type}}.\n\nTo give you an accurate quote and check availability, could you share how many bedrooms and bathrooms you have, as well as your approximate square footage? You can reply directly here to chat with us on Yelp!\n\nBest regards,\nPuget Sound Cleaners Team"*

- **Action 3: Wait 90 Seconds**
  - Wait Time: `90 Seconds` (Buffer for companion Zap 2 to attach customer phone number)

- **Action 4: Internal Team Alert**
  - Action: `Internal Notification` (Email or Internal App Notification to owner/sales reps)
  - Message:
    > *"🚨 New Yelp Lead: {{contact.name}} requested {{contact.yelp_service_type}}.\nPhone: {{contact.phone}}\nInitial response sent via Yelp Relay. View conversation in GHL: https://app.gohighlevel.com"*

- **Action 5: Wait 24 Hours (No-Answer Delay)**
  - Wait Time: `24 Hours`

- **Action 6: Update Opportunity ➔ Stage: `No Answer`**
  - Pipeline: `Pipeline 7 - Yelp Leads Pipeline`
  - Stage: `No Answer` (`866252d0-0ba8-4865-bf9e-95c554e148f0`)

- **Action 7: Send Follow-Up Email #1 (24h Nudge via Yelp Relay)**
  - To: `{{contact.email}}`
  - From Name: `Puget Sound Cleaners`
  - Subject: `Following up on your cleaning request - Puget Sound Cleaners`
  - Body:
    > *"Hi {{contact.first_name}},\n\nI wanted to follow up on your cleaning inquiry on Yelp for {{contact.yelp_service_type}}.\n\nWere you still looking to get a quote or schedule a cleaning for this week? Let us know and we'd be happy to get you taken care of!\n\nBest,\nPuget Sound Cleaners Team"*

- **Action 8: Wait 48 Hours**
  - Wait Time: `48 Hours`

- **Action 9: Update Opportunity ➔ Stage: `Follow Up (Automated)`**
  - Pipeline: `Pipeline 7 - Yelp Leads Pipeline`
  - Stage: `Follow Up (Automated)` (`4f868046-9a6a-4805-845e-721843184473`)

- **Action 10: Send Final Follow-Up Email #2 (72h Check-in)**
  - To: `{{contact.email}}`
  - From Name: `Puget Sound Cleaners`
  - Subject: `Checking in - Puget Sound Cleaners`
  - Body:
    > *"Hi {{contact.first_name}},\n\nJust checking in one last time regarding your {{contact.yelp_service_type}} request. If you still need cleaning service or have any questions about pricing, feel free to reply directly here.\n\nHave a great week!\nPuget Sound Cleaners Team"*

---

### Critical Workflow Settings (Gear Icon in Builder):
* **Allow Re-entry:** ❌ **Off**
* **Stop on Response:** ✅ **ON** *(Crucial: As soon as the customer replies at any point, GHL automatically halts the workflow so they never receive follow-up automated nudges!)*
* **Status:** **Published**

---

## 5. Zapier 3-Zap Architecture

### Zap 1: Ingestion
- **Trigger:** Yelp Leads ➔ `New Lead`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - Location: `MucxtGIfmvLViGQWD0CG`
  - Email: `Temporary Email Address` (`leadsapi+...`)
  - Tags: `source: yelp, yelp-lead`
  - Custom Fields: Map `Yelp Service Type`, `Yelp Bedrooms`, `Yelp Bathrooms`, `Yelp Cleaning Frequency`, `Yelp Notes / Customer Request`, `Yelp Lead ID`

### Zap 2: Phone Number Availability
- **Trigger:** Yelp Leads ➔ `Phone Availability`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - Location: `MucxtGIfmvLViGQWD0CG`
  - Email: `Temporary Email Address` (`leadsapi+...`) *(Matches existing contact)*
  - Phone: `Phone Number`
  - Tags: `yelp-phone-captured`
  - Yelp Phone Captured: `Yes`

### Zap 3: Live 2-Way Chat Ingest (Render Bridge)
- **Trigger:** Email by Zapier ➔ `New Inbound Email` (Forwarded from business Gmail)
- **Action:** Webhooks by Zapier ➔ `POST`
  - URL: `https://cg-lead-bridge.onrender.com/webhook/yelp`
  - Payload Type: `json`
  - Data:
    - `location_id`: `MucxtGIfmvLViGQWD0CG`
    - `name`: `1. From Name`
    - `subject`: `1. Subject`
    - `message`: `1. Body Plain`
    - `email`: *(Leave blank)*
