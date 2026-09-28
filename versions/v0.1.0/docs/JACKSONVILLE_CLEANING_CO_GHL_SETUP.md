# Jacksonville Cleaning Co - GoHighLevel & Yelp Connection Blueprint

**Location Name:** Jacksonville Cleaning Co  
**Location ID:** `EKXbBmGEV6hnLQFQRPc7`  
**Company ID:** `ZnXmnDTmK0MNl5R2OH3C`  
**Business Contact:** Zach Smith (`zach@jacksonvillecleaningco.com` | `+19046052305`)  
**Timezone:** `America/New_York`  
**Address:** 12724 Gran Bay Pkwy W, Jacksonville, FL 32258  

---

## 1. Custom Fields (Created & Live via API)

All dedicated Yelp custom fields have been provisioned in GoHighLevel for Jacksonville Cleaning Co:

| Field Name | Field Key | ID | Data Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `gHF03kT0UOPdkpCUdhbD` | TEXT | Deep Clean, Standard Clean, Move-Out, etc. |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `k2VAPJJponREGINdtliC` | TEXT | Number of bedrooms specified in survey |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `eTEursjk5VuUiwnaAXJ2` | TEXT | Number of bathrooms specified in survey |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `UDofcEEkbAIVkTcll2Uk` | LARGE_TEXT | Full questionnaire summary and customer notes |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `K76pF6924CuFnr3ZfciK` | TEXT | Yelp's unique lead/conversation identifier |

> **Folder Organization in GHL UI:**
> Go to **Settings** ➔ **Custom Fields** ➔ **Folders** ➔ Create folder **`Yelp Lead Details`** and place these 5 fields inside.

---

## 2. Tags (Created & Live via API)

Standardized lifecycle tags have been provisioned:

| Tag Name | Tag ID | Application Trigger |
| :--- | :--- | :--- |
| **`source: yelp`** | `g6KChqPyatlxtHXd6RLY` | Applied upon lead creation |
| **`yelp-lead`** | `KRADzfEOguXWz4U9VI4s` | Identifies active Yelp leads |
| **`yelp-phone-captured`** | `d8F8OfQkTAXxk8n8zPvo` | Applied when direct customer phone is provided |
| **`yelp-no-phone`** | `QvikunYaB5HKvxijGs9k` | Applied when customer only uses masked Yelp relay |
| **`yelp-quote-sent`** | `1TLGVCjWro6SCeBneDvE` | Applied when quote message is dispatched |

---

## 3. Dedicated Yelp Pipeline (Created & Live via API)

Target Pipeline: **`Pipeline 6 - Yelp Leads Pipeline`** (`7ft69hadg5z9b7YrVGpJ`)

| Stage | Stage ID | Yelp Ingestion Role |
| :--- | :--- | :--- |
| **New Leads** | `631f6e4a-3f34-433e-8b61-11f9c7f862d0` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `93b18bf1-ccfa-4cbb-9215-af0d0ab91861` | When customer doesn't respond to greeting |
| **Quoted** | `2f7412d2-8bca-4f75-bbb8-9783342bf74a` | Moved when quote is delivered |
| **Follow Up (Manual)** | `4b3c3f3b-4192-4604-9657-80580c7c2b2b` | Rep follow up |
| **Follow Up (Automated)** | `182ff4c7-c841-4c6a-bc7e-8c590058db9d` | Drip sequence |
| **Interested but not booked**| `446317d6-342b-479d-9585-764dba51bb50` | Active interest |
| **Not Qualified** | `adaade17-06e8-4d98-af32-869303ca04d8` | Outside service area / declined |
| **Closed Won** | `207ee56d-4581-452a-bb1f-84c53b7cd542` | Successfully booked job |

---

## 4. Workflow Blueprint (Folder: `(Yelp Leads)`)

Create a folder in **Automation ➔ Workflows** named **`(Yelp Leads)`**.

### Workflow 1: `(Yelp Leads) Inbound Lead Intake & Auto-Responder`
- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Action 1: Create/Update Opportunity:**
  - Pipeline: `Pipeline 1 - New Leads`
  - Stage: `New Leads`
  - Opportunity Name: `Yelp - {{contact.name}}`
- **Action 2: Wait (90 Seconds):**
  - Essential buffer: allows Yelp's companion `Phone Availability` zap/event to arrive and populate the phone number before sending the first response.
- **Action 3: If/Else Condition (`Channel Routing`):**
  - **Branch A: Has Phone Number** (`contact.phone is not empty`)
    - **Action:** Send SMS:
      > *"Hi {{contact.first_name}}, thanks for reaching out to Jacksonville Cleaning Co on Yelp! We received your request for a {{contact.yelp_service_type}}. What is your approximate square footage and preferred days for your cleaning?"*
    - **Action:** Add Tag: `yelp-phone-captured`
  - **Branch B: Yelp Masked Email Only** (`contact.phone is empty`)
    - **Action:** Send Email:
      - To: `{{contact.email}}` (`leadsapi+...` relay)
      - Subject: `Your Cleaning Request - Jacksonville Cleaning Co`
      - Body (Plain Text):
        > *"Hi {{contact.first_name}},\n\nThank you for reaching out to Jacksonville Cleaning Co on Yelp! We received your request for a {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath).\n\nTo give you an accurate quote, what is your approximate square footage and ideal time frame? You can also reply directly here or call/text us directly at (904) 605-2305."*
    - **Action:** Add Tag: `yelp-no-phone`
- **Action 4: Internal Notification:**
  - Send SMS to Zach (`+19046052305`):
    > *"New Yelp Lead: {{contact.name}} - {{contact.yelp_service_type}} ({{contact.phone}})"*

---

## 5. Zapier Mapping Guide (If using Zapier)

### Zap 1: Yelp Leads ➔ GoHighLevel
- **Trigger:** Yelp Leads ➔ `New Lead`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Location:** `EKXbBmGEV6hnLQFQRPc7` (Jacksonville Cleaning Co)
  - **First Name / Last Name:** Lead Name
  - **Email:** `leadsapi+...` (Temporary Email from Yelp)
  - **Tags:** `source: yelp, yelp-lead`
  - **Yelp Service Type:** `Project Job Names`
  - **Yelp Bedrooms:** Survey Answer [Bedrooms]
  - **Yelp Bathrooms:** Survey Answer [Bathrooms]
  - **Yelp Notes:** `Project Summary` / Survey text
  - **Yelp Lead ID:** `Lead ID`

### Zap 2 (Companion): Yelp Phone Availability ➔ Update Contact
- **Trigger:** Yelp Leads ➔ `Phone Availability`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Email:** `leadsapi+...` (matches existing record)
  - **Phone:** `Phone Number` (from Yelp step 1)
  - **Tags:** `yelp-phone-captured`
