import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  parseYelpProjectSummary,
  buildYelpCustomFields,
  normalizeRoomCount,
  isYelpSystemEmail,
} from '../src/services/yelp-parser';
import { GHLService } from '../src/services/ghl';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Yelp Project Summary Parser', () => {
  it('parses standard Yelp quote request email (bedrooms, bathrooms, frequency, service, notes)', () => {
    const raw = `Chirle requested a quote from Capable Clean for a deep cleaning. Reply to stay eligible for leads and keep your response rate up!

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

test jordan

In what location do you need the service?

60604

Chirle

[Reply for free on Yelp Biz](https://biz.yelp.com/login/passwordless/redirect/MLAb404?return_url=%2Fleads_center%2Fabc%2Fleads%2Foxd3WHE5WiblrhWUXKIrNg)`;

    const parsed = parseYelpProjectSummary({
      message: raw,
      subject: "Capable Clean's response to Chirle",
    });

    expect(parsed.isProjectSummary).toBe(true);
    expect(parsed.serviceType).toBe('deep cleaning');
    expect(parsed.bedrooms).toBe('2');
    expect(parsed.bathrooms).toBe('3');
    expect(parsed.cleaningFrequency).toBe('Every week');
    expect(parsed.notes).toContain('test jordan');
    expect(parsed.notes).toContain('Carpet cleaning, Oven cleaning');
    expect(parsed.zip).toBe('60604');
  });

  it('parses real Yelp email with Markdown table pipes, What kind of cleaning service, and multi-line extras', () => {
    const raw = `|  |  |   
  
---  
---  
  
Yelp for business   
  
---  
  
| 

Thank you for replying to this message.

---  
  
The Yelper’s original message was:   
  
---  
  
Hi there, please respond with a price estimate. Here are my answers to Yelp's questions regarding my project:  
  
What kind of cleaning service are you looking for?  
Deep cleaning  
  
How often do you want your home cleaned?  
Just once  
  
Do you need any of these other services?  
Tile and grout cleaning  
Pet odor treatment  
Clean dishwasher, light in bathroom, clean couch and dust house  
  
Do you require any of these cleaning product types?  
Pet-safe  
  
How many bedrooms are in your home?  
1 bedroom  
  
How many bathrooms are in your home?  
1 bathroom  
  
When do you require this service?  
I'm flexible  
  
In what location do you need the service?  
60613   `;

    const parsed = parseYelpProjectSummary({
      message: raw,
      subject: 'RE: Message from Paola G. for Mums Cleaning Services',
    });

    expect(parsed.isProjectSummary).toBe(true);
    expect(parsed.serviceType).toBe('Deep cleaning');
    expect(parsed.bedrooms).toBe('1');
    expect(parsed.bathrooms).toBe('1');
    expect(parsed.cleaningFrequency).toBe('Just once');
    expect(parsed.notes).toContain('Clean dishwasher, light in bathroom, clean couch and dust house');
    expect(parsed.notes).toContain('Products: Pet-safe');
    expect(parsed.zip).toBe('60613');
  });

  it('parses "Any details you\'d like to add?" and "What kind of work would you like to get done?"', () => {
    const raw = `What kind of work would you like to get done?  \r\nMove-in or move-out cleaning  \r\n  \r\nHow many bedrooms are in your home?  \r\n4 or more bedrooms  \r\n  \r\nHow many bathrooms are in your home?  \r\n2.5 bathrooms  \r\n  \r\nAny details you'd like to add?  \r\nI'm looking for someone to come in and clean two separate units.`;

    const parsed = parseYelpProjectSummary({ message: raw });

    expect(parsed.isProjectSummary).toBe(true);
    expect(parsed.serviceType).toBe('Move-in or move-out cleaning');
    expect(parsed.bedrooms).toBe('4+');
    expect(parsed.bathrooms).toBe('2.5');
    expect(parsed.notes).toBe("I'm looking for someone to come in and clean two separate units.");
  });

  it('parses Question:/Answer: survey_answers_formatted payloads', () => {
    const raw = `Question: What is your location postcode?
Answer: 60615

Question: What kind of service are you looking for?
Answer: Maid services

Question: Any additional information?
Answer: we would like the wood floor, office and a bedroom cleaned.

Question: How often do you want your home cleaned?
Answer: Just once

Question: How many bedrooms are in your home?
Answer: Studio

Question: How many bathrooms are in your home?
Answer: 1 bathroom`;

    const parsed = parseYelpProjectSummary({ projectSummary: raw });

    expect(parsed.isProjectSummary).toBe(true);
    expect(parsed.serviceType).toBe('Maid services');
    expect(parsed.bedrooms).toBe('Studio');
    expect(parsed.bathrooms).toBe('1');
    expect(parsed.cleaningFrequency).toBe('Just once');
    expect(parsed.notes).toBe('we would like the wood floor, office and a bedroom cleaned.');
    expect(parsed.zip).toBe('60615');
  });

  it('parses labeled key-value and pipe-delimited project summaries', () => {
    const kvParsed = parseYelpProjectSummary({
      projectSummary: `Service Type: Move-Out Clean
Bedrooms: 3 bedrooms
Bathrooms: 2.5 bathrooms
Cleaning Frequency: Bi-weekly
Notes: Inside fridge and oven needed`,
    });

    expect(kvParsed.isProjectSummary).toBe(true);
    expect(kvParsed.serviceType).toBe('Move-Out Clean');
    expect(kvParsed.bedrooms).toBe('3');
    expect(kvParsed.bathrooms).toBe('2.5');
    expect(kvParsed.cleaningFrequency).toBe('Bi-weekly');
    expect(kvParsed.notes).toBe('Inside fridge and oven needed');

    const pipeParsed = parseYelpProjectSummary({
      projectSummary: 'Project Summary: Deep Cleaning | 3 bedrooms, 2.5 bathrooms | Bi-weekly | Notes: Two friendly dogs',
    });

    expect(pipeParsed.isProjectSummary).toBe(true);
    expect(pipeParsed.serviceType).toBe('Deep Cleaning');
    expect(pipeParsed.bedrooms).toBe('3');
    expect(pipeParsed.bathrooms).toBe('2.5');
    expect(pipeParsed.cleaningFrequency).toBe('Bi-weekly');
    expect(pipeParsed.notes).toBe('Two friendly dogs');
  });

  it('does not misclassify ongoing conversational replies as project summaries', () => {
    const parsed = parseYelpProjectSummary({
      message: 'Thanks! Friday at 10am works great for our 2 bedrooms.',
      subject: 'New message from Jane on Yelp for Poppy Pro Cleaning',
    });

    expect(parsed.isProjectSummary).toBe(false);
    expect(buildYelpCustomFields(parsed, 'yelp_123')).toEqual([]);
  });

  it('builds the 5 standardized GHL custom fields plus real yelp_lead_id', () => {
    const parsed = parseYelpProjectSummary({
      projectSummary: `Service Type: Deep Clean
Bedrooms: 2
Bathrooms: 2.5
Cleaning Frequency: Every 2 weeks
Notes: Focus on kitchen and master bath`,
    });

    const fields = buildYelpCustomFields(parsed, 'lead_abc123');
    expect(fields).toEqual([
      { key: 'yelp_service_type', value: 'Deep Clean' },
      { key: 'yelp_bedrooms', value: '2' },
      { key: 'yelp_bathrooms', value: '2.5' },
      { key: 'yelp_cleaning_frequency', value: 'Every 2 weeks' },
      { key: 'yelp_notes__customer_request', value: 'Focus on kitchen and master bath' },
      { key: 'yelp_lead_id', value: 'lead_abc123' },
    ]);

    // Synthetic yelp_ fallback IDs should not overwrite real yelp_lead_id
    const fieldsSynthetic = buildYelpCustomFields(parsed, 'yelp_1700000000000');
    expect(fieldsSynthetic.find((f) => f.key === 'yelp_lead_id')).toBeUndefined();
  });

  it('normalizes room count edge cases safely', () => {
    expect(normalizeRoomCount('2.5 bathrooms')).toBe('2.5');
    expect(normalizeRoomCount('4 or more bedrooms')).toBe('4+');
    expect(normalizeRoomCount('Answer: Studio')).toBe('Studio');
    expect(normalizeRoomCount('1 full, 1 half')).toBe('1 full, 1 half');
  });
});

