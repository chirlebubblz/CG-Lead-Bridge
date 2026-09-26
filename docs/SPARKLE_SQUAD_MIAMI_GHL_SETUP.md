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

## 3. Pipelines & Opportunity Routing

Target Pipeline: **`Pipeline 2 - New Leads`** (`GfeGZCPYan5Ee64r6Jlm`)

| Stage | Stage ID | Yelp Ingestion Role |
| :--- | :--- | :--- |
| **New Leads** | `339f2ea4-5834-451d-8f2c-dfd2094d7aad` | **Initial landing stage for every new Yelp lead** |
| **No Answer** | `795b7285-865a-454a-871c-1214b4d8f96e` | When customer doesn't respond to greeting |
| **Quoted** | `17256fea-c5dd-4dcf-a749-6ee801efdc7a` | Moved when quote is delivered |
| **Follow Up (Manual)** | `a2143231-fe72-4a4c-9108-afb1092077d6` | Rep manual follow up |
| **Follow Up (Automated)** | `9f5d699f-ec97-42f2-bfd7-47670f61ecce` | Drip sequence |
| **Interested but not booked**| `1866490f-37e5-400e-a97b-c942bc6881ce` | Active interest |
| **Not Qualified** | `c7ada710-e6d6-48e8-b69a-37689a9c75da` | Outside service area / declined |

---

## 4. Workflow Blueprint (Folder: `(Yelp Leads)`)

Create a folder in **Automation ➔ Workflows** named **`(Yelp Leads)`**.

### Workflow 1: `(Yelp Leads) Inbound Lead Intake & Auto-Responder`
- **Trigger:** Contact Tag Added ➔ `source: yelp` (or `yelp-lead`)
- **Action 1: Create/Update Opportunity:**
  - Pipeline: `Pipeline 2 - New Leads`
  - Stage: `New Leads`
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
- **Action:** LeadConnector ➔ `Create/Update Contact`
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

### Zap 2 (Companion): Yelp Phone Availability ➔ Update Contact
- **Trigger:** Yelp Leads ➔ `Phone Availability`
- **Action:** LeadConnector ➔ `Create/Update Contact`
  - **Email:** `leadsapi+...` (matches existing record)
  - **Phone:** `Phone Number` (from Yelp step 1)
  - **Tags:** `yelp-phone-captured`
