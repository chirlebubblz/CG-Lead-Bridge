# Capable Clean - GoHighLevel & Yelp Connection Blueprint

**Location Name:** Capable Clean  
**Location ID:** `s94e80clit6bCL9VBWgl`  
**Business Contact:** `info@capableclean.com` | `+17144553578` (714-455-3578)  
**Timezone:** `America/Los_Angeles`  

---

## 1. Custom Fields (Created & Live in Folder via API)

All dedicated Yelp custom fields have been provisioned in GoHighLevel for Capable Clean inside the dedicated folder **`Yelp Leads & Details`** (`THIu75BQDNHL5RY09oCC`):

| Field Name | Field Key | ID | Data Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `d8Kb0JjlSaAB95aXhKFw` | TEXT | Deep Clean, Standard Clean, Move-Out, etc. |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `IKoxb3Tb2zd2RhSj5hcq` | TEXT | Number of bedrooms specified in survey |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `uA561zqbbGFhEMGFKo0v` | TEXT | Number of bathrooms specified in survey |
| **Yelp Cleaning Frequency** | `contact.yelp_cleaning_frequency` | `KLBvCx30QNOKC4XFqAyo` | TEXT | One-time, Weekly, Bi-weekly, Monthly |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `ccKO7W0AWsSLYsGIBA0b` | LARGE_TEXT | Full questionnaire summary and customer notes |
| **Yelp Customer Notes** | `contact.yelp_customer_notes` | `zllrWfuyl4NySs75oK5i` | LARGE_TEXT | Customer notes reference |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `Kkm6Kz8HxwC2XpeC2e6A` | TEXT | Yelp's unique lead/conversation identifier |
| **Yelp Phone Captured** | `contact.yelp_phone_captured` | `PJ0TBTpbRX0tgNEm2IYH` | TEXT | Indicates whether direct phone was provided |

---

## 2. Standardized Lifecycle Tags (Created & Live via API)

The exact standardized tag suite matching Jacksonville is active:

| Tag Name | Purpose / Application Trigger |
| :--- | :--- |
| **`source: yelp`** | Applied upon initial lead creation |
| **`yelp-lead`** | Identifies active Yelp leads for workflow triggers |
| **`yelp-phone-captured`** | Applied when customer shares their direct mobile number |
| **`yelp-no-phone`** | Applied when customer only uses masked Yelp email relay (`leadsapi+...`) |
| **`yelp-quote-sent`** | Applied when quote message is dispatched |
| **`yelp-booked`** | Applied when the lead is successfully closed & booked |

---

## 3. Dedicated Yelp Pipeline (Created & Live via API)

Target Pipeline: **`Pipeline 5 - Yelp Leads Pipeline`** (ID: `GM4XXE47iTC20dCxblHp`)

| Stage | Stage ID | Yelp Ingestion Role |
| :--- | :--- | :--- |
| **New Leads** | `e24f6709-f5ad-4952-9ce0-d1f68ffa10f3` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `c5b9ed3f-6c36-4856-aeac-b82bc883763a` | When customer doesn't respond to greeting |
| **Quoted** | `45d67cf2-27f2-457a-8e82-efc324e87d24` | Moved when quote is delivered |
| **Follow Up (Manual)** | `23365b39-46de-443a-9cec-990699a77e3e` | Manual sales rep follow-up |
| **Follow Up (Automated)** | `a4caf540-6396-482c-a4b5-3900588a6191` | Automated follow-up sequence |
| **Interested but not booked**| `2471a6fb-b48d-4e30-9837-073ad4c3b854` | Active interest / questions pending |
| **Not Qualified** | `442c3840-8dde-4d62-b95b-3668c55aa008` | Outside service area / declined |
| **Closed Won** | `3b03db9a-6a2d-47a2-a821-73850b6bbd4c` | Successfully booked cleaning job |

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
  - Pipeline: `Pipeline 5 - Yelp Leads Pipeline` (`GM4XXE47iTC20dCxblHp`)
  - Stage: `New Leads` (`e24f6709-f5ad-4952-9ce0-d1f68ffa10f3`)
  - Opportunity Name: `Yelp - {{contact.name}}`
  - Status: `Open`

