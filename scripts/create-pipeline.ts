import axios from 'axios';

async function createYelpPipeline() {
  const locationId = 'WOwi6fpdaZavuqHU8Rux';
  const token = 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb';
  const headers = {
    Authorization: `Bearer ${token}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  };

  try {
    const res = await axios.post(
      'https://services.leadconnectorhq.com/opportunities/pipelines',
      {
        locationId,
        name: 'Pipeline 6 - Yelp Leads',
        stages: [
          { name: 'New Leads', position: 0 },
          { name: 'No Answer', position: 1 },
          { name: 'Quoted', position: 2 },
          { name: 'Follow Up (Manual)', position: 3 },
          { name: 'Follow Up (Automated)', position: 4 },
          { name: 'Interested but not booked', position: 5 },
          { name: 'Not Qualified', position: 6 },
          { name: 'Closed Won', position: 7 },
        ],
      },
      { headers }
    );
    console.log('SUCCESS: Pipeline Created!');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('ERROR creating pipeline:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

createYelpPipeline();
