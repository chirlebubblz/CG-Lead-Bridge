# Yelp ↔ GoHighLevel 2-Way Sync: The Master Architecture & Deployment Playbook

> **Target Audience:** Developers, agency engineers, and automation specialists deploying 2-way Yelp messaging into GoHighLevel (Clean Genie / LeadConnector).
> **Purpose:** A definitive, battle-tested runbook detailing the exact architecture, edge cases, root-cause debugging, and deployment steps to ensure future brand rollouts succeed on Day 1 without repeating past pitfalls.

---

## Table of Contents
1. [Core Architectural Blueprint](#1-core-architectural-blueprint)
2. [Critical Platform Limitations & Realities](#2-critical-platform-limitations--realities)
3. [The Inbound Pipeline (Yelp ➔ GHL) Step-by-Step](#3-the-inbound-pipeline-yelp--ghl-step-by-step)
4. [The Outbound Pipeline (GHL ➔ Yelp) Step-by-Step](#4-the-outbound-pipeline-ghl--yelp-step-by-step)
5. [Triage Log: Past Pitfalls & Permanent Fixes](#5-triage-log-past-pitfalls--permanent-fixes)
6. [Field Mapping & Zapier Configuration Reference](#6-field-mapping--zapier-configuration-reference)
7. [GoHighLevel Configuration & Workflow Guardrails](#7-gohighlevel-configuration--workflow-guardrails)
8. [New Project Launch Checklist](#8-new-project-launch-checklist)

---

## 1. Core Architectural Blueprint

Yelp does not offer native bidirectional webhooks for ongoing conversations to non-enterprise developers. Therefore, a production-grade 2-way sync requires a hybrid **API + Email-Forwarding Bridge**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INBOUND (Yelp ➔ GHL)                           │
│                                                                        │
│   Yelp Consumer Chats ──► Yelp Dispatches Notification Email           │
│                                    │                                   │
│                                    ▼                                   │
│                        Business Gmail (Workspace)                      │
│                                    │ Filter (from: yelp.com)           │
│                                    ▼                                   │
│                        Zapier Inbound Email Box                        │
│                                    │ Webhook POST                      │
│                                    ▼                                   │
│                        Render Lead Bridge Service                      │
│                        - Cleans Yelp HTML boilerplate                  │
│                        - Extracts consumer name from subject           │
│                        - Ignores business owner emails                 │
│                        - Finds matching GHL contact                    │
│                                    │                                   │
│                                    ▼                                   │
│             GHL Inbound Conversations API (TYPE_LIVE_CHAT)             │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                        OUTBOUND (GHL ➔ Yelp)                          │
│                                                                        │
│   GHL Agent Replies In Conversations Tab                               │
│                                    │                                   │
│                                    ▼                                   │
│        GHL Outbound Delivery Webhook OR Native Email to Relay          │
│          Destination: leadsapi+<hex>@messaging.yelp.com                │
│                                    │                                   │
│                                    ▼                                   │
│            Yelp Mail Server Ingests Reply ──► Consumer Yelp Chat       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Critical Platform Limitations & Realities

### Limitation 1: Yelp Leads API Only Triggers for New Leads
- **Behavior:** The Yelp Leads API (`New Lead` / `New Consumer Message` in Zapier) **only** fires when a consumer submits a brand new quote request.
- **Why It Matters:** Subsequent chat bubbles sent by the consumer in an active thread **do not** trigger the Yelp Leads API.
- **Solution:** Ongoing messages must be ingested via Yelp's notification emails.

### Limitation 2: Yelp Fusion Developer OAuth is Restricted
- **Behavior:** Standard Yelp Developer apps (`api.yelp.com`) throw *"Woops! Something doesn't look right"* on `/oauth2/authorize`.
- **Why It Matters:** Yelp strictly reserves OAuth webhook subscriptions for enterprise Technology Partners.
- **Solution:** Do not attempt OAuth lead authorization for standard business listings. Use the email-forwarding bridge.

### Limitation 3: Active WebSocket Suppression
- **Behavior:** If a business user has `biz.yelp.com` or the Yelp for Business mobile app actively open, Yelp delivers messages via real-time WebSocket and **suppresses email notifications** to prevent inbox flooding.
- **Why It Matters:** During developer testing, typing from a consumer account while having the business dashboard open on the same computer will cause Yelp to withhold the email alert.
- **Solution:** Close all `biz.yelp.com` tabs and mobile apps when testing the automated inbound pipeline.

---

## 3. The Inbound Pipeline (Yelp ➔ GHL) Step-by-Step

### Step 3.1: Business Email Verification on Yelp
1. Log into **[biz.yelp.com](https://biz.yelp.com)**.
2. Verify that the user intended to manage notifications is an accepted **Owner** or **Manager** with full permissions.
3. In **Settings ➔ Email Preferences**, verify:
   - ☑ `Send me an email when I receive message leads or direct messages` is **CHECKED**.

### Step 3.2: Gmail Auto-Forwarding Filter
In the Gmail / Google Workspace account receiving the Yelp notifications:
1. In **Settings ➔ Forwarding and POP/IMAP**:
   - Add the Zapier inbound email address (e.g. `[project].iqjzil@zapiermail.com`).
   - Grab the confirmation code from Zapier's test drawer and verify it in Gmail.
2. In **Settings ➔ Filters and Blocked Addresses**:
   - Create a new filter:
     - **From:** `yelp.com` *(Do NOT use `messaging.yelp.com`, as alerts come from `no-reply@yelp.com` or `notifications@yelp.com`)*.
     - **Has the words:** `[Business Name]` *(e.g. `Jacksonville` or `Jacksonville Cleaning Co` to isolate multi-brand inboxes)*.
   - Action:
     - ☑ **Forward it to:** `[project].iqjzil@zapiermail.com`
     - ☑ **Apply the label:** `yelp - [project]`

### Step 3.3: Zapier Workflow
- **Trigger:** `Email by Zapier` ➔ `New Inbound Email`
- **Action:** `Webhooks by Zapier` ➔ `POST`
  - **URL:** `https://[your-service].onrender.com/webhook/yelp`
  - **Payload Type:** `json`
  - **Data Mapping:**
    | Key | Value from Step 1 |
    | :--- | :--- |
    | `name` | `From Name` *(or `Sender Name`)* |
    | `subject` | `Subject` |
    | `message` | `Body Plain` *(or `Snippet`)* |
    | `email` | Leave blank *(or map only if relay email is present)* |

---

## 4. The Outbound Pipeline (GHL ➔ Yelp) Step-by-Step

### How Outbound Delivery Operates
When an initial lead is ingested, Yelp assigns a masked relay email:
```text
leadsapi+<hex>@messaging.yelp.com
```
1. GoHighLevel stores this email as the contact's primary email.
2. When a human agent or workflow sends an email from GoHighLevel Conversations to this address:
   - GoHighLevel dispatches the message via SMTP/Mailgun.
   - Yelp's mail servers receive the email.
   - Yelp parses the body and posts it directly into the customer's Yelp chat interface as an instant message bubble from the business.
3. **No extra webhook is required for outbound if GHL email sending is active!**

---

## 5. Triage Log: Past Pitfalls & Permanent Fixes

### Pitfall 1: Owner Email Hijacking Contacts in GHL
- **Symptom:** Inbound Yelp messages were being attached to an internal card named `"Jordan E. Sabalo"` or `"Yelp Customer"` instead of the real lead (`Chirle` or `Jordan Test`).
- **Root Cause:** Yelp emails include the footer *"This email was sent to businessowner@gmail.com"*. When Zapier forwarded this or passed the owner email, GoHighLevel's duplicate search matched the owner's internal contact card.
- **Permanent Fix in Bridge Code (`src/server.ts`):**
  ```typescript
  let email = body?.email || body?.customer_email || body?.temporary_email_address;
  // Never treat Zapier addresses or the business owner's email as the customer's email
  if (email && (email.includes('zapiermail.com') || email.includes('jerafisabalo') || email.includes('jacksonvillecleaningco'))) {
    email = undefined;
  }
  ```

### Pitfall 2: Generic "Yelp Inbox" Sender Name
- **Symptom:** Yelp notification emails have the header `From: Yelp Inbox <reply+...@messaging.yelp.com>`. The Lead Bridge was searching GHL for a contact named "Yelp Inbox" and creating dummy contacts.
- **Root Cause:** In ongoing message replies, Yelp replaces the consumer's sender name with `Yelp Inbox`.
- **Permanent Fix in Bridge Code (`src/server.ts`):**
  ```typescript
  // Extract customer name from subject or body if missing or generic
  if (!name || ['Yelp Customer', 'Yelp', 'Yelp Inbox'].includes(name)) {
    if (/response to\s+(.+)$/i.test(subject)) {
      name = subject.match(/response to\s+(.+)$/i)![1].trim(); // Matches "RE: [Biz]'s response to Chirle"
    } else if (/sent a message/i.test(subject)) {
      name = subject.split(/sent a message/i)[0].trim();       // Matches "Jordan Test sent a message..."
    } else if (/,\s*([^\r\n,]+?)\s+has replied/i.test(directMessage)) {
      name = directMessage.match(/,\s*([^\r\n,]+?)\s+has replied/i)![1].trim();
    } else if (/New Message from\s+([^\r\n]+)/i.test(directMessage)) {
      name = directMessage.match(/New Message from\s+([^\r\n]+)/i)![1].trim();
    }
  }
  name = name.replace(/^RE:\s*/i, '').trim();
  ```

### Pitfall 3: Yelp Email Notification Boilerplate Ingested into Chat
- **Symptom:** Inbound messages in GHL showed ugly text like `| [ Respond Now ]` and Yelp disclaimer links.
- **Permanent Fix in Bridge Code (`src/server.ts`):**
  ```typescript
  // Strip Yelp boilerplate and isolate the pure message text
  if (cleanMessage.includes('Respond Now') || cleanMessage.includes('Or simply respond')) {
    const marker = cleanMessage.includes('Respond Now') ? 'Respond Now' : 'Or simply respond';
    const textBefore = cleanMessage.slice(0, cleanMessage.indexOf(marker));
    const lines = textBefore.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('|') && !l.startsWith('---') && !l.startsWith('**') && !l.startsWith('##') && !l.startsWith('New Message') && !l.startsWith('Hi ') && !l.startsWith('['));
    if (lines.length > 0) {
      cleanMessage = lines[lines.length - 1];
    }
  }
  ```

### Pitfall 4: Google Forwarding Error (400) on Link Verification
- **Symptom:** Clicking Google's email forwarding confirmation link fails with `Temporary Error (400)`.
- **Root Cause:** Browser is signed into multiple Google accounts simultaneously.
- **Permanent Fix:** Never click the URL. In the confirmation email inside Zapier's test drawer, copy the 9-digit alphanumeric **Confirmation Code** and paste it directly into Gmail Settings ➔ Forwarding ➔ **Verify**.

---

## 6. Field Mapping & Zapier Configuration Reference

When deploying a new location in Zapier, use these exact parameters:

### Step 1: Email by Zapier
- **Event:** `New Inbound Email`
- **Email Address:** `[location-name][random-prefix]@zapiermail.com`

### Step 2: Webhooks by Zapier
- **Action Event:** `POST`
- **URL:** `https://[your-app-name].onrender.com/webhook/yelp`
- **Payload Type:** `json`
- **Data Dictionary:**
  | Key | Zapier Field | Rationale |
  | :--- | :--- | :--- |
  | `name` | `1. From Name` | Used by bridge if available; falls back to subject parsing. |
  | `subject` | `1. Subject` | Critical for extracting consumer name when `name` is "Yelp Inbox". |
  | `message` | `1. Body Plain` | Contains full message; parsed automatically by bridge. |
  | `email` | *(Leave Empty)* | Prevents accidental mapping of forwarding or owner emails. |

---

## 7. GoHighLevel Configuration & Workflow Guardrails

### 1. Hardcoded Brand Name Check (Mandatory!)
When cloning snapshots or workflows from an existing business (e.g. Mum's Cleaning Services) to a new client (e.g. Jacksonville Cleaning Co):
- Open **Automation ➔ Workflows ➔ Yelp Lead Intake & Response**.
- Inspect every automated email and SMS template.
- **Replace hardcoded company names, phone numbers, and cities** with dynamic custom values (e.g. `{{location.name}}`) or the new client's exact brand details.

### 2. Opportunity Pipeline Architecture
- **Pipeline:** `Pipeline 1 - New Leads`
- **Initial Stage:** `New Leads`
- **Lead Tags:** `source: yelp`, `yelp-lead`, `yelp-no-phone`
- **Custom Field:** `yelp_lead_id` (Text)

---

## 8. New Project Launch Checklist

Follow this checklist sequentially whenever rolling out a new Yelp business listing:

- [ ] **Yelp Business Role:** Manager/Owner invite accepted on `biz.yelp.com`.
- [ ] **Notification Preferences:** Email notifications for customer messages checked in `biz.yelp.com`.
- [ ] **Zapier Mailbox Created:** Custom inbound address generated.
- [ ] **Gmail Forwarding Verified:** Confirmation code entered in Gmail Settings (without clicking link).
- [ ] **Gmail Filter Active:** `from: yelp.com` + `has the words: [City/Brand Name]` ➔ Forward to Zapier.
- [ ] **Zap Published:** Webhook POST mapped and Zap toggled **ON** (not Draft).
- [ ] **Workflow Audited:** Company name in GHL auto-responder verified.
- [ ] **End-to-End Test Conducted:**
  - Close `biz.yelp.com` tab.
  - Send message as consumer from a distinct Yelp account.
  - Verify inbound message appears in GHL Conversations.
  - Type reply in GHL Conversations and verify receipt in consumer Yelp chat.
