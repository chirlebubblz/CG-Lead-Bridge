import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config';

export interface SlackAlertPayload {
  eventId?: string;
  source: 'events_api' | 'outgoing_webhook' | 'zapier';
  teamId?: string;
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  text: string;
  ts?: string;
  threadTs?: string;
  permalink?: string;
  eventType?: string;
}

export type ParsedSlackWebhook =
  | { kind: 'challenge'; challenge: string }
  | { kind: 'ignored'; reason: string }
  | { kind: 'alert'; alert: SlackAlertPayload };

const IGNORED_SUBTYPES = new Set([
  'bot_message',
  'message_changed',
  'message_deleted',
  'channel_join',
  'channel_leave',
  'channel_topic',
  'channel_purpose',
  'channel_name',
  'channel_archive',
  'channel_unarchive',
]);

const MAX_RECENT_EVENTS = 500;
const recentEventSet = new Set<string>();
const recentEventQueue: string[] = [];

const channelNameCache = new Map<string, string>();
const userNameCache = new Map<string, string>();

export class SlackWebhookService {
  /**
   * Reset in-memory dedup & lookup caches (primarily for unit testing).
   */
  public static resetCaches(): void {
    recentEventSet.clear();
    recentEventQueue.length = 0;
    channelNameCache.clear();
    userNameCache.clear();
  }

