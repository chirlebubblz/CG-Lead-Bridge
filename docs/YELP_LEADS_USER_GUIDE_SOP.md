# Yelp Leads Standard Operating Procedure (SOP) & User Guide
### For Sales Reps, Dispatchers, and Virtual Assistants

---

## 📌 1. Overview: How the Yelp ↔ GoHighLevel System Works

When a homeowner or customer requests a quote or sends a message on **Yelp**, it is automatically synced directly into your **GoHighLevel (GHL)** sub-account in real-time.

```
┌─────────────────┐       ┌─────────────────┐       ┌────────────────────────┐
│  Customer on    │ ───►  │  GoHighLevel    │ ───►  │  Sales Rep / VA        │
│  Yelp Mobile    │       │  Conversations  │       │  Replies via GHL Email │
└─────────────────┘       └─────────────────┘       └────────────────────────┘
        ▲                                                       │
        │                                                       │
        └────────────────── Yelp In-App Chat Bubble ───────────┘
```

### What Happens Automatically:
1. **Contact Created:** The customer’s name, details, and masked Yelp relay address (`leadsapi+...@messaging.yelp.com`) are saved in GHL.
2. **Details Captured:** Bedrooms, bathrooms, cleaning type, frequency, and custom notes appear in the contact's custom fields.
3. **Opportunity Created:** A deal card appears automatically in your **Yelp Leads Pipeline** under **"New Leads"**.
4. **Instant First Response:** The system automatically sends a personalized initial message back to the customer's Yelp thread in under **90 seconds**, ensuring our profile keeps the **"Typically replies in minutes"** badge.

---

## ⚠️ 2. The 3 Golden Rules (CRITICAL)

### 🥇 Rule 1: Always Reply via the "Email" Tab in GHL
* **Why:** The customer's "email address" in GHL is actually a special Yelp communication bridge (`leadsapi+...`).
* **The Magic:** When you click **Email** and hit Send in GHL, Yelp receives your message and immediately converts it into a **native chat bubble** inside the customer's Yelp app!
* **What NEVER to do:** Do NOT attempt to switch the channel to SMS or WhatsApp for initial Yelp leads. The customer is waiting on the Yelp app.

---

### 🥈 Rule 2: When & How to Use Phone Numbers
* If the customer provided a phone number when submitting their request on Yelp, you will see it populated in their contact profile and tagged with `yelp-phone-captured`.
* **When to Call:** Call them if they explicitly write *"Please call me"* in their notes, or if a high-value quote requires immediate phone qualification.
* **When NOT to text:** Never send automated blast marketing texts to phone numbers captured on Yelp. Always keep the conversation primarily on Yelp chat unless the customer requests otherwise.

---

### 🥉 Rule 3: Keep biz.yelp.com Closed During Work Hours
* If you have `biz.yelp.com` or the Yelp for Business app open and active on your desktop or phone, Yelp assumes you are actively reading messages there and **suppresses real-time notifications to GHL**.
* **Best Practice:** Do all your chatting, quoting, and messaging exclusively inside **GoHighLevel Conversations**.

---

## 🧭 3. Where to Find Yelp Leads in GoHighLevel

### A. The Conversations Tab (`Conversations ➔ All`)
* Look for contacts with the tag `source: yelp` or `yelp-lead`.
* When you open the conversation:
  - You will see the incoming inquiry and customer questions.
  - The contact drawer on the right side contains the **Yelp Lead Details** folder.

### B. The Yelp Lead Details Drawer
Click on the contact's name and expand the **Yelp Lead Details** folder:
| Field Name | Description |
| :--- | :--- |
| **Yelp Service Type** | e.g., *House Cleaning*, *Deep Cleaning*, *Move-in/Move-out* |
| **Yelp Bedrooms** | Number of bedrooms selected (e.g., `3`) |
| **Yelp Bathrooms** | Number of bathrooms selected (e.g., `2`) |
| **Yelp Cleaning Frequency** | e.g., *Bi-weekly*, *One-time*, *Monthly* |
| **Yelp Notes / Customer Request**| Any special instructions written by the customer |
| **Yelp Phone Captured** | Customer phone number if provided |
| **Yelp Lead ID** | Unique Yelp reference code |

### C. The Dedicated Pipeline (`Opportunities ➔ Yelp Leads Pipeline`)
Every Yelp inquiry has an Opportunity card with their estimated job value.

---

## 📋 4. Step-by-Step SOP: Handling a Lead from Inbound to Booked

```
[New Lead] ➔ [Auto-Reply Sent] ➔ [Customer Replies] ➔ [Send Custom Quote] ➔ [Book / Deposit]
```

### Step 1: Lead Ingestion & Automated Intake (Minute 0 – 2)
* The lead enters the pipeline stage: **1. New Leads**.
* The automated system waits 90 seconds (to capture any phone number) and fires the initial response email.
* **Your action:** None required yet. Allow the automation to fire.