- **Action 2: Bed & Bath Guardrail (If / Else)**
  - **Branch 1 (Both Present):** `contact.yelp_bedrooms is not empty` **AND** `contact.yelp_bathrooms is not empty`
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - From Name: `Capable Clean`
      - Subject: `Your Cleaning Request - Capable Clean`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Capable Clean on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote and check availability, what is your approximate square footage and preferred days for your cleaning? You can reply directly here to chat with us on Yelp, or call/text us directly at (714) 455-3578.\n\nBest regards,\nThe Capable Clean Team\n(714) 455-3578"*
  - **Branch 2 (Fallback - Either or Both Missing):** *Default Else*
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - From Name: `Capable Clean`
      - Subject: `Your Cleaning Request - Capable Clean`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Capable Clean on Yelp! We received your request for a {{contact.yelp_service_type}}.\n\nTo give you an accurate quote and check availability, could you share how many bedrooms and bathrooms you have, as well as your approximate square footage? You can reply directly here to chat with us on Yelp, or call/text us directly at (714) 455-3578.\n\nBest regards,\nThe Capable Clean Team\n(714) 455-3578"*

- **Action 3: Wait 90 Seconds**
  - Wait Time: `90 Seconds` (Buffer for companion Zap 2 to attach customer phone number)

- **Action 4: Internal Team Alert**
  - Action: `Internal Notification` (Email or In-App Notification to owner/sales team)
  - Message:
    > *"🚨 New Yelp Lead: {{contact.name}} requested {{contact.yelp_service_type}}.\nPhone: {{contact.phone}}\nInitial response sent via Yelp Relay. View conversation in GHL: https://app.gohighlevel.com"*

- **Action 5: Wait 24 Hours (No-Answer Delay)**
  - Wait Time: `24 Hours`
  - Settings: **Stop on Response = ON**

- **Action 6: Update Opportunity ➔ Stage: `No Answer`**
  - Pipeline: `Pipeline 5 - Yelp Leads Pipeline`
  - Stage: `No Answer` (`c5b9ed3f-6c36-4856-aeac-b82bc883763a`)

- **Action 7: Send Follow-Up Email #1 (24h Nudge via Yelp Relay)**
  - To: `{{contact.email}}`
  - From Name: `Capable Clean`
  - Subject: `Following up on your cleaning request - Capable Clean`
  - Body:
    > *"Hi {{contact.first_name}},\n\nI wanted to follow up on your cleaning inquiry on Yelp for {{contact.yelp_service_type}}.\n\nWere you still looking to get a quote or schedule a cleaning for this week? Let us know and we'd be happy to get you taken care of!\n\nBest regards,\nThe Capable Clean Team\n(714) 455-3578"*

- **Action 8: Wait 48 Hours**
  - Wait Time: `48 Hours`

- **Action 9: Update Opportunity ➔ Stage: `Follow Up (Automated)`**
  - Pipeline: `Pipeline 5 - Yelp Leads Pipeline`
  - Stage: `Follow Up (Automated)` (`a4caf540-6396-482c-a4b5-3900588a6191`)

- **Action 10: Send Final Follow-Up Email #2 (72h Check-in)**
  - To: `{{contact.email}}`
  - From Name: `Capable Clean`
  - Subject: `Checking in - Capable Clean`
  - Body:
    > *"Hi {{contact.first_name}},\n\nJust checking in one last time regarding your {{contact.yelp_service_type}} request. If you still need cleaning service or have any questions about pricing, feel free to reply directly here or reach us at (714) 455-3578.\n\nHave a great week!\nThe Capable Clean Team"*

---

### Critical Workflow Settings (Gear Icon in Builder):
* **Allow Re-entry:** ❌ **Off**
* **Stop on Response:** ✅ **ON** *(Crucial: As soon as the customer replies at any point, GHL automatically halts the workflow so they never receive follow-up automated nudges!)*
* **Status:** **Published**

---

## 5. Companion Workflows (Recommended Standard Suite)

