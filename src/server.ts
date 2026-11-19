import express, { Request, Response } from 'express';
import { config } from './config';
import { YelpService } from './services/yelp';
import { GHLService } from './services/ghl';
import { ThumbtackService } from './services/thumbtack';
import { CronService } from './services/cron';
import { TokenStore } from './services/token-store';
import { SlackWebhookService } from './services/slack';
import { buildYelpCustomFields, parseYelpProjectSummary } from './services/yelp-parser';

const app = express();
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use('/webhook/slack', express.urlencoded({
  extended: true,
  verify: (req: any, _res, buf) => {
    if (!req.rawBody) {
      req.rawBody = buf;
    }
  },
}));

// Root & Health Status
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Clean Genie ↔ Yelp & Thumbtack Bridge',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

const recentLogs: Array<{ time: string; msg: string; data?: any }> = [];
function addLog(msg: string, data?: any) {
  const entry = { time: new Date().toISOString(), msg, data };
  recentLogs.unshift(entry);
  if (recentLogs.length > 50) recentLogs.pop();
  console.log(`[${entry.time}] ${msg}`, data ? JSON.stringify(data) : '');
}

app.get('/logs', (req: Request, res: Response) => {
  res.json({ logs: recentLogs });
});

app.get('/health', (req: Request, res: Response) => {
  const tokens = TokenStore.getTokens();
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    webhookActive: !!tokens?.webhookId,
    webhookExpiresAt: tokens?.webhookExpiresAt ? new Date(tokens.webhookExpiresAt).toISOString() : null,
  });
});

/**
 * 0. Test Endpoint: Simulate Inbound Lead into GHL Conversations
 * Can be triggered directly via browser or curl to verify GHL setup
 */
app.all('/test/inbound', async (req: Request, res: Response) => {
  try {
    const id = Date.now();
    const locationId = (req.query.location_id as string) || (req.query.locationId as string) || req.body?.location_id || req.body?.locationId || config.ghl.locationId;
    const name = (req.query.name as string) || req.body?.name || `Yelp Lead ${id.toString().slice(-4)}`;
    const email = (req.query.email as string) || req.body?.email || `lead.${id}@cleangenie.com`;
    const phone = (req.query.phone as string) || req.body?.phone || `+1312555${id.toString().slice(-4)}`;
    const message = (req.query.message as string) || req.body?.message || 'Hello! I need a quote for a 3-bedroom deep clean in Chicago.';
    const leadId = 'test_lead_' + id;

    const contactId = await GHLService.findOrCreateContact({
      name,
      email,
      phone,
      leadId,
      source: 'Yelp',
      locationId,
    });

    const inboundResult = await GHLService.postInboundMessage({
      contactId,
      message,
      leadId,
      eventId: 'evt_' + Date.now(),
      locationId,
    });

    res.json({
      success: true,
      message: 'Test lead dispatched to GoHighLevel!',
      locationId,
      contactId,
      ghlResponse: inboundResult,
    });
  } catch (err: any) {
    const errorDetails = err.response?.data || err.message;
    console.error('[Test Inbound Error]', errorDetails);
    res.status(500).json({
      success: false,
      error: errorDetails,
    });
  }
});

/**
 * 1. Inbound Webhook from Yelp
 * Triggered when a new lead or message is created on Yelp
 */
