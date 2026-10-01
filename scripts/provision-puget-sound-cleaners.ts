import axios from 'axios';

// ─── Puget Sound Cleaners — GHL Sub-Account ───────────────────────────────────
const locationId = 'MucxtGIfmvLViGQWD0CG';
const token = 'pit-3e2b6d46-5ff3-472c-bd48-16ee70d76fbc';
const API_BASE = 'https://services.leadconnectorhq.com';

const FOLDER_NAME = 'Yelp Lead Details';

const REQUIRED_CUSTOM_FIELDS = [
  { name: 'Yelp Service Type',             dataType: 'TEXT',       model: 'contact', description: 'Deep Clean, Standard Clean, Move-Out, etc.' },
  { name: 'Yelp Bedrooms',                 dataType: 'TEXT',       model: 'contact', description: 'Number of bedrooms specified in survey' },
  { name: 'Yelp Bathrooms',               dataType: 'TEXT',       model: 'contact', description: 'Number of bathrooms specified in survey' },
  { name: 'Yelp Cleaning Frequency',       dataType: 'TEXT',       model: 'contact', description: 'Cleaning frequency requested (one-time, weekly, bi-weekly)' },
  { name: 'Yelp Notes / Customer Request', dataType: 'LARGE_TEXT', model: 'contact', description: 'Full questionnaire summary and customer notes' },
  { name: 'Yelp Lead ID',                  dataType: 'TEXT',       model: 'contact', description: "Yelp's unique lead/conversation identifier" },
  { name: 'Yelp Phone Captured',           dataType: 'TEXT',       model: 'contact', description: 'Direct customer phone if provided' },
];

const REQUIRED_TAGS = [
  'source: yelp',
  'yelp-lead',
  'yelp-phone-captured',
  'yelp-no-phone',
  'yelp-quote-sent',
  'yelp-booked',
];

const PIPELINE_NAME = 'Yelp Leads Pipeline';
const PIPELINE_STAGES = [
  { name: 'New Leads',                   position: 0 },
  { name: 'No Answer',                   position: 1 },
  { name: 'Quoted',                      position: 2 },
  { name: 'Follow Up (Manual)',          position: 3 },
  { name: 'Follow Up (Automated)',       position: 4 },
  { name: 'Interested but not booked',   position: 5 },
  { name: 'Not Qualified',               position: 6 },
  { name: 'Closed Won',                  position: 7 },
];

