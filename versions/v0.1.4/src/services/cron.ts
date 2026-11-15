import cron from 'node-cron';
import axios from 'axios';
import { YelpService } from './yelp';
import { TokenStore } from './token-store';
import { config } from '../config';

export class CronService {
  /**
   * Initializes scheduled tasks
   */
  public static init() {
    console.log('[CronService] Initializing 12-day Yelp Webhook Auto-Renewal Engine & Keep-Alive Pinger...');

    // Run every day at 03:00 AM to check if webhook expiration is within 48 hours
    cron.schedule('0 3 * * *', async () => {
      await this.checkAndRenewWebhook();
    });

    // Run every 10 minutes to ping Render health endpoint and prevent cold-start sleeps
    cron.schedule('*/10 * * * *', async () => {
      await this.pingKeepAlive();
    });
  }

  /**
   * Keep-alive ping to ensure Render instance stays awake and never cold-starts
   */
  public static async pingKeepAlive() {
    const healthUrl = config.baseUrl?.startsWith('http') && !config.baseUrl.includes('localhost')
      ? `${config.baseUrl.replace(/\/+$/, '')}/health`
      : 'https://cg-lead-bridge.onrender.com/health';

    try {
      const res = await axios.get(healthUrl, { timeout: 8000 });
      console.log(`[CronService] Keep-alive self-ping OK (${res.status}) -> ${healthUrl}`);
    } catch (err: any) {
      console.warn(`[CronService] Keep-alive self-ping note:`, err.message);
    }
  }

  /**
   * Checks expiration date and renews subscription if needed
   */
  public static async checkAndRenewWebhook() {
    const tokens = TokenStore.getTokens();
    if (!tokens || !tokens.webhookId || !tokens.webhookExpiresAt) {
      console.log('[CronService] No active webhook subscription tracked. Skipping renewal check.');
      return;
    }

    const now = Date.now();
    const twoDaysMs = 48 * 60 * 60 * 1000;
    const timeUntilExpiry = tokens.webhookExpiresAt - now;

    if (timeUntilExpiry < twoDaysMs) {
      console.log('[CronService] Webhook expiring in under 48 hours. Performing automated renewal...');
      try {
        // 1. Refresh OAuth access token
        await YelpService.refreshAccessToken();

        // 2. Unsubscribe old webhook
        await YelpService.unsubscribeWebhook(tokens.webhookId);

        // 3. Resubscribe
        const targetUrl = `${config.baseUrl}/webhook/yelp`;
        const res = await YelpService.subscribeWebhook(targetUrl);

        console.log(`[CronService] Successfully renewed webhook: ${res.webhookId}, new expiry: ${res.expirationDate}`);
      } catch (err) {
        console.error('[CronService] Failed to renew Yelp webhook:', err);
      }
    } else {
      const daysLeft = (timeUntilExpiry / (24 * 60 * 60 * 1000)).toFixed(1);
      console.log(`[CronService] Webhook is healthy. ${daysLeft} days remaining before renewal.`);
    }
  }
}