app.post('/webhook/yelp', async (req: Request, res: Response) => {
  res.status(200).send('OK'); // Acknowledge Yelp/Zapier immediately with 2XX

  try {
    const body = req.body;
    addLog('[Yelp Webhook] Received webhook POST', body);

    let locationId = body?.location_id || body?.locationId || body?.location || config.ghl.locationId;
    if (locationId === 'EKXbBmGEV6hnLQFQRPc') {
      locationId = 'EKXbBmGEV6hnLQFQRPc7';
    }

    // 1. Direct Zapier payload format (contains actual message, name, email, phone, or project summary)
    const rawSummary = body?.project_summary || body?.projectSummary || body?.survey_answers_formatted || body?.project?.survey_answers_formatted;
    const directMessage = body?.message || body?.text || body?.body || body?.body_plain || rawSummary;
    if (directMessage) {
      const subject = body?.subject || '';
      let name = (body?.name || body?.customer_name || '').trim();

      // Brand Guardrail: Auto-detect brand from subject/body to prevent cross-brand contamination
      const BRAND_LOCATION_MAP: Array<{ pattern: RegExp; locationId: string; name: string }> = [
        { pattern: /puget\s*sound\s*cleaners/i, locationId: 'MucxtGIfmvLViGQWD0CG', name: 'Puget Sound Cleaners' },
        { pattern: /mum'?s\s*cleaning/i, locationId: 'YVtPYdLotWLwuy5AA8Vv', name: "Mum's Cleaning Services Chicago" },
        { pattern: /jacksonville\s*cleaning/i, locationId: 'EKXbBmGEV6hnLQFQRPc7', name: 'Jacksonville Cleaning Co' },
        { pattern: /capable\s*clean/i, locationId: 's94e80clit6bCL9VBWgl', name: 'Capable Clean' },
        { pattern: /ascend\s*cleaning/i, locationId: 'IdJoWa68hD3nVj45Fv7f', name: 'Ascend Cleaning' },
        { pattern: /sparkle\s*squad/i, locationId: 'ThUMNqsKmDfYKMF0jsBb', name: 'The Sparkle Squad Co' },
        { pattern: /sunny\s*side\s*clean/i, locationId: 'WOwi6fpdaZavuqHU8Rux', name: 'Sunny Side Clean Team' },
        { pattern: /(?:ya'?ll|y'?all)\s*maid/i, locationId: '19jBWYeRsrzDq6Oe1nth', name: "Ya'll Maid Austin" },
        { pattern: /rapids\s*cleaning/i, locationId: '8duUHE4ENvhQTCtg3z6o', name: 'Rapids Cleaning Services' },
        { pattern: /maid\s*co/i, locationId: 'IoU6ToP3okYmCe2CKNly', name: 'Maid Co Cleaning' },
        { pattern: /poppy\s*pro(?:\s*clean(?:ing|er)?)?/i, locationId: 'n1jnBtlfzNKJC4BdrN2y', name: 'Poppy Pro Cleaning' },
      ];

      const combinedText = `${subject} ${directMessage}`;
      for (const brand of BRAND_LOCATION_MAP) {
        if (brand.pattern.test(combinedText)) {
          if (locationId !== brand.locationId) {
            addLog(`[Brand Guardrail] Auto-corrected locationId from ${locationId} to ${brand.locationId} based on brand match "${brand.name}"`, {
              subject,
              originalLocationId: locationId,
              correctedLocationId: brand.locationId,
            });
            locationId = brand.locationId;
          }
          break;
        }
      }

      // Ignore Yelp & Gmail administrative/system emails (e.g. email verifications, manager invitations, forwarding confirmations, consumer receipts)
      const isSystemEmail = /confirm your email|verify your email|invited you to manage|invitation from|welcome to yelp|your yelp invoice|forwarding confirmation|confirm the request|your request was sent|good news! your request/i.test(subject) ||
                            /confirm your email address on yelp|has invited you to manage|automatically forward mail to your email|you're closer to hiring a pro|keep an eye out for messages in your projects tab/i.test(directMessage);
      if (isSystemEmail) {
        addLog('[Yelp Webhook] Ignored administrative/system notification', { subject, name });
        return;
      }

      // Parse Yelp project summary / quote request details deterministically
      const parsedSummary = parseYelpProjectSummary({
        message: typeof directMessage === 'string' ? directMessage : String(directMessage),
        subject,
        projectSummary: typeof rawSummary === 'string' ? rawSummary : undefined,
      });
      const isMessageQuote = parseYelpProjectSummary({
        message: typeof directMessage === 'string' ? directMessage : String(directMessage),
        subject,
      }).isProjectSummary;
      const isNewQuote = parsedSummary.isProjectSummary;

      // Extract customer name from subject or body if missing or generic Yelp sender
      const isGenericName = !name || ['Yelp Customer', 'Yelp', 'Yelp Inbox', 'Yelp Notifications'].includes(name) || /@yelp\.com$/i.test(name);
      if (isGenericName) {
        if (/response to\s+(.+)$/i.test(subject)) {
          name = subject.match(/response to\s+(.+)$/i)![1].trim();
        } else if (/Message from\s+(.+?)(?:\s+for\s+|$)/i.test(subject)) {
          name = subject.match(/Message from\s+(.+?)(?:\s+for\s+|$)/i)![1].trim();
        } else if (/sent a message/i.test(subject)) {
          name = subject.split(/sent a message/i)[0].trim();
        } else if (/New (?:lead|quote request)(?:\s+from)?\s+(.+?)(?:\s+for\s+|\s*$)/i.test(subject)) {
          name = subject.match(/New (?:lead|quote request)(?:\s+from)?\s+(.+?)(?:\s+for\s+|\s*$)/i)![1].trim();
        } else {
          const nameMatch = directMessage.match(/([a-zA-Z\s]+?)\s+requested a quote/i);
          if (nameMatch) name = nameMatch[1].trim();
        }
      }
      // Clean up common Yelp email sender suffixes
      name = name.replace(/\s+(via|on|-)\s+Yelp.*$/i, '').trim();
      name = name.replace(/\s+sent a message.*$/i, '').trim();
      name = name.replace(/^RE:\s*/i, '').trim();
      if (!name) name = 'Yelp Customer';

      // Extract Yelp Lead ID from URL
      const leadIdMatch = directMessage.match(/(?:leads|thread)(?:%2F|\/)([a-zA-Z0-9_\-]+)/i) ||
                          directMessage.match(/return_url=[^&\s]*(?:%2F|\/)(?:leads|thread)(?:%2F|\/)([a-zA-Z0-9_\-]+)/i);
      const leadId = body?.lead_id || body?.conversation_id || (leadIdMatch ? leadIdMatch[1] : ('yelp_' + Date.now()));

      // Assign masked customer email
      let email = body?.email || body?.customer_email || body?.temporary_email_address;
      // Never treat Zapier addresses or the business owner's email as the customer's email
      if (email && (email.includes('zapiermail.com') || email.includes('jerafisabalo') || email.includes('thesparklesquadco') || email.includes('sparklesquad') || email.includes('jacksonvillecleaningco') || email.includes('selectservices') || email.includes('sunnyside') || email.includes('capableclean') || email.includes('ascendcleaning') || email.includes('pugetsoundcleaners') || email.includes('mumscleaning') || email.includes('rapidscleaning') || email.includes('rapidscleaningservices') || email.includes('yallmaid') || email.includes('yallmaidaustincleaningservices') || email.includes('maidcocleaningservices') || email.includes('poppyproclean'))) {
        email = undefined;
      }
      if (!email && leadId) {
        email = `leadsapi+${leadId}@messaging.yelp.com`;
      }

      let phone = body?.phone || body?.customer_phone || body?.phone_number;
      if (phone && (phone.includes('8777679357') || phone.includes('877-767-9357') || phone.includes('877.767.9357') || phone.includes('767-9357') || phone.includes('855-380-9357') || phone.includes('8553809357'))) {
        phone = undefined;
      }

      let cleanMessage = String(directMessage).trim();
      const customFields = isNewQuote ? buildYelpCustomFields(parsedSummary, leadId) : [];

      if (isMessageQuote) {
        const serviceLabel = parsedSummary.serviceType || 'Cleaning';
        const sizeParts = [
          parsedSummary.bedrooms ? `${parsedSummary.bedrooms} bed` : '',
          parsedSummary.bathrooms ? `${parsedSummary.bathrooms} bath` : '',
        ].filter(Boolean);

        // Clean, elegant summary for the GHL conversation bubble
        cleanMessage = [
          `New Yelp Lead: ${name}`,
          serviceLabel ? `• Service: ${serviceLabel}` : '',
          sizeParts.length > 0 ? `• Size: ${sizeParts.join(' / ')}` : '',
          parsedSummary.cleaningFrequency ? `• Frequency: ${parsedSummary.cleaningFrequency}` : '',
          parsedSummary.notes ? `• Customer Notes: ${parsedSummary.notes}` : '',
          parsedSummary.zip ? `• Location: ${parsedSummary.zip}` : '',
        ].filter(Boolean).join('\n');
      } else {
        // Ongoing conversation reply: strip boilerplate and action buttons
        const yelpWroteMatch = cleanMessage.match(/(?:wrote|sent a message):\s*\n+([\s\S]+?)(?:\n\s*Reply to this email|\n\s*View on Yelp|\n\s*Respond to|\n\s*Sent from my|$)/i);
        if (yelpWroteMatch && yelpWroteMatch[1]) {
          cleanMessage = yelpWroteMatch[1].trim();
        } else {
          const cutoffMarkers = [
            'Reply for free on Yelp Biz',
            'Or reply directly to this email',
            'Respond Now',
            'Or simply respond',
            'View on Yelp',
            'Sent from my',
            'This email was sent to',
            'Manage email preferences',
            '© 2026 | Yelp Inc',
            '[](https://biz.yelp.com',
          ];
          for (const marker of cutoffMarkers) {
            if (cleanMessage.includes(marker)) {
              cleanMessage = cleanMessage.slice(0, cleanMessage.indexOf(marker)).trim();
            }
          }
        }
      }

      // If this is a brand new quote arriving via email, wait 12s so Zap 1 (Yelp Leads API)
      // finishes creating the contact and GHL completes its background Elasticsearch indexing.
      if (isNewQuote) {
        addLog(`[Yelp Webhook] Buffering 12s for initial quote (${name}) to allow Zapier intake & GHL indexing...`);
        await new Promise(resolve => setTimeout(resolve, 12000));
      }

      const contactId = await GHLService.findOrCreateContact({
        name,
        email,
        phone,
        leadId,
        source: 'Yelp',
        locationId,
        isNewLead: isNewQuote,
        customFields,
      });

      if (!contactId) {
        addLog(`[Yelp Webhook] Skipped processing: no valid contact created/found for ${name} (loc: ${locationId})`);
        return;
      }

      // If this is a new quote, create an opportunity in the location's dedicated Yelp pipeline
      if (isNewQuote) {
        await GHLService.createOpportunity({
          contactId,
          name,
          locationId,
        });
      }

      await GHLService.postInboundMessage({
        contactId,
        message: cleanMessage,
        leadId,
        eventId: body?.event_id,
        locationId,
      });

      addLog(`[Yelp Ingest via Zapier] Ingested "${cleanMessage.slice(0, 80)}" for ${name} into GHL contact ${contactId} (loc: ${locationId})`, {
        parsedCustomFields: customFields.map(cf => cf.key),
      });
      return;
    }

    // 2. Standard Yelp Webhook updates array
    const updates = req.body?.data?.updates || [];
    for (const update of updates) {
      const { lead_id, event_id, event_type } = update;

      if (!lead_id) continue;

      // Fetch lead details and events
      const [lead, events] = await Promise.all([
        YelpService.getLead(lead_id),
        YelpService.getLeadEvents(lead_id),
      ]);

      // Guardrail: Ensure lead belongs to this specific business instance
      if (config.yelp.businessId && lead.business_id && lead.business_id !== config.yelp.businessId) {
        console.log(`[Yelp Webhook] Ignoring lead ${lead_id} for external business ${lead.business_id} (configured: ${config.yelp.businessId})`);
        continue;
      }

      // Find the latest message event
      const latestEvent = events.find((e) => e.event_id === event_id) || events[events.length - 1];

      if (!latestEvent) continue;

      // Echo prevention: Ignore messages sent by our own API
      if (latestEvent.user_type === 'BIZ' && latestEvent.channel === 'API-SELF') {
        console.log(`[Yelp Webhook] Ignoring API-SELF message for lead ${lead_id}`);
        continue;
      }

      // We only ingest messages originating from the consumer
      if (latestEvent.user_type === 'CONSUMER') {
        const messageText = latestEvent.text || 'New inquiry on Yelp';
        const parsedBranchSummary = parseYelpProjectSummary({ message: messageText });
        const branchCustomFields = parsedBranchSummary.isProjectSummary
          ? buildYelpCustomFields(parsedBranchSummary, lead_id)
          : undefined;

        // Match or create contact in GoHighLevel
        const contactId = await GHLService.findOrCreateContact({
          name: lead.display_name,
          email: lead.temporary_email_address,
          phone: lead.phone_number || lead.user_phone_number,
          leadId: lead_id,
          source: 'Yelp',
          customFields: branchCustomFields,
        });

        // Post inbound message into GHL Conversations
        await GHLService.postInboundMessage({
          contactId,
          message: messageText,
          leadId: lead_id,
          eventId: latestEvent.event_id,
        });

        console.log(`[Yelp Webhook] Successfully ingested message from Yelp into GHL contact ${contactId}`);
      }
    }
  } catch (err: any) {
    console.error('[Yelp Webhook Error]', err);
    addLog('[Yelp Webhook Error]', { error: err?.response?.data || err?.message || String(err) });
  }
});

/**
 * 1B. Smart GHL Contact Upsert Proxy (/contacts/upsert)
 * Sanitizes empty "email": "" or "phone": "" fields from Zapier Custom Requests
 * (preventing GHL 422 "email must be an email" errors when Yelp Temporary Email is empty)
 * and reconciles contacts by Yelp Lead ID before falling back to GHL native upsert.
 */
app.post('/contacts/upsert', async (req: Request, res: Response) => {
  try {
    const payload = { ...(req.body || {}) };
    let locationId = payload.locationId || payload.location_id || config.ghl.locationId;
    if (locationId === 'EKXbBmGEV6hnLQFQRPc') {
      locationId = 'EKXbBmGEV6hnLQFQRPc7';
    }
    payload.locationId = locationId;
    addLog('[Smart Upsert] Received Zapier upsert payload', payload);

    // Normalize tags if passed as a comma-separated string from Zapier
    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    // Ensure both 'yelp-lead' and 'yelp lead' are present when a Yelp tag is passed
    if (Array.isArray(payload.tags)) {
      const hasYelpTag = payload.tags.some((t: string) => /yelp[-_ ]?lead/i.test(t) || /source:?\s*yelp/i.test(t));
      if (hasYelpTag) {
        if (locationId === '19jBWYeRsrzDq6Oe1nth' && !payload.tags.includes('yelp lead')) {
          payload.tags.push('yelp lead');
        }
        if (!payload.tags.includes('source: yelp')) {
          payload.tags.push('source: yelp');
        }
        if (!payload.tags.includes('yelp-lead')) {
          payload.tags.push('yelp-lead');
        }
      }
    }

    // Detect if phone availability payload before property stripping
    const isPhonePayload = GHLService.isPhoneAvailabilityPayload(payload);
    if (isPhonePayload) {
      if (!Array.isArray(payload.tags)) {
        payload.tags = [];
      }
      if (!payload.tags.includes('yelp-phone-captured')) {
        payload.tags.push('yelp-phone-captured');
      }
    }

    // Strip empty or invalid email to prevent GHL 422 "email must be an email"
    if (typeof payload.email !== 'string' || !payload.email.trim() || !payload.email.includes('@')) {
      delete payload.email;
    } else {
      payload.email = payload.email.trim();
    }

    // Strip empty phone
    if (typeof payload.phone !== 'string' || !payload.phone.trim()) {
      delete payload.phone;
    } else {
      payload.phone = payload.phone.trim();
    }

    // Extract leadId if passed at top-level or inside customFields across all 8 locations
    let leadId = payload.leadId || payload.lead_id;
    delete payload.leadId;
    delete payload.lead_id;

    const KNOWN_LEAD_ID_FIELDS = new Set([
      'K76pF6924CuFnr3ZfciK', // Jacksonville Cleaning Co
      'Kkm6Kz8HxwC2XpeC2e6A', // Capable Clean
      '00pY3JUPGvBTS87b2no1', // Ascend Cleaning
      'yLmWGwpt8XKke8rinDSG', // The Sparkle Squad Co (Miami)
      'zI2KtX2j7gptvuYwoflv', // Sunny Side Clean Team
      'VxYsxN4PvMUo3fcc5VU2', // Puget Sound Cleaners
      'xofbiSRUGxxg2jFbVlRr', // Mum's Cleaning Services Chicago
      '77hnROLGu93J1yZFvQvq', // Ya'll Maid Austin
      'owoZ7ZXYbiQeM8dla8AI', // Rapids Cleaning Service
      'ISkhiu9o4RRQ5O8VxgRL', // Maid Co Cleaning
    ]);

    if (!leadId && Array.isArray(payload.customFields)) {
      const leadField = payload.customFields.find(
        (f: any) => f.key === 'yelp_lead_id' || KNOWN_LEAD_ID_FIELDS.has(f.id)
      );
      if (leadField?.value) leadId = leadField.value;
    }

    // Normalize tags if passed as a comma-separated string from Zapier
    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    // Ensure both 'yelp-lead' and 'yelp lead' are present when a Yelp tag is passed
    if (Array.isArray(payload.tags)) {
      const hasYelpTag = payload.tags.some((t: string) => /yelp[-_ ]?lead/i.test(t) || /source:?\s*yelp/i.test(t));
      if (hasYelpTag) {
        if (locationId === '19jBWYeRsrzDq6Oe1nth' && !payload.tags.includes('yelp lead')) {
          payload.tags.push('yelp lead');
        }
        if (!payload.tags.includes('source: yelp')) {
          payload.tags.push('source: yelp');
        }
        if (!payload.tags.includes('yelp-lead')) {
          payload.tags.push('yelp-lead');
        }
      }
    }

    // Helper to sanitize custom field values (unpacks Yelp JSON objects / stringified JSON)
    const sanitizeCustomFieldValue = (v: any): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') {
        if (v.customer_request) return String(v.customer_request);
        if (v.text) return String(v.text);
        if (v.value) return String(v.value);
        if (v.notes) return String(v.notes);
        try {
          return Object.values(v).map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('; ');
        } catch (e) {
          return JSON.stringify(v);
        }
      }
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.customer_request) return String(parsed.customer_request);
            if (parsed.text) return String(parsed.text);
            if (parsed.value) return String(parsed.value);
            if (parsed.notes) return String(parsed.notes);
            return Object.values(parsed).map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('; ');
          } catch (e) {
            return v;
          }
        }
        return v;
      }
      return String(v);
    };

    // Normalize keys (e.g. yelp-phone-captured -> yelp_phone_captured)
    for (const key of Object.keys(payload)) {
      if (key.includes('-') && !['dnd-settings', 'inbound-dnd-settings'].includes(key)) {
        const normalizedKey = key.replace(/-/g, '_');
        if (payload[normalizedKey] === undefined) {
          payload[normalizedKey] = payload[key];
        }
        delete payload[key];
      }
    }

    // Auto-bundle flat custom fields (e.g. yelp_service_type, yelp_bedrooms, etc.)
    if (!Array.isArray(payload.customFields)) {
      payload.customFields = [];
    }

    // Capture any property that starts with yelp_ or ends with notes/request
    for (const key of Object.keys(payload)) {
      if (key.startsWith('yelp_') || key === 'notes' || key === 'customer_request') {
        const val = sanitizeCustomFieldValue(payload[key]);
        const ghlKey = (key === 'yelp_notes' || key === 'notes' || key === 'customer_request') 
          ? 'yelp_notes__customer_request' 
          : key;
        if (!payload.customFields.some((f: any) => f.key === ghlKey || f.key === `contact.${ghlKey}`)) {
          payload.customFields.push({
            key: ghlKey,
            value: val,
          });
        }
        delete payload[key];
      }
    }

    // Clean any customFields already passed in array format
    payload.customFields = payload.customFields.map((f: any) => ({
      ...f,
      value: sanitizeCustomFieldValue(f.value),
    }));

    // Strictly strip any non-standard root contact properties so GHL validator never rejects with "property X should not exist"
    const ALLOWED_GHL_CONTACT_FIELDS = new Set([
      'name', 'firstName', 'lastName', 'email', 'phone', 'locationId',
      'gender', 'address1', 'city', 'state', 'postalCode', 'website',
      'timezone', 'dnd', 'dndSettings', 'inboundDndSettings', 'tags',
      'customFields', 'source', 'type', 'companyName'
    ]);

    for (const key of Object.keys(payload)) {
      if (!ALLOWED_GHL_CONTACT_FIELDS.has(key)) {
        delete payload[key];
      }
    }

    const contactId = await GHLService.smartUpsertContact(payload, leadId);

    if (!contactId) {
      addLog(`[Smart Upsert] Skipped orphan contact creation for location ${locationId}`, {
        email: payload.email,
        phone: payload.phone,
        action: 'skipped_orphan_guardrail',
      });
      return res.status(200).json({
        success: true,
        action: 'skipped_orphan_guardrail',
        message: 'Skipped orphan contact creation: no existing contact in location',
      });
    }

    // Safety net: If this is a new intake with survey answers, ensure survey chat bubble is in Conversations
    if (!isPhonePayload) {
      const hasSurvey = Array.isArray(payload.customFields) && payload.customFields.some((f: any) =>
        f.key?.includes('yelp_service_type') || f.key?.includes('yelp_bedrooms') || f.key?.includes('yelp_notes') || f.key?.includes('notes')
      );
      if (hasSurvey) {
        GHLService.ensureInboundSurveySummary(contactId, locationId, payload, leadId).catch(e =>
          console.warn('[Server] Auto survey summary bubble note:', e.message)
        );
      }
    }

    res.status(200).json({
      success: true,
      contact: { id: contactId },
    });
  } catch (err: any) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { message: err.message };
    addLog('[Smart Upsert Error]', data);
    res.status(status).json(data);
  }
});

