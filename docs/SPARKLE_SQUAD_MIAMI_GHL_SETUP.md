# The Sparkle Squad Co (Miami) - GoHighLevel & Yelp Connection Blueprint

**Location Name:** The Sparkle Squad Co  
**Location ID:** `ThUMNqsKmDfYKMF0jsBb`  
**Company ID:** `ZnXmnDTmK0MNl5R2OH3C`  
**Business Contact:** Mark Cook II (`info@thesparklesquadco.com` | `+17866004088`)  
**Timezone:** `America/New_York`  
**Address:** 1000 NW 7th St Apt 921, Miami, FL 33136  
**Website:** https://thesparklesquadco.com/  

---

## 1. Custom Fields (Created & Live via API)

All dedicated Yelp custom fields have been provisioned in GoHighLevel inside folder **`Yelp Lead Details`** (Folder ID: `EifqWJ53tvOSq54kFOfn`):

| Field Name | Field Key | ID | Data Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `7ZNL1dByKvvE4rUgRXp9` | TEXT | Deep Clean, Standard Clean, Move-Out, etc. |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `fH5GLG23EpSzcfYxasWv` | TEXT | Number of bedrooms specified in survey |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `4bX7aQhIgm7iHfO4RyCj` | TEXT | Number of bathrooms specified in survey |
| **Yelp Cleaning Frequency** | `contact.yelp_cleaning_frequency` | `irInG3kLjF8AP4E7qwKM` | TEXT | Cleaning frequency (one-time, weekly, bi-weekly) |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `3r5Mec4SC2mCli169nWP` | LARGE_TEXT | Full questionnaire summary and customer notes |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `yLmWGwpt8XKke8rinDSG` | TEXT | Yelp's unique lead/conversation identifier |
| **Yelp Phone Captured** | `contact.yelp_phone_captured` | `lZdQu39LfUSq7BFp9bky` | TEXT | Customer direct phone captured from Yelp |

> **Folder Organization in GHL UI:**
> All 7 fields are already nested inside **`Yelp Lead Details`** (`EifqWJ53tvOSq54kFOfn`) under **Settings ➔ Custom Fields**.

---

## 2. Tags (Created & Live via API)

Standardized lifecycle tags have been provisioned:

| Tag Name | Tag ID | Application Trigger |
| :--- | :--- | :--- |
| **`source: yelp`** | `iwoRE5sN7cGADJTan1xQ` | Applied upon lead creation |
| **`yelp-lead`** | `cjDkV7HjSe0uGgwAVHdH` | Identifies active Yelp leads |
| **`yelp-phone-captured`** | `bSztO5AcyA6IHnn0N1sB` | Applied when direct customer phone is provided |
| **`yelp-no-phone`** | `ePeqVTlU41ha7EUzqJr7` | Applied when customer only uses masked Yelp relay |
| **`yelp-quote-sent`** | `8yUE8caafnApCXwTt9XY` | Applied when quote message is dispatched |
| **`yelp-booked`** | `gREJrPWctDsUY0rqrhbr` | Applied when booking is confirmed |

---

## 3. Dedicated Yelp Pipeline (Created & Live via API)

Target Pipeline: **`Pipeline 6 - Yelp Leads`** (`RhbEvMN7bsMd2bekssNc`)

| Stage Name | Stage ID | Yelp Ingestion Role |
| :--- | :--- | :--- |
| **New Leads** | `1dac1178-efc1-4f67-b508-b7fe4b0cc14b` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `a8b77781-c065-471d-a9fe-40f8b008eed5` | When customer doesn't respond to greeting |
| **Quoted** | `638fd182-787e-4076-83ee-d4e84e6003c0` | Moved when quote is delivered |
| **Follow Up (Manual)** | `2065f7f1-bc97-49af-8717-24e5d00c0a90` | Rep manual follow up |
| **Follow Up (Automated)** | `9ec19e68-2640-4639-9ae7-7248d28ae341` | Drip sequence |
| **Interested but not booked**| `fd9fc819-f357-4eb0-8f01-22e50106b240` | Active interest |
| **Not Qualified** | `a7903bea-6137-4ced-83c7-8983d1ab1e5a` | Outside service area / declined |
| **Closed Won** | `d499bc88-0911-4f9e-b2fc-00e3b56d9111` | Successfully booked job |

