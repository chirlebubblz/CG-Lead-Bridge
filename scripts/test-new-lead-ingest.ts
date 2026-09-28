import axios from 'axios';

async function test() {
  const leadHex = `lead_${Date.now()}`;
  const payload = {
    location_id: 's94e80clit6bCL9VBWgl',
    name: 'Yelp Inbox',
    subject: "Capable Clean's response to Chirle Test",
    message: `Chirle Test requested a quote from Capable Clean for a deep cleaning. Reply to stay eligible for leads and keep your response rate up!

## You have a new deep cleaning request.

How often do you want your home cleaned?
Every week

Do you need any of these other services?
Carpet cleaning
Oven cleaning

How many bedrooms are in your home?
2 bedrooms

How many bathrooms are in your home?
3 bathrooms

When do you require this service?
As soon as possible

Are there any other details you'd like to share?
need Tuesday after 2pm

In what location do you need the service?
92805

[Reply for free on Yelp Biz](https://biz.yelp.com/login/passwordless/redirect/MLAb404f6a5ff6648c3a3e150dc4bcbf964?return_url=%2Fleads_center%2FfQgc8hNYLvE_ba4YYI_QTA%2Fleads%2F${leadHex}&ytl_=12e9db3043c2534dc634f3136d82eeb4)
`,
  };

  console.log('Sending test quote to Render server...');
  const res = await axios.post('https://cg-lead-bridge.onrender.com/webhook/yelp', payload);
  console.log('Render Webhook Response:', res.status, res.data);

  // Wait 4 seconds for GHL processing
  console.log('Waiting 4s for GHL contact & opportunity creation...');
  await new Promise(r => setTimeout(r, 4000));

  // Verify in GHL
  const token = 'pit-5cd3741b-9fde-4039-91da-c869573e74ce';
  const locId = 's94e80clit6bCL9VBWgl';
  const ghlRes = await axios.get(`https://services.leadconnectorhq.com/contacts/?locationId=${locId}&query=${leadHex}`, {
    headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28' },
  });

  const contact = ghlRes.data.contacts?.[0];
  if (contact) {
    console.log('\n🎉 SUCCESS! Dedicated New Lead Created:');
    console.log(`- Contact ID: ${contact.id}`);
    console.log(`- Name: ${contact.contactName}`);
    console.log(`- Email: ${contact.email}`);
    console.log(`- Tags: ${JSON.stringify(contact.tags)}`);
    console.log(`- Custom Fields: ${JSON.stringify(contact.customFields)}`);

    // Check conversation messages
    const convRes = await axios.get(`https://services.leadconnectorhq.com/conversations/search?locationId=${locId}&contactId=${contact.id}`, {
      headers: { Authorization: `Bearer ${token}`, Version: '2021-04-15' },
    });
    const convId = convRes.data.conversations?.[0]?.id;
    if (convId) {
      const msgRes = await axios.get(`https://services.leadconnectorhq.com/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${token}`, Version: '2021-04-15' },
      });
      console.log('\n📩 Injected Chat Message:');
      console.log(msgRes.data.messages?.messages?.[0]?.body || 'No message found');
    }
  } else {
    console.log('Searching by name Chirle Test...');
    const searchByName = await axios.get(`https://services.leadconnectorhq.com/contacts/?locationId=${locId}&query=Chirle Test`, {
      headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28' },
    });
    console.log('Found contacts:', searchByName.data.contacts?.map((c: any) => ({ id: c.id, name: c.contactName, email: c.email })));
  }
}

test();
