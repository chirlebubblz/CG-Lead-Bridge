import axios from 'axios';

async function listLeadWorkflows() {
  const token = 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb';
  const locationId = 'WOwi6fpdaZavuqHU8Rux';
  const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28' };
  try {
    const res = await axios.get(`https://services.leadconnectorhq.com/workflows/?locationId=${locationId}`, { headers });
    const all = res.data?.workflows || [];
    const leadWorkflows = all.filter((w: any) => /lead|intake|inbound|quote/i.test(w.name));
    console.log(`Matching workflows: ${leadWorkflows.length}`);
    leadWorkflows.forEach((w: any) => {
      console.log(`- [${w.status.toUpperCase()}] "${w.name}" (ID: ${w.id})`);
    });
  } catch (err: any) {
    console.error(err.message);
  }
}

listLeadWorkflows();