const headers = {
  Authorization: `Bearer ${token}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
};

async function provision() {
  console.log(`\n🚀 Provisioning Puget Sound Cleaners (${locationId})...\n`);

  // ── 1. CUSTOM FIELDS & FOLDER ─────────────────────────────────────────────
  console.log('--- 1. CUSTOM FIELDS & FOLDER ---');
  let folderId = '';
  try {
    const cfRes = await axios.get(`${API_BASE}/locations/${locationId}/customFields?model=contact`, { headers });
    const existing = cfRes.data?.customFields || [];

    const existingFolder = existing.find(
      (f: any) => f.documentType === 'folder' && f.name.toLowerCase() === FOLDER_NAME.toLowerCase()
    );

    if (existingFolder) {
      folderId = existingFolder.id;
      console.log(`✔️  Folder already exists: "${FOLDER_NAME}" (ID: ${folderId})`);
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
          console.log(`✔️  Folder exists (meta): "${FOLDER_NAME}" (ID: ${folderId})`);
        } else {
          console.error('⚠️  Could not create folder:', err.response?.data || err.message);
        }
      }
    }

    for (const field of REQUIRED_CUSTOM_FIELDS) {
      const match = existing.find(
        (f: any) => f.name.toLowerCase() === field.name.toLowerCase() && f.documentType !== 'folder'
      );

      if (match) {
        console.log(`✔️  Field already exists: "${field.name}" (ID: ${match.id}, Key: ${match.fieldKey})`);
        if (folderId && match.parentId !== folderId) {
          try {
            await axios.put(`${API_BASE}/locations/${locationId}/customFields/${match.id}`, { parentId: folderId }, { headers });
            console.log(`  📂 Moved into folder "${FOLDER_NAME}"`);
          } catch (e: any) {
            console.log(`  ⚠️  Could not move into folder: ${e.message}`);
          }
        }
      } else {
        try {
          const payload = folderId ? { ...field, parentId: folderId } : field;
          const createRes = await axios.post(`${API_BASE}/locations/${locationId}/customFields`, payload, { headers });
          const newField = createRes.data?.customField;
          console.log(`✨ Created Field: "${field.name}" (ID: ${newField?.id}, Key: ${newField?.fieldKey})`);
          if (folderId && newField?.id && !newField?.parentId) {
            await axios.put(`${API_BASE}/locations/${locationId}/customFields/${newField.id}`, { parentId: folderId }, { headers });
          }
        } catch (err: any) {
          console.error(`❌ Failed to create field "${field.name}":`, err.response?.data || err.message);
        }
      }
    }
  } catch (err: any) {
    console.error('Custom fields error:', err.response?.data || err.message);
  }

  // ── 2. TAGS ───────────────────────────────────────────────────────────────
  console.log('\n--- 2. TAGS ---');
  try {
    const existingTagsRes = await axios.get(`${API_BASE}/locations/${locationId}/tags`, { headers });
    const existingTags = existingTagsRes.data?.tags || [];
    const tagMap = new Map<string, any>(existingTags.map((t: any) => [t.name.toLowerCase(), t]));

    for (const tag of REQUIRED_TAGS) {
      if (tagMap.has(tag.toLowerCase())) {
        const t: any = tagMap.get(tag.toLowerCase());
        console.log(`✔️  Tag already exists: "${tag}" (ID: ${t.id})`);
      } else {
        try {
          const createRes = await axios.post(`${API_BASE}/locations/${locationId}/tags`, { name: tag }, { headers });
          const t = createRes.data?.tag;
          console.log(`✨ Created Tag: "${tag}" (ID: ${t?.id})`);
        } catch (err: any) {
          console.error(`❌ Failed to create tag "${tag}":`, err.response?.data || err.message);
        }
      }
    }
  } catch (err: any) {
    console.error('Tags error:', err.response?.data || err.message);
  }

  // ── 3. PIPELINE ───────────────────────────────────────────────────────────
  console.log('\n--- 3. PIPELINE ---');
  try {
    const pipelinesRes = await axios.get(`${API_BASE}/opportunities/pipelines?locationId=${locationId}`, { headers });
    const pipelines: any[] = pipelinesRes.data?.pipelines || [];
    const existing = pipelines.find((p: any) => p.name.toLowerCase().includes('yelp'));

    if (existing) {
      console.log(`✔️  Yelp pipeline already exists: "${existing.name}" (ID: ${existing.id})`);
    } else {
      const pipelineCount = pipelines.length + 1;
      const res = await axios.post(
        `${API_BASE}/opportunities/pipelines`,
        {
          locationId,
          name: `Pipeline ${pipelineCount} - ${PIPELINE_NAME}`,
          stages: PIPELINE_STAGES,
        },
        { headers }
      );
      const created = res.data?.pipeline;
      console.log(`✨ Created Pipeline: "${created?.name}" (ID: ${created?.id})`);
      console.log(`   Stage IDs:`);
      (created?.stages || []).forEach((s: any) => console.log(`   • ${s.name}: ${s.id}`));
    }
  } catch (err: any) {
    console.error('Pipeline error:', err.response?.data || err.message);
  }

  // ── 4. FINAL REPORT ───────────────────────────────────────────────────────
  console.log('\n--- 4. FINAL REPORT ---');
  const finalCfs = await axios.get(`${API_BASE}/locations/${locationId}/customFields?model=contact`, { headers });
  const finalFields = (finalCfs.data?.customFields || []).filter((f: any) =>
    f.name.toLowerCase().includes('yelp') && f.documentType !== 'folder'
  );
  console.log('\nFinal Yelp Custom Fields:');
  console.log(JSON.stringify(finalFields.map((f: any) => ({
    name: f.name,
    fieldKey: f.fieldKey,
    id: f.id,
    dataType: f.dataType,
    parentId: f.parentId,
  })), null, 2));

  const finalTagsRes = await axios.get(`${API_BASE}/locations/${locationId}/tags`, { headers });
  const finalTags = (finalTagsRes.data?.tags || []).filter((t: any) =>
    REQUIRED_TAGS.map(r => r.toLowerCase()).includes(t.name.toLowerCase())
  );
  console.log('\nFinal Yelp Tags:');
  console.log(JSON.stringify(finalTags.map((t: any) => ({ name: t.name, id: t.id })), null, 2));

  const pipelinesRes = await axios.get(`${API_BASE}/opportunities/pipelines?locationId=${locationId}`, { headers });
  const yelpPipeline = (pipelinesRes.data?.pipelines || []).find((p: any) => p.name.toLowerCase().includes('yelp'));
  console.log('\nFinal Yelp Pipeline:');
  console.log(JSON.stringify({ name: yelpPipeline?.name, id: yelpPipeline?.id, stages: yelpPipeline?.stages?.map((s: any) => ({ name: s.name, id: s.id })) }, null, 2));

  console.log('\n✅ Provisioning Complete for Puget Sound Cleaners!\n');
}

provision();
