import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  ghl: {
    clientId: process.env.GHL_CLIENT_ID || '',
    clientSecret: process.env.GHL_CLIENT_SECRET || '',
    locationId: process.env.GHL_LOCATION_ID || '',
    conversationProviderId: process.env.GHL_CONVERSATION_PROVIDER_ID || '',
    accessToken: process.env.GHL_ACCESS_TOKEN || '',
    apiUrl: 'https://services.leadconnectorhq.com',
  },

  yelp: {
    clientId: process.env.YELP_CLIENT_ID || '',
    clientSecret: process.env.YELP_CLIENT_SECRET || '',
    businessId: process.env.YELP_BUSINESS_ID || '',
    accessToken: process.env.YELP_ACCESS_TOKEN || '',
    refreshToken: process.env.YELP_REFRESH_TOKEN || '',
    apiUrl: 'https://api.yelp.com/v3',
  },

  thumbtack: {
    accessToken: process.env.THUMBTACK_ACCESS_TOKEN || '',
    businessId: process.env.THUMBTACK_BUSINESS_ID || '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  slack: {
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    verificationToken: process.env.SLACK_VERIFICATION_TOKEN || '',
    botToken: process.env.SLACK_BOT_TOKEN || '',
    workspaceUrl: process.env.SLACK_WORKSPACE_URL || 'https://app.slack.com/client/T0AMMD3GYHX',
  }
};
