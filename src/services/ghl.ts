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

const KNOWN_TOKENS: Record<string, string> = {
  // Jacksonville Cleaning Co
  'EKXbBmGEV6hnLQFQRPc7': 'pit-b26f30e8-7d61-4c6f-b925-2ed84ececcc0',
  // Capable Clean
  's94e80clit6bCL9VBWgl': 'pit-5cd3741b-9fde-4039-91da-c869573e74ce',
  // Ascend Cleaning
  'IdJoWa68hD3nVj45Fv7f': 'pit-96e543f6-09a3-4d38-8169-62a04c8e8382',
  // The Sparkle Squad Co (Miami)
  'ThUMNqsKmDfYKMF0jsBb': 'pit-e378012e-1c77-4b34-acb0-ddd61e22880e',
  // Sunny Side Clean Team
  'WOwi6fpdaZavuqHU8Rux': 'pit-87f6619e-b38c-47e8-b3e4-bec4e87ac9cb',
};

const KNOWN_PIPELINES: Record<string, { pipelineId: string; stageId: string }> = {
  // Capable Clean
  's94e80clit6bCL9VBWgl': {
    pipelineId: 'GM4XXE47iTC20dCxblHp',
    stageId: 'e24f6709-f5ad-4952-9ce0-d1f68ffa10f3',
  },
  // Jacksonville Cleaning Co
  'EKXbBmGEV6hnLQFQRPc7': {
    pipelineId: '7ft69hadg5z9b7YrVGpJ',
    stageId: '631f6e4a-3f34-433e-8b61-11f9c7f862d0',
  },
  // Ascend Cleaning
  'IdJoWa68hD3nVj45Fv7f': {
    pipelineId: 'byoJzgmZmdowBaThHgFO',
    stageId: '531d0cb4-0f56-41c0-87ff-8e5b17574d43', // New Leads
  },
  // The Sparkle Squad Co (Miami)
  'ThUMNqsKmDfYKMF0jsBb': {
    pipelineId: 'RhbEvMN7bsMd2bekssNc',
    stageId: '1dac1178-efc1-4f67-b508-b7fe4b0cc14b', // New Leads
  },
  // Sunny Side Clean Team
  'WOwi6fpdaZavuqHU8Rux': {
    pipelineId: 'vW4C7CoS4dMyY2tN7d5F',
    stageId: '21a4a59d-4ab7-417d-9c5f-c413a013d3df', // New Leads
  },
};

export class GHLService {
  private static getAccessToken(locationId?: string): string {
    if (locationId) {
      if (process.env.GHL_TOKENS) {
        try {
          const map = JSON.parse(process.env.GHL_TOKENS);
          if (map[locationId]) return map[locationId];
        } catch (e) {}
      }
      if (process.env[`GHL_TOKEN_${locationId}`]) {
        return process.env[`GHL_TOKEN_${locationId}`]!;
      }
      if (KNOWN_TOKENS[locationId]) {
        return KNOWN_TOKENS[locationId];
      }
    }
    const saved = TokenStore.getTokens();
    if (saved && saved.ghlAccessToken) {
      return saved.ghlAccessToken;
    }
    return config.ghl.accessToken;
  }

  private static getHeaders(locationId?: string) {
    return {
      Authorization: `Bearer ${this.getAccessToken(locationId)}`,
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
    locationId?: string;
  }): Promise<any> {
    const url = `${config.ghl.apiUrl}/conversations/messages/inbound`;
    const locId = payload.locationId || config.ghl.locationId;

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
          headers: { ...this.getHeaders(locId), Version: '2021-04-15' },
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
      headers: { ...this.getHeaders(locId), Version: '2021-04-15' },
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
    locationId?: string;
    isNewLead?: boolean;
    customFields?: Array<{ id?: string; key?: string; value: any }>;
  }): Promise<string> {
    const locId = details.locationId || config.ghl.locationId;
    const headers = this.getHeaders(locId);

    // 1. Search by email or phone (GET /contacts/search/duplicate)
    const searchUrl = `${config.ghl.apiUrl}/contacts/search/duplicate`;
    try {
      if (details.email || details.phone) {
        const params: any = {
          locationId: locId,
        };
        if (details.email) params.email = details.email;
        if (details.phone) params.number = details.phone;

        const searchRes = await axios.get(searchUrl, {
          params,
          headers,
        });

        if (searchRes.data?.contact?.id) {
          return searchRes.data.contact.id;
        }
      }
      // 2. Search by Yelp Lead ID or Name across existing contacts in the location
      if (details.leadId || (details.name && details.name !== 'Yelp Customer')) {
        const queryTerm = (details.name && details.name !== 'Yelp Customer') ? details.name.trim() : details.leadId;
        const queryRes = await axios.get(`${config.ghl.apiUrl}/contacts/`, {
          params: {
            locationId: locId,
            query: queryTerm,
          },
          headers,
        });
        const match = queryRes.data?.contacts?.find((c: any) => {
          const hasMatchingLeadId = details.leadId && c.customFields?.some((f: any) => f.value === details.leadId);
          const hasMatchingName = details.name && (
            (c.contactName && c.contactName.toLowerCase() === details.name.toLowerCase()) ||
            (c.firstName && c.firstName.toLowerCase() === details.name.split(' ')[0].toLowerCase())
          );
          return hasMatchingLeadId || hasMatchingName;
        });

        if (match?.id) {
          console.log(`[GHLService] Matched contact by leadId/name "${details.leadId || details.name}" in location ${locId} -> ${match.id}`);
          return match.id;
        }
      }
    } catch (err) {
      // Proceed to create if search finds no match
    }

    // 2. Create new contact
    const createUrl = `${config.ghl.apiUrl}/contacts/`;
    const names = (details.name || 'Yelp Customer').split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '(Yelp)';

    const defaultCustomFields = [
      {
        key: 'yelp_lead_id',
        value: details.leadId,
      },
    ];

    const createPayload: any = {
      locationId: locId,
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email: details.email,
      phone: details.phone,
      source: details.source || 'Yelp',
      tags: ['source: yelp', 'yelp-lead'],
      customFields: details.customFields && details.customFields.length > 0 
        ? [...defaultCustomFields, ...details.customFields] 
        : defaultCustomFields,
    };

    try {
      const createRes = await axios.post(createUrl, createPayload, {
        headers,
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

  /**
   * Automatically create an opportunity in the dedicated Yelp pipeline for new leads
   */
  public static async createOpportunity(params: {
    contactId: string;
    name: string;
    locationId?: string;
  }): Promise<string | null> {
    const locId = params.locationId || config.ghl.locationId;
    const pipelineConfig = KNOWN_PIPELINES[locId];
    if (!pipelineConfig) {
      console.log(`[GHLService] No dedicated Yelp pipeline configured for location ${locId}, skipping opportunity creation.`);
      return null;
    }

    try {
      const oppUrl = `${config.ghl.apiUrl}/opportunities/`;
      const res = await axios.post(oppUrl, {
        pipelineId: pipelineConfig.pipelineId,
        locationId: locId,
        name: `Yelp - ${params.name}`,
        pipelineStageId: pipelineConfig.stageId,
        status: 'open',
        contactId: params.contactId,
      }, {
        headers: this.getHeaders(locId),
      });

      const oppId = res.data?.opportunity?.id;
      console.log(`[GHLService] Created opportunity ${oppId} in pipeline ${pipelineConfig.pipelineId} -> ${pipelineConfig.stageId}`);
      return oppId;
    } catch (err: any) {
      console.error('[GHLService] Failed to create opportunity:', err.response?.data || err.message);
      return null;
    }
  }
}