describe('GHLService Multi-Tenant Poppy Pro Cleaning & Custom Field Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates custom fields on an existing contact using Poppy Pro Cleaning PIT', async () => {
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('/contacts/search/duplicate')) {
        return { data: { contact: { id: 'poppy_contact_123' } } };
      }
      return { data: { contacts: [] } };
    });
    mockedAxios.put.mockResolvedValue({ data: { contact: { id: 'poppy_contact_123' } } });

    const customFields = [
      { key: 'yelp_service_type', value: 'Deep cleaning' },
      { key: 'yelp_bedrooms', value: '3' },
      { key: 'yelp_bathrooms', value: '2.5' },
      { key: 'yelp_cleaning_frequency', value: 'Bi-weekly' },
      { key: 'yelp_notes__customer_request', value: 'Pet-safe products requested' },
    ];

    const contactId = await GHLService.findOrCreateContact({
      name: 'Taylor Swift',
      email: 'leadsapi+poppy_lead_1@messaging.yelp.com',
      leadId: 'poppy_lead_1',
      locationId: 'n1jnBtlfzNKJC4BdrN2y',
      customFields,
    });

    expect(contactId).toBe('poppy_contact_123');
    expect(mockedAxios.put).toHaveBeenCalledWith(
      'https://services.leadconnectorhq.com/contacts/poppy_contact_123',
      { customFields },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer pit-us-aa5b40ae-0b19-403c-b694-c5a695e0f1f7',
        }),
      })
    );
  });
});

