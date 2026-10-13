import axios from 'axios';

const TOKEN = 'pit-e378012e-1c77-4b34-acb0-ddd61e22880e';
const LOC_ID = 'ThUMNqsKmDfYKMF0jsBb';
const BRIDGE_URL = 'https://cg-lead-bridge-the-sparkle-squad.onrender.com/webhook/yelp';

async function runSparkleSquadSimulation() {
  console.log('========================================================================');
  console.log('🚀 SIMULATING LIVE YELP LEAD & CHAT FOR THE SPARKLE SQUAD CO (MIAMI)');
  console.log('========================================================================\n');

  const customerName = 'Chloe Bennett';
  const leadHex = `cb_${Date.now()}`;
  const customerPhone = '+17865550199';

  console.log(`[STEP 1] Sending initial Yelp quote request via Render Lead Bridge (Lead ID: ${leadHex})...`);
  const leadPayload = {
    location_id: LOC_ID,
    from: 'Yelp Inbox <no-reply@yelp.com>',
    name: customerName,
    subject: `The Sparkle Squad Co's response to ${customerName}`,
    phone: customerPhone,
    message: `${customerName} requested a quote from The Sparkle Squad Co for a deep cleaning.

## You have a new deep cleaning request.

How often do you want your home cleaned?
Every 2 weeks

How many bedrooms are in your home?
3 bedrooms

How many bathrooms are in your home?
2 bathrooms

Are there any other details you'd like to share?
Condo in Brickell with hardwood floors. Looking to start this Friday!

In what location do you need the service?
33131 (Miami, FL)

View on Yelp: https://biz.yelp.com/leads/${leadHex}
`
  };

  try {
    const res = await axios.post(BRIDGE_URL, leadPayload);
    console.log(`✅ Step 1 Bridge Webhook Response: ${res.status} ${res.statusText}`);
  } catch (err: any) {
    console.error(`❌ Bridge Error:`, err.response?.data || err.message);
    return;
  }

  // Wait 4 seconds (simulating customer sending a follow-up message right after submitting request)
  console.log('⏳ Waiting 4s before sending follow-up chat message...');
  await new Promise(r => setTimeout(r, 4000));

  // STEP 2: Simulate consumer chat reply in Yelp app (even without leadId in payload, testing name + leadId dedup)
  console.log(`[STEP 2] Simulating consumer sending a follow-up chat message in Yelp...`);
  const chatPayload = {
    location_id: LOC_ID,
    from: `${customerName} via Yelp <no-reply@yelp.com>`,
    name: customerName,
    subject: `${customerName} sent a message regarding The Sparkle Squad Co`,
    message: `Hi Mark! Just following up—do you guys have availability this Friday morning around 10 AM? Thanks!`
  };

  const chatRes = await axios.post(BRIDGE_URL, chatPayload);
  console.log(`✅ Step 2 Follow-up Chat Response: ${chatRes.status} ${chatRes.statusText}`);

  // Wait 15 seconds for GHL Elasticsearch indexing + post-creation tag & workflow enrollment
  console.log('⏳ Waiting 15s for GHL search index & workflow enrollment...');
  await new Promise(r => setTimeout(r, 15000));

  const logsRes = await axios.get('https://cg-lead-bridge-the-sparkle-squad.onrender.com/logs');
  const recentEvents = (logsRes.data?.events || []).slice(0, 2);
  console.log('\n📋 RENDER SERVER EVENT LOGS (Last 2 Webhooks):');
  for (const ev of recentEvents) {
    console.log(`   - [${ev.status}] LeadID: ${ev.leadId} -> ContactID: ${ev.contactId}`);
  }

  const ghlHeaders = {
    Authorization: `Bearer ${TOKEN}`,
    Version: '2021-07-28',
  };

  const recentRes = await axios.get(
    `https://services.leadconnectorhq.com/contacts/?locationId=${LOC_ID}&limit=20`,
    { headers: ghlHeaders }
  );

  const matchingContacts = (recentRes.data?.contacts || []).filter(
    (c: any) => (c.contactName || '').toLowerCase() === customerName.toLowerCase()
  );

  console.log(`\n📊 VERIFICATION RESULTS FOR "${customerName}":`);
  console.log(`   Total Contacts Created: ${matchingContacts.length} (Expected: 1 — Zero Duplicates!)`);

  const targetContactId = matchingContacts[0]?.id || recentEvents[0]?.contactId;
  if (targetContactId) {
    const contactDetailRes = await axios.get(
      `https://services.leadconnectorhq.com/contacts/${targetContactId}`,
      { headers: ghlHeaders }
    );
    const contact = contactDetailRes.data?.contact;
    console.log(`   Contact ID: ${contact.id}`);
    console.log(`   Name: ${contact.contactName || `${contact.firstName} ${contact.lastName}`}`);
    console.log(`   Email: ${contact.email}`);
    console.log(`   Phone: ${contact.phone}`);
    console.log(`   Tags: ${contact.tags?.join(', ')}`);
    console.log(`   Custom Fields: ${JSON.stringify(contact.customFields)}`);

    const oppRes = await axios.get(
      `https://services.leadconnectorhq.com/opportunities/search?location_id=${LOC_ID}&contact_id=${contact.id}`,
      { headers: ghlHeaders }
    );
    const opps = oppRes.data?.opportunities || [];
    console.log(`   Total Opportunities Created: ${opps.length} (Stage ID: ${opps[0]?.pipelineStageId})`);
  }
}

runSparkleSquadSimulation();
