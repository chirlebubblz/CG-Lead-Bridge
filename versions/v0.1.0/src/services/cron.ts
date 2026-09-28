import cron from 'node-cron';
import { YelpService } from './yelp';
import { TokenStore } from './token-store';
import { config } from '../config';

export class CronService {
  /**
   * Initializes scheduled tasks
   */
  public static init() {
    console.log('[CronService] Initializing 12-day Yelp Webhook Auto-Renewal Engine...');

    // Run every day at 03:00 AM to check if webhook expiration is within 48 hours
    cron.schedule('0 3 * * *', async () => {
      await this.checkAndRenewWebhook();
    });
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