describe('Yelp System & Marketing Email Filter (isYelpSystemEmail)', () => {
  it('ignores Yelp system, Nearby Jobs, Customer Success, meeting reminder, and survey emails', () => {
    const cases: Array<[string, string]> = [
      ['New Nearby Jobs in your area', 'Check out nearby leads'],
      ['Welcome to Nearby Jobs on Yelp!', 'Get started today'],
      ['Welcome to Yelp Advertising', 'Your campaign is live'],
      ['Message from Yelp Customer Success', 'Checking in on your account'],
      ['Your upcoming meeting with Yelp', 'See calendar invite details'],
      ['Reminder: Your Yelp meeting is tomorrow', 'Join via Zoom'],
      ['Just a reminder that our meeting is starting soon', 'Click here to join'],
      ["Just a reminder that we'll be ringing you in 15 minutes", 'Talk soon'],
      ['Just a reminder that we’ll be ringing you shortly', 'Talk soon'],
      ['How was your recent experience with Yelp Support?', 'Take a quick survey'],
      ['RE: Update', 'Nearby Jobs in your area: 4 new cleaning requests'],
      ['Confirm your email address', 'Click to confirm'],
      ['Fwd: Receipt', "You're closer to hiring a pro! Keep an eye out for messages in your projects tab."],
    ];

    for (const [subject, body] of cases) {
      expect(isYelpSystemEmail(subject, body), `Expected ignored for subject="${subject}"`).toBe(true);
    }
  });

  it('does not ignore real customer quote requests or replies', () => {
    expect(
      isYelpSystemEmail(
        "Capable Clean's response to Chirle",
        'Chirle requested a quote from Capable Clean for a deep cleaning. 2 bedrooms, 2 bathrooms.'
      )
    ).toBe(false);

    expect(
      isYelpSystemEmail(
        'Message from Sarah Connor for Poppy Pro Cleaning',
        'Hi, are you available this Friday morning for a move-out clean?'
      )
    ).toBe(false);
  });
});
