import axios from 'axios';

const LOC_ID = '19jBWYeRsrzDq6Oe1nth';
const TOKEN = 'pit-57efb428-1952-48f1-b70b-47f681941579';
const API_BASE = 'https://services.leadconnectorhq.com';
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
};

const STANDARD_TAGS = [
  'source: yelp',
  'yelp-lead',
  'yelp-phone-captured',
  'yelp-no-phone',
  'yelp-quote-sent',
  'yelp-booked',
];

async function provisionTags() {
  console.log(`========================================================================`);
  console.log(`PROVISIONING JACKSONVILLE STANDARD TAGS IN YA'LL MAID AUSTIN (${LOC_ID})`);
  console.log(`========================================================================\n`);

  // 1. Fetch existing tags
  const existingRes = await axios.get(`${API_BASE}/locations/${LOC_ID}/tags`, { headers });
  const existingTags = existingRes.data?.tags || [];
  const existingTagNames = new Set(existingTags.map((t: any) => t.name.toLowerCase()));

  console.log(`Found ${existingTags.length} existing tags:`, existingTags.map((t: any) => t.name));

  for (const tagName of STANDARD_TAGS) {
    if (existingTagNames.has(tagName.toLowerCase())) {
      const match = existingTags.find((t: any) => t.name.toLowerCase() === tagName.toLowerCase());
      console.log(`✅ Tag already exists: "${match.name}" (ID: ${match.id})`);
    } else {
      try {
        const createRes = await axios.post(`${API_BASE}/locations/${LOC_ID}/tags`, { name: tagName }, { headers });
        console.log(`✨ Successfully created tag: "${tagName}" (ID: ${createRes.data?.tag?.id || 'created'})`);
      } catch (err: any) {
        console.error(`❌ Failed to create tag "${tagName}":`, err.response?.data || err.message);
      }
    }
  }

  // Verify final list
  console.log('\n--- VERIFYING FINAL TAG LIST ---');
  const verifyRes = await axios.get(`${API_BASE}/locations/${LOC_ID}/tags`, { headers });
  const finalTags = verifyRes.data?.tags || [];
  STANDARD_TAGS.forEach(st => {
    const found = finalTags.find((t: any) => t.name.toLowerCase() === st.toLowerCase());
    console.log(`  ${found ? '✅' : '❌'} ${st} -> ${found ? found.id : 'NOT FOUND'}`);
  });
}

provisionTags().catch(e => console.error(e));
