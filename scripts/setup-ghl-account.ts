import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

interface SetupOptions {
  locationId?: string;
  token?: string;
}

const API_BASE = 'https://services.leadconnectorhq.com';

const FOLDER_NAME = 'Yelp Leads & Details';

const REQUIRED_CUSTOM_FIELDS = [
  { name: 'Yelp Service Type', dataType: 'TEXT', model: 'contact' },
  { name: 'Yelp Bedrooms', dataType: 'TEXT', model: 'contact' },
  { name: 'Yelp Bathrooms', dataType: 'TEXT', model: 'contact' },
  { name: 'Yelp Cleaning Frequency', dataType: 'TEXT', model: 'contact' },
  { name: 'Yelp Notes / Customer Request', dataType: 'LARGE_TEXT', model: 'contact' },
  { name: 'Yelp Customer Notes', dataType: 'LARGE_TEXT', model: 'contact' },
  { name: 'Yelp Lead ID', dataType: 'TEXT', model: 'contact' },
  { name: 'Yelp Phone Captured', dataType: 'TEXT', model: 'contact' },
];

const REQUIRED_TAGS = [
  'source: yelp',
  'yelp-lead',
  'yelp-phone-captured',
  'yelp-no-phone',
  'yelp-quote-sent',
  'yelp-booked',
  'phone-captured',
];

