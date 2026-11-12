# Zapier ↔ GoHighLevel Mapping & Integration Audit

**Audit Date:** 2026-10-30  
**Authenticated Session:** `Jordan E. Sabalo` (`jerafisabalo@gmail.com`)  
**Zapier Workspace:** Rapids Cleaning Services (Account ID: `26829864`)  
**Workspace Owner:** Zach Kubiak (`zach@rapidscleaningservices.com`)  
**Verification Method:** Playwright CDP Automated Inspection (`http://127.0.0.1:9222`) & Zapier Internal API Audit  
**Artifact Directory:** `docs/ZAPIER_GHL_MAPPING_AUDIT.md`  

---

## 1. Executive Summary

A comprehensive automated audit was conducted across the active Zapier workspace to map all **App Connections** (specifically `LeadConnector` / HighLevel and `Yelp Leads`) and all **Zaps / Automations** to their corresponding **GoHighLevel (GHL) Subaccounts** and **Location IDs**.

### Key Architectural Discovery: The Jacksonville Standard in Production
The active Yelp integration follows the modern **Jacksonville Standard** (Golden Master Architecture):
- Instead of using native LeadConnector Zapier actions directly (which suffer from field mapping rigidity and API rate throttling), the Zaps utilize **Webhooks by Zapier (POST)** to forward clean payloads to the **Render Lead Bridge** (`https://cg-lead-bridge.onrender.com/contacts/upsert` and `/webhook/yelp`).
- The Render middleware server handles automated deduplication, GHL Inbound Conversations API injection (chat bubble rendering), and data hygiene for target Location ID **`8duUHE4ENvhQTCtg3z6o`** (**Rapids Cleaning Services**).

---

## 2. Zapier App Connections Registry

| Connection ID | App Name & Version | Connection Title / Label | Account Owner / Creator | Date Created / Verified | Operational Status | Associated GHL Subaccount / Purpose |
|---|---|---|---|---|---|---|
| **`66875876`** | **Yelp Leads** (v4.2.1) | `jerafisabalo@gmail.com` | Jordan E. Sabalo (`12483718`) | Oct 16, 2026 | 🟢 **Connected & Active** (Tested Oct 17, 2026) | Connected to Yelp Partner API for **Rapids Cleaning Services** (Yelp Business ID: `M8YpudfbjhuE10wOYlQlOw`). Used in 3 Zaps. |
| **`66585985`** | **LeadConnector** (v3.0.4) | `LeadConnector` | Zach Kubiak (`26956576`) | Sep 30, 2026 | 🟢 **Connected** (Private Auth) | **Rapids Cleaning Services** (`8duUHE4ENvhQTCtg3z6o`) — HighLevel API v2 OAuth connection for internal workflows (Used in 2 Zaps). |
| **`66233890`** | **LeadConnector** (v3.0.4) | `LeadConnector` | Zach Kubiak (`26956576`) | Sep 14, 2026 | 🟢 **Connected** (Private Auth) | **Rapids Cleaning Services** (`8duUHE4ENvhQTCtg3z6o`) — HighLevel API v2 OAuth connection for internal workflows (Used in 2 Zaps). |
| **`62850721`** | **LeadConnector (Legacy)** (v2.0.4) | `LeadConnector (2.0.4)` | Zach Kubiak (`26956576`) | Mar 24, 2026 | ⚠️ **Connected (Deprecated)** | Legacy v2 API key connection for **Rapids Cleaning Services** (0 active Zaps; version upgrade recommended). |
| **`33197141`** | **LeadConnector (v1.0.30)** | `HighLevelCLIAPI@1.0.30` | Jordan E. Sabalo (`12483718`) | May 10, 2022 | ⚪ **Legacy Draft Only** | Archived connection used in historical Facebook Messenger draft Zap (`155622849`). |
| **`62860798`** | **Gmail** (v2.14.0) | `zach@rapidscleaningservices.com` | Zach Kubiak (`26956576`) | Aug 18, 2026 | 🟢 **Connected** | Rapids Cleaning business email. |
| **`62850275`** | **BookingKoala** (v2.3.0) | `rapidscleaningservices` | Zach Kubiak (`26956576`) | Mar 25, 2026 | 🟢 **Connected** | Booking engine integration for Rapids Cleaning Services (Used in 9 Zaps). |
| **`62850317`** | **Slack** (v1.44.0) | `@zach (Rapids Cleaning Services)` | Zach Kubiak (`26956576`) | Mar 25, 2026 | 🟢 **Connected** | Internal team notifications (Used in 11 Zaps). |
| **`66872929`** | **Google Ads** (v6.16.1) | `zach@rapidscleaningservices.com` | Zach Kubiak (`26956576`) | Oct 16, 2026 | 🟢 **Connected** | Ads conversion tracking (Used in 2 Zaps). |

---

## 3. Zaps Inventory & Subaccount Mapping