---

## 4. Workflow Blueprint (Folder: `(Yelp Leads)`)

Create a folder in **Automation ➔ Workflows** named **`(Yelp Leads)`**.

### Workflow 1: `(Yelp Leads) Inbound Lead Intake & Auto-Responder`
- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Action 1: Create/Update Opportunity:**
  - Pipeline: `Pipeline 6 - Yelp Leads` (`RhbEvMN7bsMd2bekssNc`)
  - Stage: `New Leads` (`1dac1178-efc1-4f67-b508-b7fe4b0cc14b`)
  - Opportunity Name: `Yelp - {{contact.name}}`
- **Action 2: Wait (90 Seconds):**
  - Essential buffer: allows Yelp's companion `Phone Availability` zap/event to arrive and populate the phone number before sending the first response.
- **Action 3: If/Else Condition (`Channel Routing`):**
  - **Branch A: Has Phone Number** (`contact.phone is not empty`)
    - **Action:** Send SMS:
      > *"Hi {{contact.first_name}}, thanks for reaching out to The Sparkle Squad Co on Yelp! We received your request for a {{contact.yelp_service_type}}. What is your approximate square footage and preferred days for your cleaning?"*
    - **Action:** Add Tag: `yelp-phone-captured`
  - **Branch B: Yelp Masked Email Only** (`contact.phone is empty`)
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - Subject: `Your Cleaning Request - The Sparkle Squad Co`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to The Sparkle Squad Co on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote, what is your approximate square footage and ideal time frame? You can also reply directly here or call/text us directly at (786) 600-4088."*
    - **Action:** Add Tag: `yelp-no-phone`
- **Action 4: Internal Notification:**
  - Send SMS to Mark Cook II (`+17866004088`):
    > *"New Yelp Lead: {{contact.name}} - {{contact.yelp_service_type}} ({{contact.phone}})"*

---

## 5. Zapier Mapping Guide (If using Zapier)

### Zap 1: Yelp Leads ➔ GoHighLevel
- **Trigger:** Yelp Leads ➔ `New Lead`
- **Action 1:** LeadConnector ➔ `Create/Update Contact`
  - **Location:** `ThUMNqsKmDfYKMF0jsBb` (The Sparkle Squad Co)
  - **First Name / Last Name:** Lead Name
  - **Email:** `leadsapi+...` (Temporary Email from Yelp)
  - **Tags:** `source: yelp, yelp-lead`
  - **Yelp Service Type:** `Project Job Names`
  - **Yelp Bedrooms:** Survey Answer [Bedrooms]
  - **Yelp Bathrooms:** Survey Answer [Bathrooms]
  - **Yelp Cleaning Frequency:** Survey Answer [Frequency]
  - **Yelp Notes / Customer Request:** `Project Summary` / Survey text
  - **Yelp Lead ID:** `Lead ID`
- **Action 2:** LeadConnector ➔ `Create/Update Opportunity`
  - **Pipeline:** `Pipeline 6 - Yelp Leads` (`RhbEvMN7bsMd2bekssNc`)
  - **Stage:** `New Leads` (`1dac1178-efc1-4f67-b508-b7fe4b0cc14b`)
  - **Opportunity Name:** `Yelp - {{contact.name}}`

### Zap 2 (Companion): Yelp Phone Availability ➔ Update Contact
- **Trigger:** Yelp Leads ➔ `Phone Availability`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Location:** `ThUMNqsKmDfYKMF0jsBb`
  - **Email:** `leadsapi+...` (matches existing record)
  - **Phone:** `Phone Number` (from Yelp step 1)
  - **Tags:** `yelp-phone-captured`

---

## 6. Email-to-Webhook Bridge for Ongoing Messages

To receive subsequent chat bubbles sent by consumers on Yelp directly into GHL Conversations:

1. **Gmail Auto-Forwarding Filter (on `info@thesparklesquadco.com` or manager email):**
   - **From:** `yelp.com`
   - **Has the words:** `The Sparkle Squad Co` (or `Sparkle Squad`)
   - **Action:** Forward to Zapier Inbound Email Box (e.g. `sparklesquad.[id]@zapiermail.com`).
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
