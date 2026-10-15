import axios from 'axios';

const KNOWN_TOKENS: Record<string, string> = {
  'EKXbBmGEV6hnLQFQRPc7': 'pit-b26f30e8-7d61-4c6f-b925-2ed84ececcc0', // Jacksonville
  's94e80clit6bCL9VBWgl': 'pit-5cd3741b-9fde-4039-91da-c869573e74ce', // Capable Clean
  'IdJoWa68hD3nVj45Fv7f': 'pit-96e543f6-09a3-4d38-8169-62a04c8e8382', // Ascend Cleaning
  'ThUMNqsKmDfYKMF0jsBb': 'pit-e378012e-1c77-4b34-acb0-ddd61e22880e', // The Sparkle Squad Co
  'WOwi6fpdaZavuqHU8Rux': 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb', // Sunny Side Clean Team
  'MucxtGIfmvLViGQWD0CG': 'pit-3e2b6d46-5ff3-472c-bd48-16ee70d76fbc', // Puget Sound Cleaners
  'YVtPYdLotWLwuy5AA8Vv': 'pit-f62d319a-797d-437d-bc0c-90a55d4a3dcf', // Mum's Cleaning Chicago
  '19jBWYeRsrzDq6Oe1nth': 'pit-57efb428-1952-48f1-b70b-47f681941579', // Ya'll Maid Austin
  '8duUHE4ENvhQTCtg3z6o': 'pit-us-19731ed6-4097-48e4-89aa-934c295b91d0', // Rapids Cleaning Service
};

async function auditLocation(locId: string, token: string) {
  const headers = { Authorization: `Bearer ${token}`, Version: '2021-07-28' };
  try {
    // 1. Check custom field yelp_lead_id exists
    const fieldsRes = await axios.get(`https://services.leadconnectorhq.com/locations/${locId}/customFields`, { headers });
    const yelpLeadIdField = fieldsRes.data?.customFields?.find(
      (f: any) => f.fieldKey === 'contact.yelp_lead_id' || f.name === 'Yelp Lead ID'
    );
    
    // 2. Search recent opportunities
    const oppsRes = await axios.get(`https://services.leadconnectorhq.com/opportunities/search?location_id=${locId}&limit=20`, { headers });
    const opps = oppsRes.data?.opportunities || [];
    
    // Check for duplicate opportunities by contactId
    const contactMap: Record<string, any[]> = {};
    for (const o of opps) {
      const cid = o.contactId || o.contact?.id;
      if (cid) {
        if (!contactMap[cid]) contactMap[cid] = [];
        contactMap[cid].push(o);
      }
    }
    
    const duplicates = Object.entries(contactMap).filter(([_, list]) => list.length > 1);
    
    console.log(`[Location: ${locId}] yelp_lead_id Field: ${yelpLeadIdField ? '✅ ' + yelpLeadIdField.id : '❌ MISSING'} | Total Opps: ${opps.length} | Duplicates: ${duplicates.length}`);
    if (duplicates.length > 0) {
      for (const [cid, list] of duplicates) {
        console.log(`   Duplicate for Contact ${cid} (${list[0].contact?.name}): ${list.map(x => x.id).join(', ')}`);
      }
    }
  } catch (err: any) {
    console.error(`[Location: ${locId}] Error:`, err.response?.data?.message || err.message);
  }
}

async function runAudit() {
  console.log('=== AUDITING ALL LOCATIONS FOR YELP_LEAD_ID & DUPLICATES ===');
  for (const [locId, token] of Object.entries(KNOWN_TOKENS)) {
    await auditLocation(locId, token);
  }
}

runAudit();
