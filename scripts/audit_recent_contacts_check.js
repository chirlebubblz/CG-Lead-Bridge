const fs = require('fs');
const path = require('path');

const contactsPath = path.join(__dirname, 'mums_all_contacts.json');

if (!fs.existsSync(contactsPath)) {
  console.log(`[WARN] ${contactsPath} not found. Please run scripts/audit_mums_yelp_leads.js first to generate fresh contact dumps.`);
  process.exit(0);
}

const contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));

const recent = contacts.filter(c => c.dateAdded && c.dateAdded >= '2026-11-10T00:00:00Z');
recent.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

console.log('Recent contacts count (since 2026-11-10):', recent.length);
for (const c of recent) {
  const yelpField = (c.customFields || []).find(f => f.id === 'xofbiSRUGxxg2jFbVlRr');
  const yelpId = yelpField ? yelpField.value : 'none';
  console.log(`[${c.dateAdded}] ID: ${c.id} | Name: "${c.contactName || ''}" | Phone: ${c.phone} | Email: ${c.email} | YelpLeadId: ${yelpId} | Tags: ${JSON.stringify(c.tags)}`);
}

