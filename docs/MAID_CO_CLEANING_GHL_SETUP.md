# Maid Co Cleaning - GoHighLevel & Yelp Connection Blueprint

**Location Name:** Maid Co Cleaning  
**Location ID:** `IoU6ToP3okYmCe2CKNly`  
**Company ID:** `ZnXmnDTmK0MNl5R2OH3C`  
**Business Contact:** Caleb Phibbs (`hello@maidcocleaningservices.com` | `+19189927702`)  
**Timezone:** `America/Los_Angeles`  
**Address:** 8810 S Yale Ave Unit N, Tulsa, OK 74037  
**Website:** https://happy-house-keeping-llc-l8v3o3.netlify.app/  

---

## 1. Custom Fields (Created & Live via API)

All dedicated Yelp custom fields have been provisioned in GoHighLevel inside folder **`Yelp Lead Details`** (Folder ID: `5xEIp17y8BkmAeG5eJZL`):

| Field Name | Field Key | ID | Data Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `17oMFABUW3TCNfU2Y48J` | TEXT | Deep Clean, Standard Clean, Move-Out, etc. |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `vXlxwWcOKaPUu3KK0gQU` | TEXT | Number of bedrooms specified in survey |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `XduOCkQkaonrIKauCAC5` | TEXT | Number of bathrooms specified in survey |
| **Yelp Cleaning Frequency** | `contact.yelp_cleaning_frequency` | `IQQlIJXp17Liw1aVo8Aq` | TEXT | Cleaning frequency (one-time, weekly, bi-weekly) |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `p0cr3YzKX4mYhZNXsl3m` | LARGE_TEXT | Full questionnaire summary and customer notes |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `ISkhiu9o4RRQ5O8VxgRL` | TEXT | Yelp's unique lead/conversation identifier |
| **Yelp Phone Captured** | `contact.yelp_phone_captured` | `bd4Fnb9OcWOFJOI3oYNS` | TEXT | Customer direct phone captured from Yelp |

> **Folder Organization in GHL UI:**
> All 7 custom fields are nested inside the folder **`Yelp Lead Details`** (`5xEIp17y8BkmAeG5eJZL`) under **Settings ➔ Custom Fields**.

---

## 2. Tags (Created & Live via API)

Standardized lifecycle tags have been provisioned:

| Tag Name | Tag ID | Application Trigger |
| :--- | :--- | :--- |
| **`source: yelp`** | `mIOShQLzGKLSDtAMAtBF` | Applied upon lead creation |
| **`yelp-lead`** | `njrvT2wc1hSTGKrOG8xm` | Identifies active Yelp leads |
| **`yelp-phone-captured`** | `1Z9DqIP9qazyk3x5WnFt` | Applied when direct customer phone is provided |
| **`yelp-no-phone`** | `In84awG7NZA6P222A4cT` | Applied when customer only uses masked Yelp relay |
| **`yelp-quote-sent`** | `qWNu1FowoMTUJr0QliP3` | Applied when quote message is dispatched |
| **`yelp-booked`** | `4cEg6WfVN0UNJKzuxr8p` | Applied when booking is confirmed |

---

## 3. Pipelines & Opportunity Routing

Target Pipeline: **`Pipeline 6 - Yelp Leads Pipeline`** (`q2zWSOq62ky1oZZpQMNQ`)

| Stage | Stage ID | Yelp Ingestion Role |
| :--- | :--- | :--- |
| **New Leads** | `4bc35075-b88c-4433-98b4-b55b5a78bbeb` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `b2aa4fb7-bcd7-40ef-af6e-9dc61d38eaf6` | When customer doesn't respond to greeting |
| **Quoted** | `de029f16-e8dc-4713-8b45-4665c6d79bae` | Moved when quote is delivered |
| **Follow Up (Manual)** | `6596def2-9508-4085-b5fa-f0b2432c6018` | Rep manual follow up |
| **Follow Up (Automated)** | `23252d1b-b1df-4dd4-bb2f-99e8bad00b11` | Drip sequence |
| **Interested but not booked**| `d660c584-7c2f-40c9-82e3-1eba576c5843` | Active interest |
| **Not Qualified** | `6e592782-b3e1-4bdb-ba99-a88dbe6140f8` | Outside service area / declined |
| **Closed Won** | `4ed0bd18-79b6-4124-9198-7ded2d464f41` | Booking confirmed |

