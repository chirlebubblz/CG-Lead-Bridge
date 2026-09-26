import axios from 'axios';

async function findYelpWorkflows() {
  const token = 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb';
  const locationId = 'WOwi6fpdaZavuqHU8Rux';
  const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28' };
  try {
    const res = await axios.get(`https://services.leadconnectorhq.com/workflows/?locationId=${locationId}`, { headers });
    const all = res.data?.workflows || [];
    console.log(`Total workflows: ${all.length}`);
    const yelpWorkflows = all.filter((w: any) => w.name.toLowerCase().includes('yelp'));
    console.log(`Yelp workflows count: ${yelpWorkflows.length}`);
    if (yelpWorkflows.length > 0) {
      console.log(JSON.stringify(yelpWorkflows, null, 2));
    }
  } catch (err: any) {
    console.error(err.message);
  }
}

findYelpWorkflows();
