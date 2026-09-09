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
    });

    const inboundResult = await GHLService.postInboundMessage({
      contactId,
      message,
      leadId,
      eventId: 'evt_' + Date.now(),
    });

    res.json({
      success: true,
      message: 'Test lead dispatched to GoHighLevel!',
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

    // 1. Direct Zapier payload format (contains actual message, name, email, phone)
    const directMessage = body?.message || body?.text || body?.body;
    if (directMessage) {
      const name = body?.name || body?.customer_name || 'Yelp Customer';
      const email = body?.email || body?.customer_email || body?.temporary_email_address;
      const phone = body?.phone || body?.customer_phone || body?.phone_number;
      const leadId = body?.lead_id || body?.conversation_id || ('yelp_' + Date.now());

      const contactId = await GHLService.findOrCreateContact({
        name,
        email,
        phone,
        leadId,
        source: 'Yelp',
      });

      await GHLService.postInboundMessage({
        contactId,
        message: directMessage,
        leadId,
        eventId: body?.event_id,
      });

      console.log(`[Yelp Ingest via Zapier] Ingested "${directMessage}" for ${name} into GHL contact ${contactId}`);
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
    console.log('[GHL Delivery Webhook] Received payload:', JSON.stringify(body));

    const messageText = body?.message || body?.body || '';
    const contactId = body?.contactId;
    const conversationProviderId = body?.conversationProviderId;

    // Detect channel (Yelp vs Thumbtack)
    const channel = (req.query.channel as string) || 'yelp';

    if (channel === 'thumbtack') {
      const thumbtackLeadId = body?.replyToAltId || body?.leadId;
      await ThumbtackService.sendReply(thumbtackLeadId, messageText);
    } else {
      // Default: Yelp
      const yelpLeadId = body?.replyToAltId || body?.leadId || body?.customFields?.yelp_lead_id;

      if (!yelpLeadId) {
        console.warn('[GHL Delivery Webhook] No yelp_lead_id found in outbound payload.');
        return;
      }

      await YelpService.sendReply(yelpLeadId, messageText);
      console.log(`[GHL Delivery Webhook] Successfully posted reply to Yelp lead ${yelpLeadId}`);
    }
  } catch (err) {
    console.error('[GHL Delivery Error]', err);
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
      const webhookRes = await YelpService.subscribeToWebhook();
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