---

## 4. Workflow Blueprint (Folder: `(Yelp Leads)`) — Updated Jacksonville Standard

Under **Automation ➔ Workflows ➔ Folder: `(Yelp Leads)`**:

> **🚨 Production Standard Update (Pure Email Relay — Zero Outbound Customer SMS):**  
> All customer-facing messages route **100% via Email (`leadsapi+...`)**. When sent via the Yelp email relay, Yelp converts it directly into a native in-app chat bubble inside the customer's Yelp app with 100% delivery.  
> Direct customer SMS from GHL is strictly avoided to eliminate A2P 10DLC compliance/carrier filtering risks and unsolicited text complaints. The phone number is preserved on the contact record for sales reps to call/text manually.

### Workflow 1: `(Yelp Leads) Master Inbound Intake & Auto-Followup`
> **⏳ Pending Setup Note:** Workflow 1 `(Yelp Leads) Master Inbound Intake & Auto-Followup` still needs to be created in the GHL UI. Once created, add its Workflow ID for `IoU6ToP3okYmCe2CKNly` to `KNOWN_INTAKE_WORKFLOWS` in `src/services/ghl.ts`.

- **Workflow Settings:** Turn **Stop on Response = ON**
- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Step 1: Create/Update Opportunity:**
  - Pipeline: `Pipeline 6 - Yelp Leads Pipeline` (`q2zWSOq62ky1oZZpQMNQ`)
  - Stage: `New Leads` (`4bc35075-b88c-4433-98b4-b55b5a78bbeb`)
  - Opportunity Name: `Yelp - {{contact.name}}`
- **Step 2 (Bed & Bath Guardrail If/Else Condition):**
  - **Branch 1: Both Bed & Bath Available** (`contact.yelp_bedrooms is not empty` AND `contact.yelp_bathrooms is not empty`)
    - **Action:** Send Email to `{{contact.email}}` (`leadsapi+...` relay):
      - **Subject:** `Your Cleaning Request - Maid Co Cleaning`
      - **Body (Plain Text):**
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Maid Co Cleaning on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote, what is your approximate square footage and ideal time frame? You can also reply directly here or call/text us directly at (918) 992-7702."*
  - **Branch 2: Fallback (Either or Both Missing - Default Else):**
    - **Action:** Send Email to `{{contact.email}}` (`leadsapi+...` relay):
      - **Subject:** `Your Cleaning Request - Maid Co Cleaning`
      - **Body (Plain Text):**
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Maid Co Cleaning on Yelp! We received your cleaning inquiry.\n\nCould you let us know your approximate square footage, number of bedrooms/bathrooms, and preferred days for your cleaning? You can reply directly here or call/text us directly at (918) 992-7702."*
- **Step 3: Wait (90 Seconds):**
  - Essential buffer: allows Yelp's companion Zap 2 (`Phone Availability`) to match and enrich the contact card with their phone number before alerting the team.
- **Step 4: Internal Notification to Owner / Sales Team:**
  - Send SMS to Caleb Phibbs (`+19189927702`):
    > *"New Yelp Lead: {{contact.name}} - {{contact.yelp_service_type}} | Phone: {{contact.phone}} | Bed/Bath: {{contact.yelp_bedrooms}}/{{contact.yelp_bathrooms}}"*
- **Step 5: Wait (24 Hours):**
  - *(Stop on Response = ON ensures this halts immediately if lead responds)*
- **Step 6: Update Opportunity:**
  - Move Stage to `No Answer` (`b2aa4fb7-bcd7-40ef-af6e-9dc61d38eaf6`)
