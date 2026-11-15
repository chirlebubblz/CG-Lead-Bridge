# Ascend Cleaning — Systems Guide, Lead Nurturing & Staff SOP

**Client / Business:** Ascend Cleaning  
**Location ID:** `IdJoWa68hD3nVj45Fv7f`  
**Business Contact:** `ascendcleaningcompany@gmail.com` | `(213) 319-5497`  
**Market:** Los Angeles, CA  
**Standard:** Jacksonville Golden Master (Pure Email Relay for Yelp + Multi-Channel Meta/Web)

---

## 1. Executive Summary & Core Objective

This system automates end-to-end lead intake, 2-way conversation synchronization, and multi-channel nurturing across **Yelp**, **Meta (Facebook/Instagram)**, and **Website leads**.

It was built with strict adherence to Ascend Cleaning's business rules:
1. **Zero Promos / No Discounts:** Every lead sequence and recurring nurture operates at 100% full price, emphasizing schedule priority, background-checked cleaners, and home care.
2. **Absolute Protection Against Blasting Unhappy or Refund Clients:** An instant multi-tiered circuit breaker stops automation the moment a customer reports dissatisfaction or asks for a refund.
3. **Yelp In-App Chat Delivery:** Yelp leads receive communications via masked relay email, converting outbound messages directly into in-app chat bubbles without 10DLC carrier risk.

---

## 2. Addressing Client Concerns Directly

### Concern 1: "Automations built out for nurturing leads with automatic messages"
* **Resolution:** Four distinct, automated nurturing sequences are live:
  * **Yelp Quote Follow-Up:** 24h and 72h check-ins when an estimate is delivered.
  * **Yelp Ghosted Lead Revival:** 48h and Day 5 check-ins for leads that went cold before a quote.
  * **Meta & Web 30-Day Nurture:** 6-touch sequence over 30 days focusing on trust, quality, and priority scheduling.
  * **Past Client Recurring Re-Booking:** 14-day and 21-day follow-ups upselling one-time cleans into weekly/bi-weekly upkeep.

### Concern 2: "Make sure it doesn’t blast people that had a bad experience or asked for refunds"
* **Resolution:** A **3-Layer Safety Shield** has been built and deployed:
  1. **Whitelist Entry for Past Clients:** The recurring upsell workflow **only** triggers for clients tagged `one-time-good`. Clients with unconfirmed experiences (`one-time-unknown`) or complaints are never enrolled.
  2. **Pre-Send Guardrail Check:** Every workflow runs an automated check before dispatching messages. If the contact has `bad-experience`, `refund`, `refund-requested`, or `sms-suppressed`, execution terminates immediately.
  3. **Instant Circuit Breaker (`Bad Experience Alert Workflow`):** Tagging a contact with `bad-experience`, `refund`, or `refund-requested` instantly ejects them from all active workflows, applies `sms-suppressed`, and alerts management.

### Concern 3: "Let's not do promos, client did not allow promos"
* **Resolution:** All dollar-off and percentage-off incentives have been removed. Messaging focuses on:
  * **Priority Booking:** Reserving preferred morning or afternoon slots before weekend calendars fill up.
  * **Custom Care:** Tailoring checklists for specific areas (appliances, deep scrub vs. standard upkeep).
  * **Dedicated Cleaners:** Keeping the same trusted cleaner for every recurring visit.

### Concern 4: "Yelp messages must land where the customer actually looks"
* **Resolution:** Yelp leads are nurtured via Yelp's Relay address (`leadsapi+...`), which Yelp converts into native push notifications and in-app chat bubbles. Direct SMS is only used for Meta and website leads who opted in directly.

---

## 3. Live Workflow Directory in GoHighLevel

The following automations are published and active in Ascend Cleaning's GoHighLevel sub-account:

