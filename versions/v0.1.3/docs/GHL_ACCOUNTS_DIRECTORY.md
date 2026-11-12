# GoHighLevel Multi-Account Directory & Verification Runbook

**Authenticated Identity:** `Jordan E. Sabalo` (`jerafisabalo@gmail.com`)  
**Timestamp:** 2026-10-30  
**Verification Method:** Playwright CDP Automated Lifecycle Cycling (Connect over CDP `http://127.0.0.1:9222`)  
**Status:** 100% Automated Discovery & Verification Complete (9 of 9 Accounts)

---

## 1. Executive Summary

A systematic verification cycle was executed across all GoHighLevel sub-accounts and agency organizations linked to the authenticated Google identity `Jordan E. Sabalo`. 

Each account was individually loaded from the GoHighLevel Account Chooser modal (`#multiple-users-modal`), evaluated for operational health and location parameters, documented with screenshot evidence, logged out back to the authentication screen, and re-authenticated via Google Identity Services.

---

## 2. Complete Account Registry

| # | Account / Organization Name | User Display Identity | Role / Access Type | Location / Company ID | Operational Status | Evidence Screenshot |
|---|---|---|---|---|---|---|
| **1** | **test test** | Jordan Sabalo | Agency Admin | `Agency ID: O9AHTVgReKmVTjqF7tcv` | ⚠️ Inactive Renewal / Suspended | [account_1_test_test.png](../scripts/screenshots/account_1_test_test.png) |
| **2** | **Sam and Max Enterprises** | MetaScale Yelp | Location Sub-Account | `IoU6ToP3okYmCe2CKNly` | 🟢 Verified Active (Launchpad) | [account_2_Sam_and_Max_Enterprises.png](../scripts/screenshots/account_2_Sam_and_Max_Enterprises.png) |
| **3** | **Clean Genie** | Jordan Sabalo | Location Sub-Account | `s94e80clit6bCL9VBWgl` | 🟢 Verified Active | [account_3_Clean_Genie.png](../scripts/screenshots/account_3_Clean_Genie.png) |
| **4** | **Mountain Top Cleaning and Maintenance** | Jordan Sabalo | Location Sub-Account | `YVtPYdLotWLwuy5AA8Vv` | 🟢 Verified Active | [account_4_Mountain_Top_Cleaning_and_Maintenance.png](../scripts/screenshots/account_4_Mountain_Top_Cleaning_and_Maintenance.png) |
| **5** | **Realty Rulers** | Jordan Realty Rulers | Agency Admin | `Agency ID: RealtyRulers` | 🟢 Verified Active (Agency Dashboard) | [account_5_Realty_Rulers.png](../scripts/screenshots/account_5_Realty_Rulers.png) |
| **6** | **LeadEazy** | Jordan Sabalo | Agency Admin | `Agency ID: LeadEazy` | 🟢 Verified Active (Agency Dashboard) | [account_6_LeadEazy.png](../scripts/screenshots/account_6_LeadEazy.png) |
| **7** | **Ascend Cleaning** | jordan sabalo | Location Sub-Account | `IdJoWa68hD3nVj45Fv7f` | 🟢 Verified Active | [account_7_Ascend_Cleaning.png](../scripts/screenshots/account_7_Ascend_Cleaning.png) |
| **8** | **Rapids Cleaning Services** | Jordan Sabalo | Location Sub-Account | `8duUHE4ENvhQTCtg3z6o` | 🟢 Verified Active | [account_8_Rapids_Cleaning_Services.png](../scripts/screenshots/account_8_Rapids_Cleaning_Services.png) |
| **9** | **SmartChat AI** | Jordan S | Organization Sub-Account | `SmartChatAI-Org` | 🟢 Verified Active | [account_9_SmartChat_AI.png](../scripts/screenshots/account_9_SmartChat_AI.png) |

---

## 3. Account Highlights & Specific Findings

### Account 1: `test test`
- **Identity:** Jordan Sabalo
- **Type:** Agency Admin / Multi-user
- **Observation:** Direct navigation resulted in `/inactive-renewal` landing screen, indicating an expired billing subscription or trial.

### Account 2: `Sam and Max Enterprises`
- **Identity:** MetaScale Yelp
- **Type:** Location Sub-Account
- **Location ID:** `IoU6ToP3okYmCe2CKNly`
- **Landing URL:** `https://app.gohighlevel.com/v2/location/IoU6ToP3okYmCe2CKNly/launchpad`
- **Observation:** Fully functional sub-account with Launchpad onboarding active.

### Account 3: `Clean Genie`
- **Identity:** Jordan Sabalo
- **Type:** Location Sub-Account (Primary Workspace Standard)
- **Location ID:** `s94e80clit6bCL9VBWgl`
- **Observation:** Core operational instance configured in `.env` for Yelp Partner API integration.

### Account 4: `Mountain Top Cleaning and Maintenance`
- **Identity:** Jordan Sabalo
- **Type:** Location Sub-Account
- **Location ID:** `YVtPYdLotWLwuy5AA8Vv`
- **Observation:** Associated with Mum's Cleaning Chicago / Mountain Top Cleaning portfolio.

### Account 5: `Realty Rulers`
- **Identity:** Jordan Realty Rulers
- **Type:** Agency View
- **Landing URL:** `https://app.gohighlevel.com/agency_dashboard?tab=summary`
- **Observation:** Full Agency Level Administration dashboard with multi-location overview.

### Account 6: `LeadEazy`
- **Identity:** Jordan Sabalo
- **Type:** Agency View
- **Landing URL:** `https://app.gohighlevel.com/agency_dashboard?tab=summary`
- **Observation:** Agency management account.

### Account 7: `Ascend Cleaning`
- **Identity:** jordan sabalo
- **Type:** Location Sub-Account
- **Location ID:** `IdJoWa68hD3nVj45Fv7f`
- **Observation:** Active client sub-account with documented Yelp ↔ GHL SOP in `docs/ASCEND_CLEANING_GHL_SETUP.md`.

### Account 8: `Rapids Cleaning Services`
- **Identity:** Jordan Sabalo
- **Type:** Location Sub-Account
- **Location ID:** `8duUHE4ENvhQTCtg3z6o`
- **Observation:** Fully configured sub-account documented in `docs/RAPIDS_CLEANING_SERVICE_GHL_SETUP.md`.

### Account 9: `SmartChat AI`
- **Identity:** Jordan S
- **Type:** SaaS / Organization Sub-Account
- **Observation:** Dedicated AI SaaS organization account.

---

## 4. Verification Artifacts & Reproducibility
- **Automated Cycling Script:** `scripts/run_complete_cycle.py`
- **Structured JSON Snapshot:** `scripts/ghl_accounts_directory.json`
- **Screenshot Directory:** `scripts/screenshots/`
