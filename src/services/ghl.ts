import axios from 'axios';
import { config } from '../config';
import { TokenStore } from './token-store';

export interface GHLInboundPayload {
  type: 'Custom' | 'SMS' | 'Email';
  conversationProviderId: string;
  contactId: string;
  message: string;
  attachments?: string[];
  altId?: string; // e.g. Yelp event_id or lead_id
}

export class GHLService {
  private static getAccessToken(): string {
    const saved = TokenStore.getTokens();
    if (saved && saved.ghlAccessToken) {
      return saved.ghlAccessToken;
    }
    return config.ghl.accessToken;
  }

  private static getHeaders() {
    return {
      Authorization: `Bearer ${this.getAccessToken()}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Post an inbound message into GHL Conversations
   */
  public static async postInboundMessage(payload: {
    contactId: string;
    message: string;
    leadId: string;
    eventId?: string;
  }): Promise<any> {
    const url = `${config.ghl.apiUrl}/conversations/messages/inbound`;

    // 1. If an active conversationProviderId is configured, attempt Custom channel
    if (config.ghl.conversationProviderId && config.ghl.conversationProviderId !== '') {
      try {
        const body: any = {
          type: 'Custom',
          conversationProviderId: config.ghl.conversationProviderId,
          contactId: payload.contactId,
          message: payload.message,
          altId: payload.eventId || payload.leadId,
        };
        const res = await axios.post(url, body, {
          headers: { ...this.getHeaders(), Version: '2021-04-15' },
        });
        return res.data;
      } catch (err: any) {
        // Silently fall back to native Live_Chat channel
      }
    }

    // 2. Default standard: Native Live_Chat channel directly into GHL Conversations
    const fallbackBody: any = {
      type: 'Live_Chat',
      contactId: payload.contactId,
      message: payload.message,
      altId: payload.eventId || payload.leadId,
    };

    const res = await axios.post(url, fallbackBody, {
      headers: { ...this.getHeaders(), Version: '2021-04-15' },
    });

    return res.data;
  }

  /**
   * Find an existing contact or create one if not found
   */
  public static async findOrCreateContact(details: {
    name?: string;
    email?: string;
    phone?: string;
    leadId: string;
    source?: string;
  }): Promise<string> {
    // 1. Search by email or phone (GET /contacts/search/duplicate)
    const searchUrl = `${config.ghl.apiUrl}/contacts/search/duplicate`;
    try {
      if (details.email || details.phone) {
        const params: any = {
          locationId: config.ghl.locationId,
        };
        if (details.email) params.email = details.email;
        if (details.phone) params.number = details.phone;

        const searchRes = await axios.get(searchUrl, {
          params,
          headers: this.getHeaders(),
        });

        if (searchRes.data?.contact?.id) {
          return searchRes.data.contact.id;
        }
      }
    } catch (err) {
      // Proceed to create if search finds no match
    }

    // 2. Create new contact
    const createUrl = `${config.ghl.apiUrl}/contacts/`;
    const names = (details.name || 'Yelp Customer').split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    const createPayload: any = {
      locationId: config.ghl.locationId,
      firstName,
      lastName,
      email: details.email,
      phone: details.phone,
      source: details.source || 'Yelp',
      tags: ['source: yelp', 'yelp-lead'],
      customFields: [
        {
          key: 'yelp_lead_id',
          value: details.leadId,
        },
      ],
    };

    try {
      const createRes = await axios.post(createUrl, createPayload, {
        headers: this.getHeaders(),
      });
      return createRes.data?.contact?.id;
    } catch (err: any) {
      // If contact already exists in GHL, reuse matching contactId
      if (err.response?.data?.meta?.contactId) {
        console.log(`[GHLService] Contact exists (${err.response.data.meta.contactId}), reusing existing contact.`);
        return err.response.data.meta.contactId;
      }
      throw err;
    }
  }
}