---

### Step 2: Customer Replies in Yelp Chat (Active Lead)
* The customer sends a reply on Yelp (e.g., *"Yes, it's about 2,200 sq ft, and we have two dogs"*).
* This message immediately pops up in **GHL Conversations**.
* **Automation Safety:** Because the customer replied, the system automatically stops any automated no-answer follow-ups.
* **Your action:**
  1. Open the conversation.
  2. Drag the Opportunity card from **New Leads** to **3. In Conversation / Qualified**.

---

### Step 3: Formulating and Sending the Quote
1. Check the **Yelp Lead Details** (Bedrooms, Bathrooms, Notes) to calculate the estimate.
2. In the GHL Conversation window, ensure the **Email** tab is selected.
3. Write your clear, friendly quote:
   > *"Hi [First Name], thanks for those details! For a [X] bed / [Y] bath [Service Type], our rate is $[Price] (estimated at [Hours] hours). We currently have openings this [Day] morning or [Day] afternoon. Would either of those work best for your schedule?"*
4. Click **Send**.
5. Drag the Opportunity card to **4. Quote Sent**.
6. Add tag: `yelp-quote-sent`.

---

### Step 4: Booking the Job
When the customer confirms a date and time:
1. Collect their service address and entry instructions.
2. Send your booking link, invoice, or credit card authorization per company policy.
3. Once confirmed:
   - Drag the Opportunity card to **5. Deposit Paid / Booked**.
   - Add tag: `yelp-booked`.
   - Create the appointment in the GHL Calendar.
4. Reply on Yelp to confirm:
   > *"You are all set for [Date] at [Time]! Our team will see you then. If you need anything prior to your appointment, feel free to message us here or call our office."*

---

### Step 5: Handling Unresponsive Leads (Follow-Up Sequence)
If the customer has not replied within 24 hours:
* **Automated Follow-ups:** The system will automatically send a polite check-in email at **24 Hours** and a final inquiry closeout at **48 Hours**.
* If still no response after 7 days:
  - Drag the Opportunity card to **7. Lost / No Response**.

---

## 📊 5. The 8 Pipeline Stages & Meanings

| # | Stage Name | Description & Action |
| :-: | :--- | :--- |
| **1** | **New Leads** | Inbound quote request just received. System is firing initial 90s response. |
| **2** | **Responded / Awaiting Client** | Automated initial response sent; waiting for customer to reply on Yelp. |
| **3** | **In Conversation / Qualified** | Customer has replied. Sales rep/VA is actively chatting with them. |
| **4** | **Quote Sent** | Pricing and availability sent to customer; awaiting their booking confirmation. |
| **5** | **Deposit Paid / Booked** | Customer confirmed and scheduled. Job is locked in. |
| **6** | **Follow-up Needed (24h/48h)** | Customer went silent after receiving quote. Manual follow-up required. |
| **7** | **Lost / No Response** | Customer ghosted after full follow-up sequence, or chose another vendor. |
| **8** | **Unqualified / Spam** | Outside service radius, commercial inquiry when residential only, or solicitations. |

---

## 💡 6. Quick Reference: Common Scenarios

### Scenario A: Customer says *"Can you call me?"*
* Check the **Yelp Phone Captured** field or conversation text.
* Call the customer from your GHL dialer.
* After the call, log a quick internal note in GHL and send a brief recap on Yelp:
  > *"Great speaking with you, [First Name]! As discussed on the phone, I’ve held [Day/Time] for your cleaning."*

### Scenario B: Customer asks for an in-person estimate or square footage check
* If home is over 3,500 sq ft or has custom requests:
  > *"For homes of this size, we love to ensure our team has enough dedicated time. Could you confirm approximate square footage and if there are any specific priority areas (like ovens, baseboards, or interior windows)?"*

### Scenario C: Customer is outside your service area
* Move Opportunity to **8. Unqualified / Spam**.
* Send polite decline message:
  > *"Hi [First Name], thank you for reaching out! Unfortunately, [Zip Code/City] is currently outside our service boundary. We wish you the best with your cleaning project!"*

---

## 🛠️ 7. Troubleshooting & Escalation

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| Customer message doesn't appear in GHL | Yelp `biz.yelp.com` web or app was actively open | Close Yelp business tabs/app so Yelp sends email notifications. |
| Message sent in GHL shows delivery failure | Wrong channel selected | Make sure you clicked **Email** (not SMS) when composing reply. |
| Wrong brand name mentioned in email | Workflow sender profile misconfigured | Check that the "From Name" in the email action matches the specific location. |
| Lead belongs to another location | Gmail filter keyword overlap | Check Gmail forwarding rule to ensure business name is enclosed in quotes. |

---
*Questions or system issues? Contact your System Administrator or Technical Lead.*
