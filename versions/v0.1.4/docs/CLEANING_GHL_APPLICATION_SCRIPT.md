# 🎬 Cleaning Business Automation Walkthrough Script (4+ Minutes)
**Candidate:** Jordan Sabalo  
**Voice:** James — Filipino English (`en-PH-JamesNeural`)  
**Live Sub-Account:** Mum's Cleaning Services (Chicago, IL)  
**Positioning:** Actively building and managing a Yelp ↔ GHL bridge for the clients of an agency (this is one of the live production accounts handled).  

---

## 📜 Full Spoken Script (Word-for-Word)

### [0:00 – 0:50] Introduction, Disclaimer & Agency Context
> "Hi there! My name is Jordan Sabalo. First off, I apologize for using an AI voiceover—I am currently dealing with a severe cold and sore throat that has made it impossible to speak out loud, but when I saw that you run a residential cleaning business using GoHighLevel and BookingKoala, I knew I was the right person and did not want to miss your deadline. I engineered this automated walkthrough to show you my real systems, and I hope this will suffice!
>
> Currently, I am building and managing a real-time Yelp-to-GoHighLevel bridge for the clients of an agency, and what you are seeing on screen right now is one of the live client accounts I handle: Mum's Cleaning Services in Chicago. If you know them, please don't let them know I used this account!
>
> On the dashboard, you can see over 300 tracked opportunities, nearly 21,000 dollars in pipeline value, and our live conversion metrics that we monitor daily."

---

### [0:50 – 1:45] The Opportunities Board & Yelp Integration Benchmark
> "Now, let us jump into the Opportunities board. Here is our dedicated Yelp Leads pipeline with over 110 active deals. Notice how the stages are structured: New Leads, 95 active leads in Automation Drip, Manual Follow-Up, and Not Qualified.
>
> I specifically want to show you how we handle external third-party lead sources like Yelp, because Yelp is the ultimate stress test. Yelp is a closed ecosystem that does not have a native GoHighLevel integration. In an un-automated setup, leads get stuck in an outside inbox, response times lag, and customer phone numbers are submitted asynchronously."

---

### [1:45 – 2:45] Live Production Lead Breakdown: Arlene H.
> "To see how our system operates with live data, let us open an actual customer record: Arlene H.
>
> Here you can see the fundamental difference between a usual lead and an external integration.
>
> First, look at the email address: it is a masked Yelp communication relay. When our team replies via email inside GoHighLevel, our server bridge converts it into a native chat bubble directly inside the customer's Yelp mobile app.
>
> Second, notice the phone number. When the lead first came in, she did not provide a phone number. But 60 seconds later, our companion webhook captured her phone number, tagged it `yelp-phone-captured`, and merged it cleanly without creating a duplicate contact.
>
> Third, look at the live conversation history: her inbound cleaning specifications were parsed automatically, followed by a formal quote of 243 dollars bi-weekly from our team, and our automated 24-hour follow-up check-in."

---

### [2:45 – 3:50] Translating 1:1 to BookingKoala & Cleaner Dispatch
> "This exact event-driven architecture is how I will connect BookingKoala to your GoHighLevel account:
>
> • **Number one:** Your website intake form will send client details and space photos via webhook into GoHighLevel custom fields, storing the photo gallery directly on the contact record for quote estimators.  
> • **Number two:** BookingKoala webhooks will sync self-bookings, automatically creating contacts, applying tags, and creating pipeline deal cards.  
> • **Number three:** For payments, BookingKoala connects to Stripe to store the card on file—placing authorization holds for first-time hourly cleans and flat-rate billing for recurring clients. GoHighLevel will listen for successful payment webhooks to fire instant receipts and post-clean review requests.  
> • **Number four:** When a cleaner is assigned in BookingKoala, GoHighLevel triggers a two-way SMS dispatch workflow: *'New job on Friday at 9 AM. Reply CONFIRM to accept.'* If the cleaner texts CONFIRM, the system tags them confirmed and updates your board. If they reply reschedule or cancel, it alerts your office immediately.  
> • **And number five:** If a cleaner fails to confirm within two hours, an automated timeout escalation immediately texts you so you can reassign the job with zero stress."

---

### [3:50 – 4:15+] Rates, Daily Cadence & Email Invitation Close
> "Regarding how we will work together:  
> I am completely ready for the one-week paid trial at 10 dollars an hour, or 400 dollars for the 40-hour week, to connect BookingKoala, your intake form, and cleaner confirmation workflows. For ongoing full-time work, my rate is 2,000 dollars per month.  
>
> I fully commit to your daily check-in cadence: a morning plan of what is prioritized for the day, midday progress updates as builds are tested, and an end-of-day summary of what was completed.  
>
> Thanks so much for staying with me through this walkthrough, and I hope we talk soon!  
>
> If you have any more questions, please feel free to send me an email, and I look forward to connecting and helping you automate your cleaning business!"
