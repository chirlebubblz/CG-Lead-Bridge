import axios from 'axios';

async function getWorkflowDetails() {
  const token = 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb';
  const locationId = 'WOwi6fpdaZavuqHU8Rux';
  const workflowId = '3e4fa703-e179-4cea-9357-8bdd6905f178';
  const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28' };

  try {
    const res = await axios.get(`https://services.leadconnectorhq.com/workflows/${workflowId}`, { headers });
    console.log('Workflow by ID:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.log(`GET /workflows/{id} status: ${err.response?.status}`);
    // If not found, let's check GET /workflows/?locationId=... to see all properties of that workflow
    try {
      const listRes = await axios.get(`https://services.leadconnectorhq.com/workflows/?locationId=${locationId}`, { headers });
      const wf = listRes.data?.workflows?.find((w: any) => w.id === workflowId);
      console.log('From List:', JSON.stringify(wf, null, 2));
    } catch (e: any) {}
  }
}

getWorkflowDetails();