  /**
   * Verifies Slack request authenticity when SLACK_SIGNING_SECRET or SLACK_VERIFICATION_TOKEN is set.
   */
  public static verifySlackRequest(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody?: Buffer | string;
    body?: any;
  }): { valid: boolean; reason?: string } {
    const signingSecret = config.slack.signingSecret;
    const verificationToken = config.slack.verificationToken;

    const sigHeader = this.getHeader(params.headers, 'x-slack-signature');
    const tsHeader = this.getHeader(params.headers, 'x-slack-request-timestamp');

    if (signingSecret && sigHeader) {
      if (!tsHeader || !params.rawBody) {
        return { valid: false, reason: 'Missing Slack timestamp or raw body for signature verification' };
      }

      const tsNum = Number(tsHeader);
      const nowSec = Math.floor(Date.now() / 1000);
      if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > 300) {
        return { valid: false, reason: 'Slack request timestamp expired or invalid' };
      }

      const rawStr = typeof params.rawBody === 'string' ? params.rawBody : params.rawBody.toString('utf8');
      const baseString = `v0:${tsHeader}:${rawStr}`;
      const computed = `v0=${crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex')}`;

      const computedBuf = Buffer.from(computed, 'utf8');
      const headerBuf = Buffer.from(sigHeader, 'utf8');
      if (computedBuf.length !== headerBuf.length || !crypto.timingSafeEqual(computedBuf, headerBuf)) {
        return { valid: false, reason: 'Invalid Slack HMAC signature' };
      }
    }

    if (verificationToken && params.body?.token && params.body.token !== verificationToken) {
      return { valid: false, reason: 'Invalid Slack verification token' };
    }

    return { valid: true };
  }

  /**
   * Parses Slack Events API, Outgoing Webhook, and Zapier/custom webhook payloads.
   */
  public static parseIncomingPayload(body: any): ParsedSlackWebhook {
    if (!body || typeof body !== 'object') {
      return { kind: 'ignored', reason: 'Empty or non-object payload' };
    }

    // 1. Slack Events API URL verification handshake
    if (body.type === 'url_verification' && typeof body.challenge === 'string') {
      return { kind: 'challenge', challenge: body.challenge };
    }

    // 2. Slack Events API event_callback
    if (body.type === 'event_callback' && body.event && typeof body.event === 'object') {
      const ev = body.event;
      const eventType = String(ev.type || '');

      if (!['message', 'app_mention'].includes(eventType)) {
        return { kind: 'ignored', reason: `Unsupported event type: ${eventType}` };
      }

      if (ev.bot_id || (ev.subtype && IGNORED_SUBTYPES.has(String(ev.subtype)))) {
        return { kind: 'ignored', reason: `Ignored bot or system subtype: ${ev.subtype || 'bot_id'}` };
      }

      const text = String(ev.text || '').trim();
      if (!text) {
        return { kind: 'ignored', reason: 'Empty Slack event message text' };
      }

      return {
        kind: 'alert',
        alert: {
          eventId: body.event_id ? String(body.event_id) : undefined,
          source: 'events_api',
          teamId: body.team_id ? String(body.team_id) : undefined,
          channelId: ev.channel ? String(ev.channel) : undefined,
          channelName: ev.channel_name ? String(ev.channel_name) : undefined,
          userId: ev.user ? String(ev.user) : undefined,
          userName: ev.username ? String(ev.username) : undefined,
          text,
          ts: ev.ts ? String(ev.ts) : undefined,
          threadTs: ev.thread_ts ? String(ev.thread_ts) : undefined,
          eventType,
        },
      };
    }

    // 3. Slack Outgoing Webhook or Zapier / Custom Slack Webhook payload
    const text = String(body.text || body.message || body.body || '').trim();
    if (!text) {
      return { kind: 'ignored', reason: 'No message text in payload' };
    }

    const userName = body.user_name || body.username || body.sender_name || body.author;
    if (body.bot_id || String(userName || '').toLowerCase() === 'slackbot') {
      return { kind: 'ignored', reason: 'Ignored slackbot/bot message' };
    }

    const isOutgoing = Boolean(body.channel_id && body.user_id && body.timestamp !== undefined);
    return {
      kind: 'alert',
      alert: {
        eventId: body.event_id ? String(body.event_id) : undefined,
        source: isOutgoing ? 'outgoing_webhook' : 'zapier',
        teamId: body.team_id ? String(body.team_id) : undefined,
        channelId: body.channel_id || body.channel ? String(body.channel_id || body.channel) : undefined,
        channelName: body.channel_name ? String(body.channel_name) : undefined,
        userId: body.user_id || body.user ? String(body.user_id || body.user) : undefined,
        userName: userName ? String(userName) : undefined,
        text,
        ts: body.ts || body.timestamp ? String(body.ts || body.timestamp) : undefined,
        threadTs: body.thread_ts ? String(body.thread_ts) : undefined,
        permalink: body.permalink || body.url ? String(body.permalink || body.url) : undefined,
        eventType: body.event_type ? String(body.event_type) : 'message',
      },
    };
  }

  /**
   * Deduplicates repeated Slack deliveries (e.g., Slack 3s retries or duplicate webhooks).
   */
  public static isDuplicate(alert: SlackAlertPayload): boolean {
    const dedupKey = alert.eventId || (alert.channelId && alert.ts ? `${alert.channelId}:${alert.ts}` : '');
    if (!dedupKey) {
      return false;
    }

    if (recentEventSet.has(dedupKey)) {
      return true;
    }

    recentEventSet.add(dedupKey);
    recentEventQueue.push(dedupKey);
    if (recentEventQueue.length > MAX_RECENT_EVENTS) {
      const oldest = recentEventQueue.shift();
      if (oldest) {
        recentEventSet.delete(oldest);
      }
    }
    return false;
  }

  /**
   * Optionally resolves channel & user display names via Slack Web API when SLACK_BOT_TOKEN is configured.
   */
  public static async resolveSlackNames(alert: SlackAlertPayload): Promise<SlackAlertPayload> {
    const botToken = config.slack.botToken;
    if (!botToken) {
      return alert;
    }

    const enriched = { ...alert };

    if (!enriched.channelName && enriched.channelId && /^[CDG][A-Z0-9]+$/.test(enriched.channelId)) {
      if (channelNameCache.has(enriched.channelId)) {
        enriched.channelName = channelNameCache.get(enriched.channelId);
      } else {
        try {
          const resp = await axios.get('https://slack.com/api/conversations.info', {
            params: { channel: enriched.channelId },
            headers: { Authorization: `Bearer ${botToken}` },
            timeout: 5000,
          });
          const name = resp.data?.channel?.name;
          if (resp.data?.ok && name) {
            channelNameCache.set(enriched.channelId, name);
            enriched.channelName = name;
          }
        } catch (err: any) {
          console.warn('[SlackWebhookService] Channel name lookup skipped:', err.message);
        }
      }
    }

    if (!enriched.userName && enriched.userId && /^[UW][A-Z0-9]+$/.test(enriched.userId)) {
      if (userNameCache.has(enriched.userId)) {
        enriched.userName = userNameCache.get(enriched.userId);
      } else {
        try {
          const resp = await axios.get('https://slack.com/api/users.info', {
            params: { user: enriched.userId },
            headers: { Authorization: `Bearer ${botToken}` },
            timeout: 5000,
          });
          const userObj = resp.data?.user;
          const displayName = userObj?.profile?.display_name || userObj?.real_name || userObj?.name;
          if (resp.data?.ok && displayName) {
            userNameCache.set(enriched.userId, displayName);
            enriched.userName = displayName;
          }
        } catch (err: any) {
          console.warn('[SlackWebhookService] User name lookup skipped:', err.message);
        }
      }
    }

    return enriched;
  }

  /**
   * Builds the Slack deep link URL and Telegram notification body.
   */
  public static formatTelegramAlert(alert: SlackAlertPayload): { text: string; slackUrl: string } {
    const channelDisplay = alert.channelName
      ? `#${alert.channelName.replace(/^#/, '')}`
      : (alert.channelId || 'unknown-channel');
    const userDisplay = alert.userName || alert.userId || 'Slack User';

    const slackUrl = alert.permalink
      || (alert.teamId && alert.channelId
        ? `https://app.slack.com/client/${alert.teamId}/${alert.channelId}`
        : config.slack.workspaceUrl);

    const previewText = alert.text.length > 3000 ? `${alert.text.slice(0, 2997)}...` : alert.text;

    const lines = [
      '💬 [Slack 24/7 Alert]',
      `📌 Channel: ${channelDisplay}`,
      `👤 From: ${userDisplay}`,
    ];

    if (alert.eventType === 'app_mention') {
      lines.push('🔔 Mention: You/app were mentioned');
    }
    if (alert.threadTs && alert.ts && alert.threadTs !== alert.ts) {
      lines.push('🧵 Thread reply');
    }

    lines.push('', '📝 Message:', previewText);

    return {
      text: lines.join('\n'),
      slackUrl,
    };
  }

  /**
   * Forwards a normalized Slack alert to Telegram using TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
   */
  public static async sendTelegramAlert(alert: SlackAlertPayload): Promise<boolean> {
    const botToken = config.telegram.botToken;
    const chatId = config.telegram.chatId;

    if (!botToken || !chatId) {
      console.warn('[SlackWebhookService] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured — skipping Telegram send.');
      return false;
    }

    const enriched = await this.resolveSlackNames(alert);
    const { text, slackUrl } = this.formatTelegramAlert(enriched);

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[{ text: '🔗 Open Slack', url: slackUrl }]],
      },
    };

    const resp = await axios.post(url, payload, { timeout: 10000 });
    return Boolean(resp.data?.ok);
  }

  private static getHeader(
    headers: Record<string, string | string[] | undefined>,
    key: string
  ): string | undefined {
    const val = headers[key] ?? headers[key.toLowerCase()];
    return Array.isArray(val) ? val[0] : val;
  }
}
