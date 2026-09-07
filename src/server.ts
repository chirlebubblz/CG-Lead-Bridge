import express, { Request, Response } from 'express';
import { config } from './config';
import { YelpService } from './services/yelp';
import { GHLService } from './services/ghl';
import { ThumbtackService } from './services/thumbtack';
import { CronService } from './services/cron';
import { TokenStore } from './services/token-store';

const app = express();
app.use(express.json());

// Health & Status
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
 * 1. Inbound Webhook from Yelp
 * Triggered when a new lead or message is created on Yelp
 */
app.post('/webhook/yelp', async (req: Request, res: Response) => {
  res.status(200).send('OK'); // Acknowledge Yelp immediately with 2XX

  try {
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
app.get('/oauth/yelp/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    // Exchange code for tokens
    const response = await fetch('https://api.yelp.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.yelp.clientId,
        client_secret: config.yelp.clientSecret,
        code,
        redirect_uri: `${config.baseUrl}/oauth/yelp/callback`,
      }),
    });

    const data: any = await response.json();
    TokenStore.saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    });

    res.send('<h2>Yelp Authorization Successful!</h2><p>You can close this window now.</p>');
  } catch (err) {
    console.error('[OAuth Error]', err);
    res.status(500).send('OAuth exchange failed');
  }
});

/**
 * 4. OAuth 2.0 Authorization Callback for GoHighLevel
 */
app.get('/oauth/ghl/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.ghl.clientId,
        client_secret: config.ghl.clientSecret,
        grant_type: 'authorization_code',
        code,
        user_type: 'Location',
        redirect_uri: `${config.baseUrl}/oauth/ghl/callback`,
      }),
    });

    const data: any = await response.json();
    console.log('[GHL OAuth Exchange] Success:', data);

    if (data.access_token) {
      TokenStore.saveTokens({
        ghlAccessToken: data.access_token,
        ghlRefreshToken: data.refresh_token,
        ghlLocationId: data.locationId,
      });
    }

    res.send('<h2>Clean Genie Lead Bridge Installed Successfully!</h2><p>Your HighLevel location is now connected. You can close this window.</p>');
  } catch (err) {
    console.error('[GHL OAuth Error]', err);
    res.status(500).send('HighLevel OAuth exchange failed');
  }
});

// Start Server
app.listen(config.port, () => {
  console.log(`[CleanGenie Lead Bridge] Running on port ${config.port}`);
  CronService.init();
});