| Zap ID | Zap Name | Folder | State / Status | Trigger Event | Action Steps & Middleware | Target GHL Location ID | Target Subaccount |
|---|---|---|---|---|---|---|---|
| **`383703523`** | **Zap 1: Ingestion** | `Yelp - GHL RAPIDS` | 🟢 **ON (Active)** | `Yelp Leads: new_lead`<br>(Auth: `66875876`, Biz ID: `M8YpudfbjhuE10wOYlQlOw`) | 1. **AI by Zapier** (`gpt-4.1-nano`): Parses Bed, Bath, Frequency, Notes.<br>2. **Webhooks by Zapier (POST)**: `https://cg-lead-bridge.onrender.com/contacts/upsert` | **`8duUHE4ENvhQTCtg3z6o`** | **Rapids Cleaning Services** |
| **`383748533`** | **Zap 2: Phone Number Availability** | `Yelp - GHL RAPIDS` | 🟢 **ON (Active)** | `Yelp Leads: phone_availability`<br>(Auth: `66875876`) | 1. **Webhooks by Zapier (POST)**: `https://cg-lead-bridge.onrender.com/contacts/upsert`<br>Payload: `phone`, `tags: yelp-phone-captured` | **`8duUHE4ENvhQTCtg3z6o`** | **Rapids Cleaning Services** |
| **`383750540`** | **Zap 3 Configuration in Zapier** | `Yelp - GHL RAPIDS` | 🟢 **ON (Active)** | `Email by Zapier: inbound_v2`<br>(Mailbox: `rapidscleaning@robot.zapier.com`) | 1. **Webhooks by Zapier (POST)**: `https://cg-lead-bridge.onrender.com/webhook/yelp`<br>Payload: `name`, `subject`, `message`, `location_id` | **`8duUHE4ENvhQTCtg3z6o`** | **Rapids Cleaning Services** |
| **`383861774`** | **Workflow 4: (Yelp Leads) Not Qualified / Archive** | `Jordan E. Sabalo (Personal)` | ⚪ **OFF (Paused)** | `Commusoft: opportunitystage` | 1. **Yelp Leads**: `mark_lead_as_replied`<br>2. **Yelp Leads**: `message` (Auth: `66875876`) | *N/A (Commusoft)* | Standalone Archive Test |
| **`155622849`** | **Add task in LeadConnector when new message sent to page in Facebook Messenger** | None / Root | ⚪ **OFF (Paused)** | `Facebook Messenger: message`<br>(Auth: `33197178`) | 1. **LeadConnector**: `create_task`<br>(Auth: `33197141`) | Historical Draft (2022) | Archived Facebook Test |

---

## 4. Cross-Reference: Known GHL Subaccounts vs. Zapier State

Cross-referencing against known locations documented in [`docs/GHL_ACCOUNTS_DIRECTORY.md`](./GHL_ACCOUNTS_DIRECTORY.md) and [`docs/JACKSONVILLE_MASTER_TEMPLATE.md`](./JACKSONVILLE_MASTER_TEMPLATE.md):

| # | GHL Subaccount Name | Known GHL Location ID | Zapier Integration Status | Active Zaps / Folders | Connection Reference | Notes |
|---|---|---|---|---|---|---|
| **1** | **Rapids Cleaning Services** | `8duUHE4ENvhQTCtg3z6o` | 🟢 **Fully Connected & Live** | Folder: `Yelp - GHL RAPIDS`<br>• Zap 1 (`383703523`)<br>• Zap 2 (`383748533`)<br>• Zap 3 (`383750540`) | • Yelp Leads (`66875876`)<br>• LeadConnector v3.0.4 (`66585985`, `66233890`) | Full Jacksonville Standard 3-Zap pipeline live, relaying through `cg-lead-bridge.onrender.com`. |
| **2** | **Clean Genie / Capable Clean** | `s94e80clit6bCL9VBWgl` | 🟢 **Bridge Backend Host** | Shared Render Bridge (`cg-lead-bridge.onrender.com`) | Render Server API Keys / GHL Private Integration | Core server tenant hosting the bridge webhook endpoints. |
| **3** | **Jacksonville Cleaning Co** | `EKXbBmGEV6hnLQFQRPc7` | 🏛️ **Golden Master Template** | Reference Template in `docs/JACKSONVILLE_MASTER_TEMPLATE.md` | Separate Zapier / Direct Bridge | Baseline architectural blueprint for all subaccounts. |
| **4** | **Ascend Cleaning** | `IdJoWa68hD3nVj45Fv7f` | 📋 Documented SOP | Standalone Webhook Intake | Documented in `docs/ASCEND_CLEANING_GHL_SETUP.md` | Client sub-account ready for Zapier replication. |
| **5** | **Mountain Top Cleaning & Maintenance** | `YVtPYdLotWLwuy5AA8Vv` | 📋 Documented SOP | Direct GHL Workflows | Documented in `docs/GHL_ACCOUNTS_DIRECTORY.md` | Mum's Cleaning portfolio sub-account. |
| **6** | **Sam and Max Enterprises / Maid Co** | `IoU6ToP3okYmCe2CKNly` | 📋 Documented SOP | Direct GHL Workflows | Documented in `docs/MAID_CO_CLEANING_GHL_SETUP.md` | Verified Active in Launchpad onboarding. |
| **7** | **Puget Sound Cleaners** | `MucxtGIfmvLViGQWD0CG` | 📋 Documented SOP | Direct GHL Workflows | Documented in `docs/PUGET_SOUND_CLEANERS_GHL_SETUP.md` | Production sub-account verified in GHL. |
| **8** | **Sparkle Squad Miami** | `ThUMNqsKmDfYKMF0jsBb` | 📋 Documented SOP | Direct GHL Workflows | Documented in `docs/SPARKLE_SQUAD_MIAMI_GHL_SETUP.md` | Configured with pure email relay standard. |
| **9** | **Sunny Side Clean Team** | `WOwi6fpdaZavuqHU8Rux` | 📋 Documented SOP | Direct GHL Workflows | Documented in `docs/SUNNY_SIDE_CLEAN_TEAM_GHL_SETUP.md` | Client sub-account verified in GHL. |

