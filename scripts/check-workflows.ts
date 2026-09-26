import axios from 'axios';

async function checkWorkflows() {
  const token = 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb';
  const locationId = 'WOwi6fpdaZavuqHU8Rux';
  const headers = {
    Authorization: `Bearer ${token}`,
    Version: '2021-07-28',
  };

  console.log(`Checking workflows for location: ${locationId}...`);
  try {
    const res = await axios.get(`https://services.leadconnectorhq.com/workflows/?locationId=${locationId}`, { headers });
    console.log(`Found ${res.data?.workflows?.length || 0} workflow(s).`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error(`Workflow API response status: ${err.response?.status}`);
    console.error(JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

checkWorkflows();
