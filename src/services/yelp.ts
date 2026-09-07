import axios from 'axios';
import { config } from '../config';
import { TokenStore } from './token-store';

export interface YelpLeadDetails {
  id: string;
  display_name?: string;
  temporary_email_address?: string;
  temporary_email_address_expiry?: string;
  phone_number?: string;
  user_phone_number?: string;
  conversation_status?: string;
  business_id?: string;
  link_to_reply_in_yelp?: string;
}

export interface YelpEvent {
  event_id: string;
  lead_id: string;
  event_type: 'NEW_EVENT' | 'TEXT' | string;
  user_type: 'CONSUMER' | 'BIZ';
  channel?: 'API-SELF' | 'SMS' | string;
  text?: string;
  time_created?: string;
}

export class YelpService {
  private static getAccessToken(): string {
    const saved = TokenStore.getTokens();
    if (saved && saved.accessToken) {
      return saved.accessToken;
    }
    return config.yelp.accessToken;
  }

  /**
   * Refresh OAuth token using refresh_token grant
   */
  public static async refreshAccessToken(): Promise<string> {
    const saved = TokenStore.getTokens();
    const refreshToken = saved?.refreshToken || config.yelp.refreshToken;

    if (!refreshToken) {
      throw new Error('[YelpService] No refresh token available to renew access token.');
    }

    const response = await axios.post(
      'https://api.yelp.com/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.yelp.clientId,
        client_secret: config.yelp.clientSecret,
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;
    const expiresAt = Date.now() + expires_in * 1000;

    TokenStore.saveTokens({
      accessToken: access_token,
      refreshToken: newRefreshToken || refreshToken,
      expiresAt,
    });

    return access_token;
  }

  /**
   * Fetch full lead details by lead ID
   */
  public static async getLead(leadId: string): Promise<YelpLeadDetails> {
    const token = this.getAccessToken();
    const url = `${config.yelp.apiUrl}/leads/${leadId}`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data;
  }

  /**
   * Fetch all messages / events for a lead
   */
  public static async getLeadEvents(leadId: string): Promise<YelpEvent[]> {
    const token = this.getAccessToken();
    const url = `${config.yelp.apiUrl}/leads/${leadId}/events`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data.events || [];
  }

  /**
   * Send a reply to a consumer on Yelp via the API
   * (Enforces plain text as required by Yelp's API)
   */
  public static async sendReply(leadId: string, messageText: string): Promise<any> {
    const token = this.getAccessToken();
    const url = `${config.yelp.apiUrl}/leads/${leadId}/events`;

    // Sanitize message: strip HTML tags and signatures
    const plainText = this.stripHtml(messageText);

    const payload = {
      event_type: 'TEXT',
      text: plainText,
    };

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return res.data;
  }

  /**
   * Subscribe to Yelp self-serve webhooks (14-day lifespan)
   */
  public static async subscribeWebhook(targetUrl: string): Promise<{ webhookId: string; expirationDate: string }> {
    const token = this.getAccessToken();
    const url = `${config.yelp.apiUrl}/webhooks`;

    const payload = {
      webhook_url: targetUrl,
      webhook_type: 'leads_event',
    };

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const webhookId = res.data.webhook_id;
    const expirationDate = res.data.expiration_date;

    TokenStore.saveTokens({
      webhookId,
      webhookExpiresAt: new Date(expirationDate).getTime(),
    });

    return { webhookId, expirationDate };
  }

  /**
   * Unsubscribe from an existing webhook
   */
  public static async unsubscribeWebhook(webhookId: string): Promise<void> {
    const token = this.getAccessToken();
    const url = `${config.yelp.apiUrl}/webhooks/${webhookId}`;

    await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Strips HTML tags, email tracking artifacts, and trailing whitespace
   */
  public static stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*[\/]?>/gi, ' ')
      .replace(/<\/(p|div|h[1-6]|li)>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