export async function setupGHLAccount(opts?: SetupOptions) {
  const locationId = opts?.locationId || process.env.GHL_LOCATION_ID;
  const token = opts?.token || process.env.GHL_ACCESS_TOKEN;

  if (!locationId || !token) {
    console.error('❌ Error: GHL_LOCATION_ID and GHL_ACCESS_TOKEN must be provided or set in .env');
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(`🚀 Initializing GoHighLevel Setup for Location: ${locationId}`);
  console.log(`==================================================\n`);

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  };

  // 1. Verify Scope & Connection
  console.log('🔍 Checking API Connection & Token Scopes...');
  let canContacts = false;
  let canCustomFields = false;
  let canTags = false;
  let canOpportunities = false;

  try {
    await axios.get(`${API_BASE}/contacts/?locationId=${locationId}&limit=1`, { headers });
    canContacts = true;
    console.log('  ✅ Contacts Read/Write: Authorized');
  } catch (err: any) {
    console.log(`  ❌ Contacts: ${err.response?.status || err.message}`);
  }

  try {
    const cfRes = await axios.get(`${API_BASE}/locations/${locationId}/customFields?model=contact`, { headers });
    canCustomFields = true;
    console.log(`  ✅ Custom Fields: Authorized (Found ${cfRes.data?.customFields?.length || 0} existing fields)`);
  } catch (err: any) {
    console.log(`  ⚠️ Custom Fields Scope Missing: ${err.response?.status || err.message}`);
  }

  try {
    const tagRes = await axios.get(`${API_BASE}/locations/${locationId}/tags`, { headers });
    canTags = true;
    console.log(`  ✅ Tags: Authorized (Found ${tagRes.data?.tags?.length || 0} existing tags)`);
  } catch (err: any) {
    console.log(`  ⚠️ Tags Scope Missing: ${err.response?.status || err.message}`);
  }

  try {
    await axios.get(`${API_BASE}/opportunities/pipelines?locationId=${locationId}`, { headers });
    canOpportunities = true;
    console.log('  ✅ Opportunities / Pipelines: Authorized');
  } catch (err: any) {
    console.log(`  ⚠️ Opportunities Scope Missing: ${err.response?.status || err.message}`);
  }

  // 2. Provision Custom Field Folder & Fields
  if (canCustomFields) {
    console.log(`\n📁 Checking Custom Field Folder: "${FOLDER_NAME}"...`);
    const existing = await axios.get(`${API_BASE}/locations/${locationId}/customFields?model=contact`, { headers });
    const allFields = existing.data?.customFields || [];
    
    // Look for existing folder
    let folderId = '';
    const existingFolder = allFields.find((f: any) => f.documentType === 'folder' && f.name.toLowerCase() === FOLDER_NAME.toLowerCase());
    
    if (existingFolder) {
      folderId = existingFolder.id;
      console.log(`  ✔️ Folder already exists: "${FOLDER_NAME}" (ID: ${folderId})`);
    } else {
      try {
        const folderRes = await axios.post(
          `${API_BASE}/locations/${locationId}/customFields`,
          { name: FOLDER_NAME, model: 'contact', documentType: 'folder' },
          { headers }
        );
        folderId = folderRes.data?.customFieldFolder?.id || folderRes.data?.customField?.id;
        console.log(`  ✨ Created Folder: "${FOLDER_NAME}" (ID: ${folderId})`);
      } catch (err: any) {
        if (err.response?.data?.meta?.existingId) {
          folderId = err.response.data.meta.existingId;
          console.log(`  ✔️ Folder already exists: "${FOLDER_NAME}" (ID: ${folderId})`);
        } else {
          console.error(`  ⚠️ Could not create folder:`, err.response?.data || err.message);
        }
      }
    }

    console.log('\n📝 Ensuring Required Custom Fields Exist inside Folder...');
    for (const field of REQUIRED_CUSTOM_FIELDS) {
      const match = allFields.find((f: any) => f.name.toLowerCase() === field.name.toLowerCase() && f.documentType !== 'folder');
      if (match) {
        // If not inside the folder, move it
        if (folderId && match.parentId !== folderId) {
          try {
            await axios.put(`${API_BASE}/locations/${locationId}/customFields/${match.id}`, { parentId: folderId }, { headers });
            console.log(`  📂 Moved existing field "${field.name}" into folder "${FOLDER_NAME}"`);
          } catch (err: any) {
            console.log(`  ✔️ Exists: "${field.name}" (Failed to move: ${err.message})`);
          }
        } else {
          console.log(`  ✔️ Already in folder: "${field.name}"`);
        }
      } else {
        try {
          const payload = folderId ? { ...field, parentId: folderId } : field;
          const createRes = await axios.post(`${API_BASE}/locations/${locationId}/customFields`, payload, { headers });
          const newId = createRes.data?.customField?.id;
          if (folderId && newId) {
            await axios.put(`${API_BASE}/locations/${locationId}/customFields/${newId}`, { parentId: folderId }, { headers });
          }
          console.log(`  ✨ Created Custom Field: "${field.name}" inside folder "${FOLDER_NAME}"`);
        } catch (err: any) {
          console.error(`  ❌ Failed to create "${field.name}":`, err.response?.data || err.message);
        }
      }
    }
  }

  // 3. Provision Tags if scope available
  if (canTags) {
    console.log('\n🏷️ Ensuring Required Tags Exist...');
    const existingTagsRes = await axios.get(`${API_BASE}/locations/${locationId}/tags`, { headers });
    const existingTags = new Set((existingTagsRes.data?.tags || []).map((t: any) => t.name.toLowerCase()));

    for (const tag of REQUIRED_TAGS) {
      if (existingTags.has(tag.toLowerCase())) {
        console.log(`  ✔️ Already exists: "${tag}"`);
      } else {
        try {
          await axios.post(`${API_BASE}/locations/${locationId}/tags`, { name: tag }, { headers });
          console.log(`  ✨ Created Tag: "${tag}"`);
        } catch (err: any) {
          console.error(`  ❌ Failed to create tag "${tag}":`, err.response?.data || err.message);
        }
      }
    }
  }

  console.log('\n==================================================');
  if (canCustomFields && canTags && canContacts) {
    console.log('🎉 Setup Complete! Location is 100% prepared and neatly organized into folders.');
  } else {
    console.log('⚠️ Setup Paused: Update the Private Integration Token with missing scopes.');
  }
  console.log('==================================================\n');
}

if (require.main === module) {
  setupGHLAccount().catch(console.error);
}
