import axios from 'axios';

const locationId = 'WOwi6fpdaZavuqHU8Rux';
const token = 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb';
const API_BASE = 'https://services.leadconnectorhq.com';

const FOLDER_NAME = 'Yelp Lead Details';

const REQUIRED_CUSTOM_FIELDS = [
  { name: 'Yelp Service Type', dataType: 'TEXT', model: 'contact', description: 'Deep Clean, Standard Clean, Move-Out, etc.' },
  { name: 'Yelp Bedrooms', dataType: 'TEXT', model: 'contact', description: 'Number of bedrooms specified in survey' },
  { name: 'Yelp Bathrooms', dataType: 'TEXT', model: 'contact', description: 'Number of bathrooms specified in survey' },
  { name: 'Yelp Cleaning Frequency', dataType: 'TEXT', model: 'contact', description: 'Cleaning frequency requested (one-time, weekly, bi-weekly)' },
  { name: 'Yelp Notes / Customer Request', dataType: 'LARGE_TEXT', model: 'contact', description: 'Full questionnaire summary and customer notes' },
  { name: 'Yelp Lead ID', dataType: 'TEXT', model: 'contact', description: "Yelp's unique lead/conversation identifier" },
  { name: 'Yelp Phone Captured', dataType: 'TEXT', model: 'contact', description: 'Direct customer phone if provided' },
];

const REQUIRED_TAGS = [
  'source: yelp',
  'yelp-lead',
  'yelp-phone-captured',
  'yelp-no-phone',
  'yelp-quote-sent',
  'yelp-booked',
];