---

## 5. Detailed Step Breakdown of Live Production Zaps

### Zap 1: Ingestion (`383703523`)
- **Folder:** `Yelp - GHL RAPIDS`
- **Trigger:** `App218671CLIAPI@4.2.1` (`new_lead`)
  - Authenticated Account: `jerafisabalo@gmail.com` (Auth ID: `66875876`)
  - Filter / Business ID: `M8YpudfbjhuE10wOYlQlOw` (Rapids Cleaning Services)
- **Step 1:** `AICLIAPI@4.0.32` (`get_completion`)
  - Engine: OpenAI `gpt-4.1-nano`
  - Extraction Task: Extracts `Yelp Service Type`, `Yelp Bedrooms`, `Yelp Bathrooms`, `Yelp Cleaning Frequency`, and `Yelp Notes Customer Request` from `survey_answers_formatted`.
- **Step 2:** `WebHookCLIAPI@1.1.1` (`post`)
  - Destination: `https://cg-lead-bridge.onrender.com/contacts/upsert`
  - Payload Parameters:
    ```json
    {
      "locationId": "8duUHE4ENvhQTCtg3z6o",
      "name": "{{lead_user_name}}",
      "email": "{{temporary_email}}",
      "phone": "{{temporary_phone_number}}",
      "leadId": "{{yelp_lead_id}}",
      "tags": "source: yelp, yelp-lead",
      "yelp_service_type": "{{job_names}}",
      "yelp_bedrooms": "{{Yelp Bedrooms}}",
      "yelp_bathrooms": "{{Yelp Bathrooms}}",
      "yelp_cleaning_frequency": "{{Yelp Cleaning Frequency}}",
      "yelp_notes__customer_request": "{{Yelp Notes Customer Request}}"
    }
    ```

### Zap 2: Phone Number Availability (`383748533`)
- **Folder:** `Yelp - GHL RAPIDS`
- **Trigger:** `App218671CLIAPI@4.2.1` (`phone_availability`)
  - Authenticated Account: `jerafisabalo@gmail.com` (Auth ID: `66875876`)
- **Step 1:** `WebHookCLIAPI@1.1.1` (`post`)
  - Destination: `https://cg-lead-bridge.onrender.com/contacts/upsert`
  - Payload Parameters:
    ```json
    {
      "locationId": "8duUHE4ENvhQTCtg3z6o",
      "email": "{{temporary_email}}",
      "phone": "{{temporary_phone_number}}",
      "leadId": "{{yelp_lead_id}}",
      "tags": "yelp-phone-captured",
      "yelp-phone-captured": "Yes"
    }
    ```

### Zap 3: Relay & Conversation Configuration (`383750540`)
- **Folder:** `Yelp - GHL RAPIDS`
- **Trigger:** `ZapierMailCLIAPI@2.0.7` (`inbound_v2`)
  - Forwarding Mailbox: `rapidscleaning@robot.zapier.com`
- **Step 1:** `WebHookCLIAPI@1.1.1` (`post`)
  - Destination: `https://cg-lead-bridge.onrender.com/webhook/yelp`
  - Payload Parameters:
    ```json
    {
      "location_id": "8duUHE4ENvhQTCtg3z6o",
      "name": "{{from_name}}",
      "subject": "{{subject}}",
      "message": "{{body_plain}}",
      "email": ""
    }
    ```

---

## 6. Photographic Evidence

Visual artifacts captured during the live CDP session:
- **Connections List Screenshot:** [`scripts/screenshots/zapier_connections.png`](../scripts/screenshots/zapier_connections.png)
- **Zaps Inventory Screenshot:** [`scripts/screenshots/zapier_zaps_list.png`](../scripts/screenshots/zapier_zaps_list.png)
- **Live Zap 1 Editor Screenshot:** [`scripts/screenshots/zap1_editor.png`](../scripts/screenshots/zap1_editor.png)
