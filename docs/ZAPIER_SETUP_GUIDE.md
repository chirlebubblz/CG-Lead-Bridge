# Zapier ↔ Yelp ↔ GoHighLevel Setup Blueprint

This blueprint outlines the exact step-by-step configuration for setting up Yelp lead ingestion and 2-way communication into GoHighLevel via Zapier.

---

## Architecture Overview

To ensure **100% lead capture**, **phone number retention**, and **zero duplicate CRM records**, the integration is split into two lightweight, reliable Zaps:

```
[Consumer submits Yelp Quote] 
       │
       ├─► Zap 1: Instantly fires "New Lead"
       │         └─► Creates Contact in GHL (leadsapi+...@messaging.yelp.com)
       │         └─► Populates Custom Fields (Bedrooms, Bathrooms, Service Type)
       │         └─► Creates Open Opportunity in Yelp Pipeline
       │
       └─► 1-5 seconds later: Consumer enters phone number
                 └─► Zap 2: Fires "Phone Availability"
                 └─► Matches GHL Contact by `leadsapi+...` email
                 └─► Attaches direct Phone Number + `phone-captured` tag
```

---

## Zap 1: Yelp Leads to GoHighLevel Contact & Opportunity

### Step 1: Trigger
- **App**: `Yelp Leads`
- **Event**: `New Lead`
- **Account**: Connect your Capable Clean / Business Yelp account.
- **Trigger Test**: Pull the latest lead sample.

### Step 2: Action (Create Contact in GHL)
- **App**: `LeadConnector` (GoHighLevel official app)
- **Event**: `Add/Update Contact`
- **Account**: Connect Capable Clean sub-account.
- **Field Mappings**:
  | LeadConnector Field | Yelp Field Value | Notes |
  | :--- | :--- | :--- |
  | **First Name** | `Customer Name` (or First Name if split) | |
  | **Email** | `Temporary Email Address` (`leadsapi+...`) | **CRITICAL:** Do NOT use `reply+...` |
  | **Phone** | `Phone Number` | May be empty on Step 1 (captured in Zap 2) |
  | **Tags** | `yelp lead`, `source: yelp` | Comma-separated |
  | **Source** | `Yelp` | |
  | **Mark as Lead** | `Yes` (True) | |
  | **Custom: Yelp Service Type** | `Job Name` (e.g. Home Cleaning) | |
  | **Custom: Yelp Bedrooms** | `Survey Answer (Bedrooms)` | Match corresponding question |
  | **Custom: Yelp Bathrooms** | `Survey Answer (Bathrooms)` | Match corresponding question |
  | **Custom: Yelp Cleaning Frequency**| `Survey Answer (Frequency)` | |
  | **Custom: Yelp Lead ID** | `Lead ID` | Unique hex ID |
  | **Custom: Yelp Customer Notes**| `Project Summary` / `Customer Note` | Fallback text |

### Step 3: Action (Create Opportunity)
- **App**: `LeadConnector`
- **Event**: `Create/Update Opportunity`
- **Field Mappings**:
  - **Pipeline**: `Yelp Inquiries` (or `Sales Pipeline`)
  - **Stage**: `New Lead`
  - **Opportunity Name**: `{{Customer Name}} - {{Job Name}}`
  - **Opportunity Status**: `Open`
  - **Contact**: Select `ID` from Step 2.

---

## Zap 2: Companion Phone Availability Update

Yelp asks for the consumer's phone number on a second confirmation screen. When entered, Yelp fires `Phone Availability` 1–5 seconds later.

### Step 1: Trigger
- **App**: `Yelp Leads`
- **Event**: `Phone Availability`
- **Account**: Connect Capable Clean Yelp account.

### Step 2: Action (Update Existing GHL Contact)
- **App**: `LeadConnector`
- **Event**: `Add/Update Contact`
- **Field Mappings**:
  | LeadConnector Field | Yelp Field Value | Notes |
  | :--- | :--- | :--- |
  | **Email** | `Temporary Email Address` (`leadsapi+...`) | Used by GHL to locate the existing contact |
  | **Phone Number** | `Phone Number` (from Step 1) | Attaches customer's mobile number |
  | **Tags** | `phone-captured` | Appends tag without removing existing |
  | **Custom: Yelp Phone Captured** | `Yes` | |

---

## GoHighLevel Workflow Auto-Responder Blueprint

When a contact is created with the tag `yelp-lead`, trigger an automated GHL Workflow:

```
[Trigger: Contact Tag Added = "yelp-lead"]
       │
[Wait Step: 90 Seconds]  <-- Allows Zap 2 to attach phone number before sending
       │
[If/Else Condition: Survey Fields Exist?]
       ├─► (Yes - Bedrooms & Bathrooms are populated):
       │     Action: Send SMS / Conversation Reply
       │     Message: "Hi {{contact.first_name}}, thanks for reaching out to Capable Clean on Yelp! We received your request for {{contact.yelp_service_type}} ({{contact.yelp_bedrooms}} bed / {{contact.yelp_bathrooms}} bath). What is your approximate square footage so we can give you an exact quote?"
       │
       └─► (No - Fallback if fields omitted):
             Action: Send SMS / Conversation Reply
             Message: "Hi {{contact.first_name}}, thanks for reaching out to Capable Clean on Yelp! Could you share how many bedrooms/bathrooms you have and your approximate square footage so we can give you an exact quote?"
```

---

## Golden Rules
1. **Never parse email alerts with AI for contact creation**: Gmail alerts use `reply+...` addresses while Yelp Leads API uses `leadsapi+...`. Creating contacts from both creates duplicate records.
2. **Always reply via `leadsapi+...`**: Yelp routes emails sent to this address straight into the customer's Yelp in-app chat thread.