### Workflow 2: `(Yelp Leads) Quote Sent Follow-Up`
* **Trigger:** Opportunity Stage Changed ➔ `Quoted` (`45d67cf2-27f2-457a-8e82-efc324e87d24`)
* **Settings:** Allow Re-entry = OFF, **Stop on Response = ON**
* **Step 1:** Add Tag `yelp-quote-sent`
* **Step 2:** Remove from Workflow `(Yelp Leads) Master Inbound Intake & Auto-Followup`
* **Step 3:** Wait `48 Hours`
* **Step 4:** Send Email to `{{contact.email}}` (Quote Nudge #1):
  > *"Hi {{contact.first_name}}, I wanted to follow up and see if you had any questions regarding the quote we sent over for your {{contact.yelp_service_type}}. We have availability coming up this week—let us know if you'd like to get scheduled! — The Capable Clean Team"*
* **Step 5:** Wait `48 Hours`
* **Step 6:** Move Opportunity ➔ `Follow Up (Automated)` (`a4caf540-6396-482c-a4b5-3900588a6191`)
* **Step 7:** Send Final Quote Check-in Email #2

### Workflow 3: `(Yelp Leads) Closed Won & Booking Tag`
* **Trigger:** Opportunity Stage Changed ➔ `Closed Won` (`3b03db9a-6a2d-47a2-a821-73850b6bbd4c`)
* **Step 1:** Add Tag `yelp-booked`
* **Step 2:** Remove from Workflows 1 & 2 (`(Yelp Leads) Master Inbound Intake & Auto-Followup` and `(Yelp Leads) Quote Sent Follow-Up`)

### Workflow 4: `(Yelp Leads) Customer Replied (Exit Followup)`
* **Trigger:** Customer Replied (Channel: `Live_Chat`, `Custom`, or `Email`)
* **Filter:** Contact Tag contains `yelp-lead`
* **Action:** Remove from Workflow `(Yelp Leads) Master Inbound Intake & Auto-Followup`

---

## 6. Zapier Mapping Guide (For Capable Clean)

### Zap 1: Yelp Leads ➔ GoHighLevel
- **Trigger:** Yelp Leads ➔ `New Lead`
- **Action 1:** LeadConnector ➔ `Create/Update Contact`
  - **Location:** `s94e80clit6bCL9VBWgl` (Capable Clean)
  - **First Name / Last Name:** Lead Name
  - **Email:** `leadsapi+...` (Temporary Email Address from Yelp)
  - **Tags:** `source: yelp, yelp-lead`
  - **Yelp Service Type:** `Project Job Names`
  - **Yelp Bedrooms:** Survey Answer [Bedrooms]
  - **Yelp Bathrooms:** Survey Answer [Bathrooms]
  - **Yelp Cleaning Frequency:** Survey Answer [Frequency]
  - **Yelp Notes / Customer Request:** `Project Summary` / Survey text
  - **Yelp Lead ID:** `Lead ID`
- **Action 2:** LeadConnector ➔ `Create/Update Opportunity`
  - **Pipeline:** `Pipeline 5 - Yelp Leads Pipeline` (`GM4XXE47iTC20dCxblHp`)
  - **Stage:** `New Leads` (`e24f6709-f5ad-4952-9ce0-d1f68ffa10f3`)
  - **Opportunity Name:** `Yelp - {{Customer Name}}`

### Zap 2 (Companion): Yelp Phone Availability ➔ Update Contact
- **Trigger:** Yelp Leads ➔ `Phone Availability`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Email:** `leadsapi+...` (matches existing record)
  - **Phone:** `Phone Number` (from Yelp step 1)
  - **Tags:** `yelp-phone-captured`
  - **Yelp Phone Captured:** `Yes`

### Zap 3: Live 2-Way Chat Inbound Bridge (Email ➔ Render ➔ GHL)
- **Trigger:** `Email by Zapier` ➔ `New Inbound Email` (e.g. `capableclean.[id]@zapiermail.com`)
- **Action:** `Webhooks by Zapier` ➔ `POST`
  - **URL:** `https://cg-lead-bridge.onrender.com/webhook/yelp`
  - **Payload Type:** `json`
  - **Data Mapping:**
    | Key | Value (from Step 1) | Notes |
    | :--- | :--- | :--- |
    | `name` | `1. From Name` | Used for sender identification |
    | `subject` | `1. Subject` | Server parses customer name from this |
    | `message` | `1. Body Plain` | The raw incoming Yelp message body |
    | `email` | *(Leave empty)* | Prevents owner email hijacking |
  - **Headers:**
    - `Content-Type`: `application/json`

---

## 6. Live Render Middleware Service
- **Service Name:** `cg-lead-bridge`
- **Live URL:** `https://cg-lead-bridge.onrender.com`
- **Health Check:** `https://cg-lead-bridge.onrender.com/health` (Verified: `healthy`)
- **Webhook Endpoint:** `https://cg-lead-bridge.onrender.com/webhook/yelp`
- **Target Location ID:** `s94e80clit6bCL9VBWgl`