/**
 * 2. Outbound Delivery Webhook from GoHighLevel (Clean Genie)
 * Triggered when an agent types a reply in the GHL Conversations tab
 */
app.post('/webhook/ghl-delivery', async (req: Request, res: Response) => {
  res.status(200).json({ success: true });

  try {
    const body = req.body;
    addLog('[GHL Delivery] Received outbound payload', {
      keys: Object.keys(body || {}),
      replyToAltId: body?.replyToAltId,
      leadId: body?.leadId,
      altId: body?.altId,
      conversationAltId: body?.conversationAltId,
      messageType: body?.type,
      messageTextPreview: (body?.message || body?.body || '').substring(0, 80),
    });

    const messageText = body?.message || body?.body || '';
    const contactId = body?.contactId;

    // Detect channel (Yelp vs Thumbtack)
    const channel = (req.query.channel as string) || 'yelp';

    if (channel === 'thumbtack') {
      const thumbtackLeadId = body?.replyToAltId || body?.leadId;
      addLog('[GHL Delivery] Routing to Thumbtack', { thumbtackLeadId });
      await ThumbtackService.sendReply(thumbtackLeadId, messageText);
    } else {
      // Default: Yelp — try all possible lead ID fields
      let yelpLeadId = body?.replyToAltId
        || body?.altId
        || body?.conversationAltId
        || body?.leadId
        || body?.customFields?.yelp_lead_id;

      // Fallback: If not present in payload, look up contact in GHL to extract lead ID
      if (!yelpLeadId && contactId) {
        try {
          const locationId = body?.locationId || body?.location_id || config.ghl.locationId;
          const contact = await GHLService.getContact(contactId, locationId);
          if (contact) {
            // Check custom fields
            const cf = contact.customFields || [];
            const yelpField = cf.find((f: any) => f.key === 'yelp_lead_id' || f.id === 'xofbiSRUGxxg2jFbVlRr' || f.id === '77hnROLGu93J1yZFvQvq' || f.id === 'ISkhiu9o4RRQ5O8VxgRL');
            if (yelpField?.value) {
              yelpLeadId = yelpField.value;
            }

            // Check email: leadsapi+<leadId>@messaging.yelp.com
            if (!yelpLeadId && contact.email) {
              const emailMatch = contact.email.match(/leadsapi\+([a-zA-Z0-9_\-]+)@/i) || contact.email.match(/reply\+([a-zA-Z0-9_\-]+)@/i);
              if (emailMatch) {
                yelpLeadId = emailMatch[1];
              }
            }
          }
        } catch (fetchErr: any) {
          addLog('[GHL Delivery] Could not fetch contact for yelpLeadId fallback', { error: fetchErr.message });
        }
      }

      if (!yelpLeadId) {
        addLog('[GHL Delivery] ⚠️ No yelp_lead_id found — cannot relay to Yelp. Full body keys: ' + Object.keys(body || {}).join(', '));
        return;
      }

      addLog(`[GHL Delivery] Sending reply to Yelp lead ${yelpLeadId}`, { message: messageText.substring(0, 80) });
      await YelpService.sendReply(yelpLeadId, messageText);
      addLog(`[GHL Delivery] ✅ Successfully relayed reply to Yelp lead ${yelpLeadId}`);
    }
  } catch (err: any) {
    addLog('[GHL Delivery] ❌ Error sending to Yelp', { error: err.response?.data || err.message });
  }
});

