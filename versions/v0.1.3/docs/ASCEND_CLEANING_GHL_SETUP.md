# Ascend Cleaning - GoHighLevel & Yelp Connection Blueprint

**Location Name:** Ascend Cleaning  
**Location ID:** `IdJoWa68hD3nVj45Fv7f`  
**Business Contact:** `ascendcleaningcompany@gmail.com` | `(213) 319-5497`  
**Timezone:** `America/Los_Angeles`  
**Dedicated Render Bridge:** `https://cg-lead-bridge-ascend.onrender.com`  
**Inbound Webhook:** `https://cg-lead-bridge-ascend.onrender.com/webhook/yelp`  
**PIT Token:** `pit-96e543f6-09a3-4d38-8169-62a04c8e8382`  

---

## 1. Custom Fields (Provisioned & Live in Folder `Yelp Lead Details`)

Folder ID: `ViSfpkbPF5elDd6LcwKR`

| Field Name | Field Key | ID | Data Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Yelp Service Type** | `contact.yelp_service_type` | `QPLE6c9gw3VEFfg0VXKP` | TEXT | Deep Clean, Standard Clean, Move-Out, etc. |
| **Yelp Bedrooms** | `contact.yelp_bedrooms` | `kZtLkCKN0tnqUL9ANNK5` | TEXT | Bedrooms from questionnaire |
| **Yelp Bathrooms** | `contact.yelp_bathrooms` | `u7aqDQzw7FJ8neztk4Fd` | TEXT | Bathrooms from questionnaire |
| **Yelp Cleaning Frequency** | `contact.yelp_cleaning_frequency` | `8CcCFLAJKSaZmJE6ttqQ` | TEXT | One-time, Weekly, Bi-weekly, Monthly |
| **Yelp Additional Product Types** | `contact.yelp_additional_product_types` | `Ra0xMqriJxse2L04r2Ux` | TEXT | Add-on services (Oven, Fridge, Windows) |
| **Yelp Additional Services** | `contact.yelp_additional_services` | `il6M4BBK8qwrRPT6xVB6` | TEXT | Customer-specified extra services |
| **Yelp Notes / Customer Request** | `contact.yelp_notes__customer_request` | `0NynTrP9yTHMFXKuYE5X` | LARGE_TEXT | Full survey summary & customer notes |
| **Yelp Lead ID** | `contact.yelp_lead_id` | `00pY3JUPGvBTS87b2no1` | TEXT | Yelp conversation identifier for deduplication |
| **Yelp Phone Captured** | `contact.yelp_phone_captured` | `DYRZ1Qj60r0NDkXzPM3T` | TEXT | Indicates whether direct phone was provided |

---

## 2. Standardized Lifecycle Tags (Provisioned & Live)

| Tag Name | Tag ID | Purpose / Trigger |
| :--- | :--- | :--- |
| **`source: yelp`** | `wgh8uiaMt1O85eZPG6Pa` | Applied upon initial Yelp lead creation |
| **`yelp-lead`** | `TiW9QrY5pfOlMP3PqKb1` | Identifies active Yelp leads for workflow routing |
| **`yelp-phone-captured`** | `YB2giYYw4JyI6wos6qHj` | Applied when customer shares direct phone number |
| **`yelp-no-phone`** | `DHqb1Zpxi5fdTfrbqcqk` | Applied when lead only has masked email (`leadsapi+...`) |
| **`yelp-quote-sent`** | `DSBbRVTvN4SFgQuYiYip` | Applied when quote message is dispatched |
| **`yelp-booked`** | `IRt8YfXVAsnHOJ7Rulys` | Applied when lead books a clean |

---

## 3. Dedicated Yelp Pipeline (Provisioned & Live)

Target Pipeline: **`Pipeline 5 - Yelp Leads Pipeline`** (ID: `byoJzgmZmdowBaThHgFO`)

