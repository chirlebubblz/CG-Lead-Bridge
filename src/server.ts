import express, { Request, Response } from 'express';
import { config } from './config';
import { YelpService } from './services/yelp';
import { GHLService } from './services/ghl';
import { ThumbtackService } from './services/thumbtack';
import { CronService } from './services/cron';
import { TokenStore } from './services/token-store';

const app = express();
app.use(express.json());

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

    // 1. Direct Zapier payload format (contains actual message, name, email, phone)
    const directMessage = body?.message || body?.text || body?.body;
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
        return res.status(200).send('IGNORED_SYSTEM_NOTIFICATION');
      }

      // Check if this is an initial Yelp Quote Request with questionnaire data
      const isNewQuote = /requested a quote|How many bedrooms|new .* cleaning request/i.test(directMessage);

      // Extract customer name from subject or body if missing or generic Yelp sender
      if (!name || ['Yelp Customer', 'Yelp', 'Yelp Inbox'].includes(name)) {
        if (/response to\s+(.+)$/i.test(subject)) {
          name = subject.match(/response to\s+(.+)$/i)![1].trim();
        } else if (/sent a message/i.test(subject)) {
          name = subject.split(/sent a message/i)[0].trim();
        } else {
          const nameMatch = directMessage.match(/^([a-zA-Z\s]+?)\s+requested a quote/i);
          if (nameMatch) name = nameMatch[1].trim();
        }
      }
      // Clean up common Yelp email sender suffixes
      name = name.replace(/\s+(via|on|-)\s+Yelp.*$/i, '').trim();
      name = name.replace(/\s+sent a message.*$/i, '').trim();
      name = name.replace(/^RE:\s*/i, '').trim();
      if (!name) name = 'Yelp Customer';

      // Extract Yelp Lead ID from URL
      const leadIdMatch = directMessage.match(/leads(?:%2F|\/)([a-zA-Z0-9_\-]+)/i) || 
                          directMessage.match(/return_url=[^&\s]*%2Fleads%2F([a-zA-Z0-9_\-]+)/i);
      const leadId = body?.lead_id || body?.conversation_id || (leadIdMatch ? leadIdMatch[1] : ('yelp_' + Date.now()));

      // Assign masked customer email
      let email = body?.email || body?.customer_email || body?.temporary_email_address;
      // Never treat Zapier addresses or the business owner's email as the customer's email
      if (email && (email.includes('zapiermail.com') || email.includes('jerafisabalo') || email.includes('thesparklesquadco') || email.includes('sparklesquad') || email.includes('jacksonvillecleaningco') || email.includes('selectservices') || email.includes('sunnyside') || email.includes('capableclean') || email.includes('ascendcleaning') || email.includes('pugetsoundcleaners') || email.includes('mumscleaning'))) {
        email = undefined;
      }
      if (!email && leadId) {
        email = `leadsapi+${leadId}@messaging.yelp.com`;
      }

      let phone = body?.phone || body?.customer_phone || body?.phone_number;
      if (phone && (phone.includes('8777679357') || phone.includes('877-767-9357') || phone.includes('877.767.9357') || phone.includes('767-9357') || phone.includes('855-380-9357') || phone.includes('8553809357'))) {
        phone = undefined;
      }

      let cleanMessage = directMessage.trim();
      const customFields: Array<{ key?: string; id?: string; value: any }> = [];

      if (isNewQuote) {
        const bedMatch = directMessage.match(/How many bedrooms[^\r\n]*[\r\n]+([^\r\n]+)/i);
        const bathMatch = directMessage.match(/How many bathrooms[^\r\n]*[\r\n]+([^\r\n]+)/i);
        const freqMatch = directMessage.match(/How often do you want[^\r\n]*[\r\n]+([^\r\n]+)/i);
        const serviceMatch = directMessage.match(/requested a quote.*?for\s+(?:a\s+)?([a-zA-Z\s\-]+?)(?:\.|\r|\n)/i) || directMessage.match(/new\s+([a-zA-Z\s\-]+?)\s+request/i);
        const notesMatch = directMessage.match(/details you\'?d like to share[^\r\n]*[\r\n]+([^\r\n]+)/i);
        const zipMatch = directMessage.match(/location do you need[^\r\n]*[\r\n]+([^\r\n]+)/i);

        const bedrooms = bedMatch ? bedMatch[1].trim() : '';
        const bathrooms = bathMatch ? bathMatch[1].trim() : '';
        const frequency = freqMatch ? freqMatch[1].trim() : '';
        const service = serviceMatch ? serviceMatch[1].trim() : 'Cleaning';
        const notes = notesMatch ? notesMatch[1].trim() : '';
        const zip = zipMatch ? zipMatch[1].trim() : '';

        // Clean, elegant summary for the GHL conversation bubble
        cleanMessage = [
          `New Yelp Lead: ${name}`,
          service ? `• Service: ${service}` : '',
          bedrooms || bathrooms ? `• Size: ${bedrooms}${bathrooms ? ' / ' + bathrooms : ''}` : '',
          frequency ? `• Frequency: ${frequency}` : '',
          notes ? `• Customer Notes: ${notes}` : '',
          zip ? `• Location: ${zip}` : '',
        ].filter(Boolean).join('\n');

        // Populate Custom Fields
        if (service) customFields.push({ key: 'yelp_service_type', value: service });
        if (bedrooms) customFields.push({ key: 'yelp_bedrooms', value: bedrooms.replace(/[^0-9]/g, '') || bedrooms });
        if (bathrooms) customFields.push({ key: 'yelp_bathrooms', value: bathrooms.replace(/[^0-9]/g, '') || bathrooms });
        if (frequency) customFields.push({ key: 'yelp_cleaning_frequency', value: frequency });
        if (notes) customFields.push({ key: 'yelp_notes__customer_request', value: notes });
        customFields.push({ key: 'yelp_lead_id', value: leadId });
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

      addLog(`[Yelp Ingest via Zapier] Ingested "${cleanMessage.slice(0, 80)}" for ${name} into GHL contact ${contactId} (loc: ${locationId})`);
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

        // Match or create contact in GoHighLevel
        const contactId = await GHLService.findOrCreateContact({
          name: lead.display_name,
          email: lead.temporary_email_address,
          phone: lead.phone_number || lead.user_phone_number,
          leadId: lead_id,
          source: 'Yelp',
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
  } catch (err) {
    console.error('[Yelp Webhook Error]', err);
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
      const yelpLeadId = body?.replyToAltId
        || body?.altId
        || body?.conversationAltId
        || body?.leadId
        || body?.customFields?.yelp_lead_id;

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