/**
 * 2B. 24/7 Inbound Slack Events API / Outgoing Webhook / Zapier Listener
 * Supports Slack url_verification, event_callback (message / app_mention), and Outgoing/Zapier payloads
 * and forwards matching alerts directly to Telegram 24/7.
 */
app.post('/webhook/slack', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    const verification = SlackWebhookService.verifySlackRequest({
      headers: req.headers as Record<string, string | string[] | undefined>,
      rawBody,
      body: req.body,
    });

    if (!verification.valid) {
      addLog('[Slack Webhook] Rejected unverified request', { reason: verification.reason });
      res.status(401).json({ ok: false, error: verification.reason });
      return;
    }

    const parsed = SlackWebhookService.parseIncomingPayload(req.body);

    if (parsed.kind === 'challenge') {
      addLog('[Slack Webhook] Responded to Slack url_verification challenge');
      res.status(200).json({ challenge: parsed.challenge });
      return;
    }

    // Acknowledge immediately so Slack does not time out (3s limit) and retry
    res.status(200).json({ ok: true });

    if (parsed.kind === 'ignored') {
      addLog('[Slack Webhook] Ignored event', { reason: parsed.reason });
      return;
    }

    if (SlackWebhookService.isDuplicate(parsed.alert)) {
      addLog('[Slack Webhook] Skipped duplicate event', {
        eventId: parsed.alert.eventId,
        channelId: parsed.alert.channelId,
        ts: parsed.alert.ts,
      });
      return;
    }

    const sent = await SlackWebhookService.sendTelegramAlert(parsed.alert);
    addLog('[Slack Webhook] Forwarded Slack message to Telegram', {
      sent,
      source: parsed.alert.source,
      channel: parsed.alert.channelName || parsed.alert.channelId,
      user: parsed.alert.userName || parsed.alert.userId,
      preview: parsed.alert.text.slice(0, 80),
    });
  } catch (err: any) {
    addLog('[Slack Webhook Error]', { error: err?.response?.data || err?.message || String(err) });
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: err?.message || 'Slack webhook error' });
    }
  }
});