| Stage | Stage ID | Role in Pipeline |
| :--- | :--- | :--- |
| **New Leads** | `531d0cb4-0f56-41c0-87ff-8e5b17574d43` | Landing stage for all new Yelp leads |
| **No Answer** | `95d255cd-d749-4561-aa6e-dfa3f401a70b` | Lead has not answered initial response |
| **Quoted** | `be504e67-95dd-4b8b-95b7-33f77d81420e` | Estimate sent to customer |
| **Follow Up (Manual)** | `28067fcb-8fd2-4988-980f-fdd8689ff5cf` | Manual sales rep follow-up |
| **Follow Up (Automated)** | `7f012c53-8c89-4907-90d9-d985caa7cee5` | Contact enrolled in automated drips |
| **Interested but not booked**| `bcfc08ce-9ccb-4ede-ba99-fbba8566f5ea` | Active interest / questions pending |
| **Not Qualified** | `d7743977-1c8a-44b6-9c5b-712bafacde45` | Out of area or declined |
| **Closed Won** | `9948ea5e-1a6b-4032-8182-8dfa98a8a37e` | Successfully booked cleaning job |

---

## 4. The 3 Zapier Zaps (Live & Published)

* **Zap 1 (New Lead Intake):** Yelp Leads (`New Lead`) ➔ `Webhooks by Zapier` (Custom Request POST to `https://services.leadconnectorhq.com/contacts/upsert` with Ascend PIT Token)
* **Zap 2 (Phone Availability):** Yelp Leads (`Phone Availability`) ➔ `Webhooks by Zapier` (Custom Request POST to `https://services.leadconnectorhq.com/contacts/upsert` with direct phone & tag `yelp-phone-captured`)
* **Zap 3 (2-Way Yelp Chat Relay):** `Email by Zapier` (`ascend-yelp-leads.1w4tor@zapiermail.com`) ➔ Webhook POST to `https://cg-lead-bridge-ascend.onrender.com/webhook/yelp`

---

## 5. Nurturing Automations (Pack A & Pack B)

### Pack A: Yelp Leads (Pure Email Relay — Zero Outbound Customer SMS)
1. **Quote Follow-up Drip** (`12aec0b0-0aac-45b6-8954-c302f72c3dfd`):
   - Trigger: Opportunity Moved to `Quoted` (`be504e67-95dd-4b8b-95b7-33f77d81420e`)
   - 24h & 72h automated Yelp relay follow-ups to `{{contact.email}}`
   - Stops immediately on customer response.
2. **No Answer Re-engagement** (`b2888301-0c42-4b18-81d7-40b3f0308c50`):
   - Trigger: Opportunity Moved to `No Answer` (`95d255cd-d749-4561-aa6e-dfa3f401a70b`)
   - 48h & Day 5 check-ins asking for square footage/beds/baths.

### Pack B: Meta & Website Leads (Connected to Ascend's Existing Tags)
1. **30-Day Long-Term Nurture**:
   - Triggers:
     - Opportunity Moved to `Automated Sequence` (`6981a485-ca06-4bbc-8d72-b4e87fef8ec9`) in `Facebook Ads Pipeline` (`L8rdDSDnXy8aBLQwpaXe`)
     - OR Tag Added: `nurture-active` (`RFgM9hM4cHTRwx5Q674Q`)
     - OR Tag Added: `lost-lead` (`hrfAmrPt7qzFxgKpsx5r`) / `never-booked` (`Ih8oY45GcvGpSPBYgZpn`)
   - Guardrails: Suppressed if contact has `bad-experience`, `refund`, `refund-requested`, `sms-suppressed`, `customer`, or `customer-recurring`.
   - Multi-channel 6-touch sequence (SMS + Email) over 30 days focused on priority scheduling, trust, and custom cleaning checklists (zero discounts).
2. **Past Clients Recurring Re-Booking Nurture**:
   - Triggers: Tag Added `one-time-good` (`cslTpsdx6gBT9cyZuERD`) ONLY (happy verified cleans).
   - Guardrails: Suppressed if contact has `bad-experience`, `refund`, `refund-requested`, `sms-suppressed`, or `customer-recurring`.
   - 14-day and 21-day SMS/Email sequence upselling to weekly/bi-weekly/monthly recurring service focusing on dedicated cleaner locking and reserved day/time slots (zero discounts).

### Workflow C: Universal Bad Experience & Refund Circuit Breaker
- Trigger: Tag Added `bad-experience` OR `refund` OR `refund-requested`
- Actions:
  - Immediately ejects contact from all active nurture workflows.
  - Applies tag `sms-suppressed`.
  - Removes tag `nurture-active`.
  - Sends internal staff alert that marketing automation has been halted.
