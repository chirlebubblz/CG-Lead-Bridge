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

Target Pipeline: **`Pipeline 2 - New Leads`** (`uNUa0LrvRlWK93DFrbPp`)

| Stage | Stage ID | Yelp Ingestion Role |
| :--- | :--- | :--- |
| **New Leads** | `e06be4d1-635e-4438-aed7-e650b6a54a05` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `10ccc29e-73e4-4b2f-b3a0-cff23d04bd6b` | When customer doesn't respond to greeting |
| **Quoted** | `f2cd58d0-178f-45b4-af4d-7c2d66ed5635` | Moved when quote is delivered |
| **Follow Up (Manual)** | `3e61f1c8-0c2a-4c4f-9227-9108e52d05e1` | Rep manual follow up |
| **Follow Up (Automated)** | `8783a2c9-1c03-4ecd-86f4-1922a55d55e3` | Drip sequence |
| **Interested but not booked**| `0f73b9e5-4d44-481e-bd7a-b7c6c21ff9b9` | Active interest |
| **Not Qualified** | `7483ab51-629c-403b-bdca-3fffa4905eaa` | Outside service area / declined |

---

## 4. Workflow Blueprint (Folder: `(Yelp Leads)`)

Create a folder in **Automation ➔ Workflows** named **`(Yelp Leads)`**.

### Workflow 1: `(Yelp Leads) Inbound Lead Intake & Auto-Responder`
- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Action 1: Create/Update Opportunity:**
  - Pipeline: `Pipeline 2 - New Leads` (`uNUa0LrvRlWK93DFrbPp`)
  - Stage: `New Leads` (`e06be4d1-635e-4438-aed7-e650b6a54a05`)
  - Opportunity Name: `Yelp - {{contact.name}}`
- **Action 2: Wait (90 Seconds):**
  - Essential buffer: allows Yelp's companion `Phone Availability` zap/event to arrive and populate the phone number before sending the first response.
- **Action 3: If/Else Condition (`Channel Routing`):**
  - **Branch A: Has Phone Number** (`contact.phone is not empty`)
    - **Action:** Send SMS:
      > *"Hi {{contact.first_name}}, thanks for reaching out to Maid Co Cleaning on Yelp! We received your request for a {{contact.yelp_service_type}}. What is your approximate square footage and preferred days for your cleaning?"*
    - **Action:** Add Tag: `yelp-phone-captured`
  - **Branch B: Yelp Masked Email Only** (`contact.phone is empty`)
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - Subject: `Your Cleaning Request - Maid Co Cleaning`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Maid Co Cleaning on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote, what is your approximate square footage and ideal time frame? You can also reply directly here or call/text us directly at (918) 992-7702."*
    - **Action:** Add Tag: `yelp-no-phone`
- **Action 4: Internal Notification:**
  - Send SMS to Caleb Phibbs (`+19189927702`):
    > *"New Yelp Lead: {{contact.name}} - {{contact.yelp_service_type}} ({{contact.phone}})"*

---

## 5. Zapier Mapping Guide (If using Zapier)

### Zap 1: Yelp Leads ➔ GoHighLevel
- **Trigger:** Yelp Leads ➔ `New Lead`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Location:** `IoU6ToP3okYmCe2CKNly` (Maid Co Cleaning)
  - **First Name / Last Name:** Lead Name
  - **Email:** `leadsapi+...` (Temporary Email from Yelp)
  - **Tags:** `source: yelp, yelp-lead`
  - **Yelp Service Type:** `Project Job Names`
  - **Yelp Bedrooms:** Survey Answer [Bedrooms]
  - **Yelp Bathrooms:** Survey Answer [Bathrooms]
  - **Yelp Cleaning Frequency:** Survey Answer [Frequency]
  - **Yelp Notes / Customer Request:** `Project Summary` / Survey text
  - **Yelp Lead ID:** `Lead ID`

### Zap 2 (Companion): Yelp Phone Availability ➔ Update Contact
- **Trigger:** Yelp Leads ➔ `Phone Availability`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Email:** `leadsapi+...` (matches existing record)
  - **Phone:** `Phone Number` (from Yelp step 1)
  - **Tags:** `yelp-phone-captured`
