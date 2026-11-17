import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SlackWebhookService } from '../src/services/slack';
import { config } from '../src/config';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Slack 24/7 Webhook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SlackWebhookService.resetCaches();
    config.slack.signingSecret = '';
    config.slack.verificationToken = '';
    config.slack.botToken = '';
    config.slack.workspaceUrl = 'https://app.slack.com/client/T0AMMD3GYHX';
    config.telegram.botToken = 'test-tg-token';
    config.telegram.chatId = '123456';
  });

  it('should parse Slack url_verification challenge payloads', () => {
    const parsed = SlackWebhookService.parseIncomingPayload({
      type: 'url_verification',
      challenge: 'challenge_xyz_123',
      token: 'tok',
    });

    expect(parsed).toEqual({
      kind: 'challenge',
      challenge: 'challenge_xyz_123',
    });
  });

  it('should parse Slack Events API message and app_mention events', () => {
    const parsed = SlackWebhookService.parseIncomingPayload({
      type: 'event_callback',
      team_id: 'T0AMMD3GYHX',
      event_id: 'Ev001',
      event: {
        type: 'app_mention',
        channel: 'C081234',
        user: 'U091234',
        text: '<@U0BOT> Hey Jordan, is Grokbot ready?',
        ts: '1700000000.000100',
      },
    });

    expect(parsed.kind).toBe('alert');
    if (parsed.kind === 'alert') {
      expect(parsed.alert.source).toBe('events_api');
      expect(parsed.alert.eventId).toBe('Ev001');
      expect(parsed.alert.teamId).toBe('T0AMMD3GYHX');
      expect(parsed.alert.channelId).toBe('C081234');
      expect(parsed.alert.userId).toBe('U091234');
      expect(parsed.alert.eventType).toBe('app_mention');
      expect(parsed.alert.text).toContain('is Grokbot ready?');
    }
  });

  it('should ignore bot messages and message_changed subtypes', () => {
    const botMsg = SlackWebhookService.parseIncomingPayload({
      type: 'event_callback',
      event: {
        type: 'message',
        bot_id: 'B123',
        text: 'Automated bot post',
      },
    });
    expect(botMsg.kind).toBe('ignored');

    const editedMsg = SlackWebhookService.parseIncomingPayload({
      type: 'event_callback',
      event: {
        type: 'message',
        subtype: 'message_changed',
        text: 'Edited text',
      },
    });
    expect(editedMsg.kind).toBe('ignored');
  });

  it('should parse Outgoing Webhook and Zapier flat payloads', () => {
    const outgoing = SlackWebhookService.parseIncomingPayload({
      team_id: 'T0AMMD3GYHX',
      channel_id: 'C123',
      channel_name: 'zach-jacksonvillecleaningco',
      user_id: 'U456',
      user_name: 'zach',
      text: 'Can we turn on Grokbot?',
      timestamp: '1700000001.000200',
    });

    expect(outgoing.kind).toBe('alert');
    if (outgoing.kind === 'alert') {
      expect(outgoing.alert.source).toBe('outgoing_webhook');
      expect(outgoing.alert.channelName).toBe('zach-jacksonvillecleaningco');
      expect(outgoing.alert.userName).toBe('zach');
    }

    const zapier = SlackWebhookService.parseIncomingPayload({
      channel_name: 'ghl-development-chat',
      username: 'Zach Kubiak',
      message: 'Webhook test from Zapier',
      permalink: 'https://app.slack.com/client/T0AMMD3GYHX/C123',
    });

    expect(zapier.kind).toBe('alert');
    if (zapier.kind === 'alert') {
      expect(zapier.alert.source).toBe('zapier');
      expect(zapier.alert.channelName).toBe('ghl-development-chat');
      expect(zapier.alert.userName).toBe('Zach Kubiak');
      expect(zapier.alert.permalink).toBe('https://app.slack.com/client/T0AMMD3GYHX/C123');
    }
  });

  it('should deduplicate repeated eventId or channel:ts deliveries', () => {
    const alert = {
      eventId: 'Ev_DUP_1',
      source: 'events_api' as const,
      channelId: 'C123',
      text: 'Hello',
      ts: '1700000000.000100',
    };

    expect(SlackWebhookService.isDuplicate(alert)).toBe(false);
    expect(SlackWebhookService.isDuplicate(alert)).toBe(true);
  });

  it('should verify Slack HMAC signatures when SLACK_SIGNING_SECRET is configured', () => {
    config.slack.signingSecret = 'my_test_signing_secret';
    const rawBody = JSON.stringify({ type: 'url_verification', challenge: 'abc' });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = `v0=${crypto
      .createHmac('sha256', 'my_test_signing_secret')
      .update(`v0:${ts}:${rawBody}`)
      .digest('hex')}`;

    const validResult = SlackWebhookService.verifySlackRequest({
      headers: {
        'x-slack-request-timestamp': ts,
        'x-slack-signature': sig,
      },
      rawBody,
      body: { type: 'url_verification', challenge: 'abc' },
    });
    expect(validResult.valid).toBe(true);

    const invalidResult = SlackWebhookService.verifySlackRequest({
      headers: {
        'x-slack-request-timestamp': ts,
        'x-slack-signature': 'v0=0000000000000000000000000000000000000000000000000000000000000000',
      },
      rawBody,
      body: { type: 'url_verification', challenge: 'abc' },
    });
    expect(invalidResult.valid).toBe(false);
  });

  it('should resolve channel/user names when SLACK_BOT_TOKEN is set and forward alert to Telegram', async () => {
    config.slack.botToken = 'xoxb-test-token';

    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('conversations.info')) {
        return { data: { ok: true, channel: { name: 'zach-jacksonvillecleaningco' } } };
      }
      if (url.includes('users.info')) {
        return { data: { ok: true, user: { profile: { display_name: 'Zach Kubiak' } } } };
      }
      return { data: { ok: false } };
    });
    mockedAxios.post.mockResolvedValue({ data: { ok: true } });

    const ok = await SlackWebhookService.sendTelegramAlert({
      eventId: 'Ev_TG_1',
      source: 'events_api',
      teamId: 'T0AMMD3GYHX',
      channelId: 'C081234',
      userId: 'U091234',
      text: 'Grokbot check please!',
      ts: '1700000005.000100',
    });

    expect(ok).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-tg-token/sendMessage',
      expect.objectContaining({
        chat_id: '123456',
        text: expect.stringContaining('#zach-jacksonvillecleaningco'),
        reply_markup: {
          inline_keyboard: [[{ text: '🔗 Open Slack', url: 'https://app.slack.com/client/T0AMMD3GYHX/C081234' }]],
        },
      }),
      expect.anything()
    );
  });
});