- **Step 7: Send 24h Follow-up Email #1 via Yelp Relay:**
  - **Subject:** `Re: Your Cleaning Request - Maid Co Cleaning`
  - **Body (Plain Text):**
    > *"Hi {{contact.first_name}}, just wanted to follow up on your Yelp inquiry from yesterday! Did you still need help with your cleaning? Let us know your preferred timing and we'll get your quote ready."*
- **Step 8: Wait (48 Hours):**
- **Step 9: Update Opportunity:**
  - Move Stage to `Follow Up (Automated)` (`23252d1b-b1df-4dd4-bb2f-99e8bad00b11`)
- **Step 10: Send Final 72h Check-in Email #2 via Yelp Relay:**
  - **Subject:** `Checking in from Maid Co Cleaning`
  - **Body (Plain Text):**
    > *"Hi {{contact.first_name}}, checking in one last time regarding your cleaning request. If you still need service this week or would like to schedule for later, feel free to reply here or call/text us at (918) 992-7702. We're happy to assist!"*

---

## 5. Zapier Mapping Guide (The Defensive Guardrail Standard)

### Zap 1: Yelp Leads ➔ GoHighLevel (New Intake)
- **Trigger:** Yelp Leads ➔ `New Lead`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Location:** `IoU6ToP3okYmCe2CKNly` (Maid Co Cleaning)
  - **First Name / Last Name:** Lead Name
  - **Email:** `Temporary Email Address` (`leadsapi+...`)
  - **Tags:** `source: yelp, yelp-lead`
  - **Yelp Service Type:** `Project Job Names`
  - **Yelp Bedrooms:** Survey Answer [Bedrooms]
  - **Yelp Bathrooms:** Survey Answer [Bathrooms]
  - **Yelp Cleaning Frequency:** Survey Answer [Frequency]
  - **Yelp Notes / Customer Request:** `Project Summary` / Survey text
  - **Yelp Lead ID:** `Lead ID`

### Zap 2: Phone Availability (Golden Master: Find ➔ Filter ➔ Update Pattern)
To prevent accidental orphan contacts (e.g. creating a blank "Yelp Customer" record when a phone event fires before Zap 1 finishes), Zap 2 must strictly follow the guarded pattern:
- **Step 1 (Trigger):** Yelp Leads ➔ `Phone Availability`
- **Step 2 (Action):** LeadConnector ➔ `Find Contact`
  - Search Field: `Email` = `Temporary Email Address` (`leadsapi+...`)
  - Consider success if nothing found = `Yes`
- **Step 3 (Filter):** Filter by Zapier ➔ Only continue if `2. ID` (Contact ID) **Exists**
- **Step 4 (Action):** LeadConnector ➔ `Update Contact`
  - Contact: `Custom` ➔ `2. ID`
  - Phone: `Phone Number`
  - Tags: `yelp-phone-captured`
  - Custom Field: `Yelp Phone Captured` = `Yes`

### Zap 3: Inbound Chat Webhook (Render Server Bridge)
- **Trigger:** `Email by Zapier` ➔ `New Inbound Email`
- **Action:** `Webhooks by Zapier` ➔ `POST`:
  - **URL:** `https://cg-lead-bridge.onrender.com/webhook/yelp`
  - **Payload Type:** `json`
  - **Data:**
    - `name`: `1. From Name`
    - `subject`: `1. Subject`
    - `message`: `1. Body Plain`
    - `email`: *(Leave empty)*
    - `locationId`: `IoU6ToP3okYmCe2CKNly` *(or omitted / auto-detected via `BRAND_LOCATION_MAP`)*

---

## 6. Gmail Forwarding Standard
In the client's business Gmail receiving Yelp alerts (`hello@maidcocleaningservices.com`):
- **Settings ➔ Forwarding:** Add the Zapier inbound email address and verify with the 9-digit confirmation code.
- **Settings ➔ Filters:**
  - `from: yelp.com`
  - `has the words: Maid Co`
  - **Action:** Forward to the Zapier inbound email address.
