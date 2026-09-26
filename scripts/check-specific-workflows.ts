import axios from 'axios';

async function checkWorkflowDetails() {
  const token = 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb';
  const locationId = 'WOwi6fpdaZavuqHU8Rux';
  const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28' };
  
  try {
    const res = await axios.get(`https://services.leadconnectorhq.com/workflows/?locationId=${locationId}`, { headers });
    const all = res.data?.workflows || [];
    const target = all.filter((w: any) => 
      w.name.includes('Replied') || 
      w.name.includes('NO Response') || 
      w.name.includes('Quoted Leads')
    );
    console.log(JSON.stringify(target.map((w: any) => ({ id: w.id, name: w.name, status: w.status, updatedAt: w.updatedAt })), null, 2));
  } catch (err: any) {
    console.error(err.message);
  }
}

checkWorkflowDetails();