/**
 * 3. OAuth 2.0 Authorization Callback for Yelp
 */
app.get(['/oauth/yelp/callback', '/oauth/callback/yelp'], async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('host') || 'cg-lead-bridge.onrender.com';
    const redirect_uri = `${proto}://${host}${req.path}`;

    console.log(`[Yelp OAuth] Exchanging code with redirect_uri: ${redirect_uri}`);

    // Exchange code for tokens
    const response = await fetch('https://api.yelp.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.yelp.clientId,
        client_secret: config.yelp.clientSecret,
        code,
        redirect_uri,
      }),
    });

    const data: any = await response.json();
    if (!response.ok || !data.access_token) {
      console.error('[Yelp OAuth Error Response]', data);
      res.status(400).send(`<h2>Yelp OAuth Error</h2><pre>${JSON.stringify(data, null, 2)}</pre>`);
      return;
    }

    TokenStore.saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 15552000) * 1000,
    });

    console.log('[Yelp OAuth] Token exchange successful! Subscribing to Yelp webhook...');

    // Automatically register Yelp Leads webhook
    try {
      const webhookUrl = `${proto}://${host}/webhook/yelp`;
      const webhookRes = await YelpService.subscribeWebhook(webhookUrl);
      console.log('[Yelp OAuth] Webhook registered:', webhookRes);
    } catch (whErr: any) {
      console.warn('[Yelp OAuth] Webhook auto-registration note:', whErr.response?.data || whErr.message);
    }

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h2 style="color: #2e7d32;">🎉 Yelp Authorization Successful!</h2>
        <p>Your CleanGenie Yelp Lead Bridge is now connected with full Partner access.</p>
        <p>Webhooks and 2-way messaging are active.</p>
      </div>
    `);
  } catch (err: any) {
    console.error('[OAuth Error]', err);
    res.status(500).send(`OAuth exchange failed: ${err.message}`);
  }
});

/**
 * 4. OAuth 2.0 Authorization Callback for CRM / LeadConnector
 * Supports generic /oauth/callback to comply with HighLevel's white-label naming rules
 */
app.get(['/oauth/callback', '/oauth/crm/callback', '/oauth/ghl/callback'], async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('host') || 'cg-lead-bridge.onrender.com';
    const redirect_uri = `${proto}://${host}${req.path}`;

    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.ghl.clientId,
        client_secret: config.ghl.clientSecret,
        grant_type: 'authorization_code',
        code,
        user_type: 'Location',
        redirect_uri,
      }),
    });

    const data: any = await response.json();
    console.log('[GHL OAuth Exchange] Response:', JSON.stringify(data));

    if (data.access_token) {
      TokenStore.saveTokens({
        ghlAccessToken: data.access_token,
        ghlRefreshToken: data.refresh_token,
        ghlLocationId: data.locationId,
      });
      res.send(`
        <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #10b981;">✓ Clean Genie Lead Bridge Connected!</h2>
          <p>Your GoHighLevel location (<code>${data.locationId || config.ghl.locationId}</code>) is now authorized.</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; margin-top: 16px;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #4b5563;">GHL Access Token (Copy and add to Render Env Vars as GHL_ACCESS_TOKEN):</p>
            <code>${data.access_token}</code>
          </div>
        </div>
      `);
    } else {
      res.status(400).send(`<h2>OAuth Error</h2><pre>${JSON.stringify(data, null, 2)}</pre>`);
    }
  } catch (err) {
    console.error('[GHL OAuth Error]', err);
    res.status(500).send('HighLevel OAuth exchange failed');
  }
});

// Start Server
const HOST = '0.0.0.0';
app.listen(config.port, HOST, () => {
  console.log(`[CleanGenie Lead Bridge] Running on http://${HOST}:${config.port}`);
  CronService.init();
});