const headers = {
  Authorization: `Bearer ${token}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
};

async function provision() {
  console.log(`\n===============================================================`);
  console.log(`🚀 Provisioning Sunny Side Clean Team (${locationId})...`);
  console.log(`===============================================================\n`);

  // 0. Location Details
  let locationInfo: any = null;
  try {
    const locRes = await axios.get(`${API_BASE}/locations/${locationId}`, { headers });
    locationInfo = locRes.data?.location;
    console.log(`📍 Location Name: ${locationInfo?.name || 'Sunny Side Clean Team'}`);
    console.log(`🏢 Company ID: ${locationInfo?.companyId}`);
    console.log(`📧 Email: ${locationInfo?.email}`);
    console.log(`📞 Phone: ${locationInfo?.phone}`);
    console.log(`🌐 Timezone: ${locationInfo?.timezone}`);
    console.log(`🏠 Address: ${locationInfo?.address}, ${locationInfo?.city}, ${locationInfo?.state} ${locationInfo?.postalCode}`);
  } catch (err: any) {
    console.log(`⚠️ Could not fetch location info directly: ${err.response?.status || err.message}`);
  }

  // 1. Folder & Custom Fields
  console.log('\n--- 1. CUSTOM FIELDS & FOLDER ---');
  let folderId = '';
  try {
    const cfRes = await axios.get(`${API_BASE}/locations/${locationId}/customFields?model=contact`, { headers });
    const existing = cfRes.data?.customFields || [];
    
    const existingFolder = existing.find((f: any) => f.documentType === 'folder' && f.name.toLowerCase() === FOLDER_NAME.toLowerCase());
    if (existingFolder) {
      folderId = existingFolder.id;
      console.log(`✔️ Folder already exists: "${FOLDER_NAME}" (ID: ${folderId})`);
    } else {
      try {
        const folderCreate = await axios.post(
          `${API_BASE}/locations/${locationId}/customFields`,
          { name: FOLDER_NAME, model: 'contact', documentType: 'folder' },
          { headers }
        );
        folderId = folderCreate.data?.customFieldFolder?.id || folderCreate.data?.customField?.id;
        console.log(`✨ Created Folder: "${FOLDER_NAME}" (ID: ${folderId})`);
      } catch (err: any) {
        if (err.response?.data?.meta?.existingId) {
          folderId = err.response.data.meta.existingId;
          console.log(`✔️ Folder exists (meta): "${FOLDER_NAME}" (ID: ${folderId})`);
        } else {
          console.error(`⚠️ Could not create folder:`, err.response?.data || err.message);
        }
      }
    }

    const createdFields = [];
    for (const field of REQUIRED_CUSTOM_FIELDS) {
      const match = existing.find((f: any) => f.name.toLowerCase() === field.name.toLowerCase() && f.documentType !== 'folder');
      if (match) {
        console.log(`✔️ Field already exists: "${field.name}" (ID: ${match.id}, Key: ${match.fieldKey})`);
        if (folderId && match.parentId !== folderId) {
          try {
            await axios.put(`${API_BASE}/locations/${locationId}/customFields/${match.id}`, { parentId: folderId }, { headers });
            console.log(`  📂 Moved into folder "${FOLDER_NAME}"`);
          } catch (e: any) {
            console.log(`  ⚠️ Could not move into folder: ${e.message}`);
          }
        }
        createdFields.push(match);
      } else {
        try {
          const payload = folderId ? { ...field, parentId: folderId } : field;
          const createRes = await axios.post(`${API_BASE}/locations/${locationId}/customFields`, payload, { headers });
          const newField = createRes.data?.customField;
          console.log(`✨ Created Field: "${field.name}" (ID: ${newField?.id}, Key: ${newField?.fieldKey})`);
          if (folderId && newField?.id && !newField?.parentId) {
            await axios.put(`${API_BASE}/locations/${locationId}/customFields/${newField.id}`, { parentId: folderId }, { headers });
          }
          createdFields.push(newField);
        } catch (err: any) {
          console.error(`❌ Failed to create field "${field.name}":`, err.response?.data || err.message);
        }
      }
    }
  } catch (err: any) {
    console.error('Custom fields error:', err.response?.data || err.message);
  }

  // 2. Tags
  console.log('\n--- 2. TAGS ---');
  try {
    const existingTagsRes = await axios.get(`${API_BASE}/locations/${locationId}/tags`, { headers });
    const existingTags = existingTagsRes.data?.tags || [];
    const tagMap = new Map<string, any>(existingTags.map((t: any) => [t.name.toLowerCase(), t]));

    const resultTags = [];
    for (const tag of REQUIRED_TAGS) {
      if (tagMap.has(tag.toLowerCase())) {
        const t: any = tagMap.get(tag.toLowerCase());
        console.log(`✔️ Tag already exists: "${tag}" (ID: ${t.id})`);
        resultTags.push(t);
      } else {
        try {
          const createRes = await axios.post(`${API_BASE}/locations/${locationId}/tags`, { name: tag }, { headers });
          const t = createRes.data?.tag;
          console.log(`✨ Created Tag: "${tag}" (ID: ${t?.id})`);
          resultTags.push(t);
        } catch (err: any) {
          console.error(`❌ Failed to create tag "${tag}":`, err.response?.data || err.message);
        }
      }
    }
  } catch (err: any) {
    console.error('Tags error:', err.response?.data || err.message);
  }

  // 3. Pipelines & Stages
  console.log('\n--- 3. PIPELINES ---');
  let pipelines: any[] = [];
  try {
    const pRes = await axios.get(`${API_BASE}/opportunities/pipelines?locationId=${locationId}`, { headers });
    pipelines = pRes.data?.pipelines || [];
    console.log(`Found ${pipelines.length} existing pipeline(s):`);
    pipelines.forEach((p: any) => {
      console.log(`- Pipeline: "${p.name}" (ID: ${p.id}) with ${p.stages?.length || 0} stages`);
    });

    const yelpPipeline = pipelines.find((p: any) => p.name.toLowerCase().includes('yelp'));
    if (yelpPipeline) {
      console.log(`\n✔️ Found existing Yelp Pipeline: "${yelpPipeline.name}" (ID: ${yelpPipeline.id})`);
      console.log('Stages:');
      yelpPipeline.stages?.forEach((s: any) => {
        console.log(`  - [${s.name}] ID: ${s.id}`);
      });
    } else {
      console.log('\nCreating dedicated Yelp Pipeline...');
      const targetStages = [
        { name: 'New Leads' },
        { name: 'No Answer' },
        { name: 'Quoted' },
        { name: 'Follow Up (Manual)' },
        { name: 'Follow Up (Automated)' },
        { name: 'Interested but not booked' },
        { name: 'Not Qualified' },
        { name: 'Closed Won' },
      ];
      try {
        const newPipeRes = await axios.post(
          `${API_BASE}/opportunities/pipelines`,
          {
            locationId,
            name: 'Pipeline - Yelp Leads',
            stages: targetStages,
          },
          { headers }
        );
        const createdPipe = newPipeRes.data?.pipeline;
        console.log(`✨ Successfully Created Pipeline: "${createdPipe?.name}" (ID: ${createdPipe?.id})`);
        createdPipe?.stages?.forEach((s: any) => {
          console.log(`  - [${s.name}] ID: ${s.id}`);
        });
      } catch (pipeErr: any) {
        console.log(`⚠️ Pipeline creation via API note: ${pipeErr.response?.data?.message || pipeErr.message}`);
      }
    }
  } catch (err: any) {
    console.error('Pipelines error:', err.response?.data || err.message);
  }

  // 4. Print final report
  console.log('\n--- 4. FETCHING FINAL STATUS & DATA FOR RUNBOOK ---');
  const finalCfs = await axios.get(`${API_BASE}/locations/${locationId}/customFields?model=contact`, { headers });
  const finalFields = finalCfs.data?.customFields?.filter((f: any) => f.name.toLowerCase().includes('yelp'));
  console.log('\nFinal Yelp Fields:');
  console.log(JSON.stringify(finalFields.map((f: any) => ({
    name: f.name,
    fieldKey: f.fieldKey,
    id: f.id,
    dataType: f.dataType,
    parentId: f.parentId
  })), null, 2));

  const finalTagsRes = await axios.get(`${API_BASE}/locations/${locationId}/tags`, { headers });
  const finalTags = (finalTagsRes.data?.tags || []).filter((t: any) => 
    REQUIRED_TAGS.map(r => r.toLowerCase()).includes(t.name.toLowerCase())
  );
  console.log('\nFinal Tags:');
  console.log(JSON.stringify(finalTags.map((t: any) => ({
    name: t.name,
    id: t.id
  })), null, 2));

  // Re-fetch pipelines to get final stage IDs
  try {
    const finalPRes = await axios.get(`${API_BASE}/opportunities/pipelines?locationId=${locationId}`, { headers });
    console.log('\nFinal Pipelines & Stages:');
    console.log(JSON.stringify(finalPRes.data?.pipelines, null, 2));
  } catch (e: any) {}
}

provision();
