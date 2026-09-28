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

## 4. Workflow Blueprint (Folder: `(Yelp Leads)`)

In GoHighLevel under **Automation ➔ Workflows**:
1. Create a workflow folder named **`(Yelp Leads)`**.
2. Create Workflow: **`(Yelp Leads) Inbound Lead Intake & Auto-Responder`**.

### Workflow Configuration:
- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Action 1: Create/Update Opportunity:**
  - Pipeline: `Pipeline 5 - Yelp Leads Pipeline`
  - Stage: `New Leads`
  - Opportunity Name: `Yelp - {{contact.name}}`
- **Action 2: Wait (90 Seconds):**
  - Essential buffer: allows Yelp's companion `Phone Availability` Zap/event to arrive and populate the customer's phone number before sending the first response.
- **Action 3: If/Else Condition (`Channel Routing`):**
  - **Branch A: Has Phone Number** (`contact.phone is not empty`)
    - **Action:** Send SMS:
      > *"Hi {{contact.first_name}}, thanks for reaching out to Capable Clean on Yelp! We received your request for a {{contact.yelp_service_type}}. What is your approximate square footage and preferred days for your cleaning?"*
    - **Action:** Add Tag: `yelp-phone-captured`
  - **Branch B: Yelp Masked Email Only** (`contact.phone is empty`)
    - **Action:** Send Email:
      - **To:** `{{contact.email}}` (`leadsapi+...` relay)
      - **Subject:** `Your Cleaning Request - Capable Clean`
      - **Body (Plain Text):**
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Capable Clean on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote, what is your approximate square footage and ideal time frame? You can also reply directly here on Yelp or call/text us directly at (714) 455-3578."*
    - **Action:** Add Tag: `yelp-no-phone`
- **Action 4: Internal Notification:**
  - Send Notification / SMS to Capable Clean team (`+17144553578`):
    > *"New Yelp Lead: {{contact.name}} - {{contact.yelp_service_type}} ({{contact.phone}})"*

---

## 5. Zapier Mapping Guide (For Capable Clean)

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
  - **URL:** `https://cg-lead-bridge-capable-clean.onrender.com/webhook/yelp`
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
- **Service Name:** `cg-lead-bridge-capable-clean`
- **Live URL:** `https://cg-lead-bridge-capable-clean.onrender.com`
- **Health Check:** `https://cg-lead-bridge-capable-clean.onrender.com/health` (Verified: `healthy`)
- **Webhook Endpoint:** `https://cg-lead-bridge-capable-clean.onrender.com/webhook/yelp`
- **Target Location ID:** `s94e80clit6bCL9VBWgl`