| Workflow Name in GHL | Workflow ID | Audience | Trigger Event | Channel | Key Guardrails |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Quote Follow-up Drip`** | `12aec0b0-0aac-45b6-8954-c302f72c3dfd` | Yelp Leads | Opportunity moved to `Quoted` | Yelp Email Relay | Stop on response: **ON**<br>Exits if booked |
| **`No Answer Re-engagement`** | `b2888301-0c42-4b18-81d7-40b3f0308c50` | Yelp Leads | Opportunity moved to `No Answer` | Yelp Email Relay | Stop on response: **ON**<br>Exits if booked |
| **`(Meta & Web Leads) 30-Day Long-Term Nurture`** | `03b32e24-ead6-4d92-aebd-b98da4fe5419` | Meta / Web Leads | Stage ➔ `Automated Sequence`<br>OR Tag ➔ `nurture-active` | SMS + Email | Suppressed if `bad-experience`, `refund`, `customer` |
| **`Upsell Recurring Cleaning`** | `5028fff2-29bc-4a75-9dfd-1dae6fec18a4` | Past Clients | Tag Added ➔ `one-time-good` | SMS + Email | Suppressed if `customer-recurring`, `refund`, `bad-experience` |
| **`Bad Experience Alert Workflow`** | `e81ce855-3b96-496a-a8a7-48759421f570` | Any Contact | Tag Added: `bad-experience`, `refund`, or `refund-requested` | Internal Alert | Ejects contact from all drips, applies `sms-suppressed` |

---

## 4. Message Content & Timing Blueprint

### A. Yelp Leads — `Quote Follow-up Drip`
* **Trigger:** Opportunity moved to `Quoted` in `Pipeline 5 - Yelp Leads Pipeline`.
* **Touch 1 (Wait 24 Hours):**
  * *Subject:* Following up on your cleaning quote - Ascend Cleaning
  * *Body:* *"Hi {{contact.first_name}}, just checking in from Ascend Cleaning! We sent over an estimate for your {{contact.yelp_service_type}} recently — did you get a chance to review it? We'd love to take care of your home. If you have any questions or need to adjust anything, just reply directly here on Yelp and we'll take care of it right away! 🙌"*
* **Touch 2 (Wait 48 Hours / Day 3 Total):**
  * *Subject:* Still looking to schedule your cleaning, {{contact.first_name}}? 🧹
  * *Body:* *"Hi {{contact.first_name}}, wanted to touch base one last time regarding your {{contact.yelp_service_type}} estimate. We still have openings for this coming week and would love to get your home sparkling clean! Let us know if you'd like us to hold a spot for you — just reply here anytime."*

---

### B. Yelp Leads — `No Answer Re-engagement`
* **Trigger:** Opportunity moved to `No Answer` in `Pipeline 5 - Yelp Leads Pipeline`.
* **Touch 1 (Wait 48 Hours):**
  * *Subject:* Cleaning quote for your home - Ascend Cleaning 🧹
  * *Body:* *"Hi {{contact.first_name}}, we noticed we haven't connected yet regarding your Yelp request for {{contact.yelp_service_type}} — completely understand life gets busy! If you're still looking for cleaning help, could you share your approximate square footage and how many bedrooms/bathrooms you have? We can get an accurate quote over to you right away."*
* **Touch 2 (Wait 3 Days / Day 5 Total):**
  * *Subject:* We'll be here whenever you're ready, {{contact.first_name}}!
  * *Body:* *"Hi {{contact.first_name}}, just a quick final note from Ascend Cleaning! If now isn't the right time, no worries at all. Whenever you need cleaning services in the future, feel free to reply right back to this thread on Yelp and we'll pick up right where we left off."*

---

### C. Meta & Web Leads — `(Meta & Web Leads) 30-Day Long-Term Nurture`
* **Day 2 (Wait 24h):** SMS check-in on timing and upcoming openings.
  > *"Hey {{contact.first_name}}, Brandon here from Ascend Cleaning! Just following up to see if you still needed cleaning help this week? We have a couple of openings left! 😊"*
* **Day 4 (Wait 48h):** Email highlighting trust, insurance, and background checks.
  > Subject: `Why Los Angeles homeowners trust Ascend Cleaning ✨`
* **Day 7 (Wait 3 Days):** SMS & Email offering **priority scheduling and custom checklist assistance**.
  > *"Hi {{contact.first_name}}, Brandon from Ascend Cleaning! Our calendar fills up quickly toward the weekend — would you like us to reserve a preferred morning or afternoon spot for your home? Let us know what day works best! 🗓️"*
* **Day 14 (Wait 7 Days):** Quick status check-in.
  > *"Hey {{contact.first_name}}, Ascend Cleaning checking in! Still looking for a reliable cleaner, or did you already get that taken care of? Either way, let us know! 👍"*
* **Day 30 (Wait 16 Days):** Long-term wrap-up & contact retention.
  > *"Hi {{contact.first_name}}, Ascend Cleaning here! Cleaning is one of those things that's easy to put off — if you ever need a deep clean or regular upkeep down the road, we'll be here. Save our number! 🧹✨"*

---

### D. Past Clients — `Upsell Recurring Cleaning`
* **Trigger:** Tag `one-time-good` added after a completed clean.
* **Touch 1 (Wait 14 Days):** SMS check-in on home freshness and dedicated cleaner locking.
  > *"Hi {{contact.first_name}}! Hope your home has been feeling fresh since your clean with Ascend Cleaning! ✨ Most of our clients prefer having regular bi-weekly or monthly upkeep so the house stays effortlessly clean with the same dedicated cleaner. Would you like us to lock in a regular schedule for you?"*
* **Touch 2 (Wait 7 Days / Week 3 Total):** Email detailing benefits of recurring upkeep (reserved preferred time slots, continuous maintenance).
  > Subject: `Keep your home clean year-round effortlessly 🧹`

---

## 5. Staff Operating Procedures (SOP)

### Procedure 1: When a New Yelp Lead Enters
1. The lead arrives in GoHighLevel under **Conversations** with channel type Live Chat / Email Relay.
2. An opportunity is automatically created in `Pipeline 5 - Yelp Leads Pipeline` under stage `New Leads`.
3. Review the customer's survey details (Bedrooms, Bathrooms, Service Type, Notes) in the contact's custom fields.
4. Reply directly in the conversation thread.

### Procedure 2: When an Estimate / Quote is Delivered
1. Move the contact's opportunity card from `New Leads` to **`Quoted`**.
2. This immediately triggers the `Quote Follow-up Drip` in the background.
3. If the customer responds, **Stop on Response** immediately halts further follow-ups.

### Procedure 3: Handling an Unhappy Client or Refund Request (SAFETY PROTOCOL)
If a client expresses dissatisfaction, leaves a poor review, or asks for a refund:
1. Open the contact card in GoHighLevel.
2. In the **Tags** section, add one of the following tags:
   * **`bad-experience`** OR **`refund`** OR **`refund-requested`**
3. **What the system does automatically:**
   * Instantly aborts any active nurture drips.
   * Adds the `sms-suppressed` tag to block automated texts.
   * Removes `nurture-active`.
   * Sends an alert notification to Brandon and staff.

### Procedure 4: After a Completed Clean (Enrolling in Recurring Upsell)
1. Following a clean, verify with the customer or cleaner that the job was completed satisfactorily.
2. If confirmed positive: Add the tag **`one-time-good`**.
3. In 14 days, the system will automatically follow up to offer a dedicated recurring cleaning spot.
4. *Note: If feedback is mixed, pending, or unconfirmed, apply `one-time-unknown`. This ensures the client is not disturbed.*

---

## 6. Technical Stack & Architecture

```
[ Yelp Platform ]
       │
       ├─► Zap 1 (New Lead) ──► Direct API POST (PIT Token) ──► GHL Contact & Pipeline Stage: New Leads
       ├─► Zap 2 (Phone Shared) ──► Direct API POST (PIT Token) ──► Attaches Phone + Tag: yelp-phone-captured
       └─► Zap 3 (Customer Message) ──► Email by Zapier ──► Render Webhook (https://cg-lead-bridge-ascend.onrender.com/webhook/yelp)
                                                                      │
                                                          [ Render Server: CG-Lead-Bridge-Ascend ]
                                                                      │ (HTML cleaning, Lead ID deduplication, shield)
                                                                      ▼
                                                          [ GHL Inbound Live Chat Bubble ]
```

### Key Technical Assets:
* **Location ID:** `IdJoWa68hD3nVj45Fv7f`
* **Yelp Pipeline ID:** `byoJzgmZmdowBaThHgFO`
* **Custom Fields Folder:** `ViSfpkbPF5elDd6LcwKR` (`Yelp Lead Details` — 9 custom fields)
* **Zapier Connection:** Direct API upsert via Location PIT token (`pit-96e543f6-09a3-4d38-8169-62a04c8e8382`) bypassing third-party OAuth scope limitations.
