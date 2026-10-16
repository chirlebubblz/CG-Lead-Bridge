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
  // Puget Sound Cleaners
  'MucxtGIfmvLViGQWD0CG': 'pit-3e2b6d46-5ff3-472c-bd48-16ee70d76fbc',
  // Mum's Cleaning Services Chicago
  'YVtPYdLotWLwuy5AA8Vv': 'pit-f62d319a-797d-437d-bc0c-90a55d4a3dcf',
  // Ya'll Maid Austin
  '19jBWYeRsrzDq6Oe1nth': 'pit-57efb428-1952-48f1-b70b-47f681941579',
  // Rapids Cleaning Services
  '8duUHE4ENvhQTCtg3z6o': 'pit-us-19731ed6-4097-48e4-89aa-934c295b91d0',
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
  // Puget Sound Cleaners
  'MucxtGIfmvLViGQWD0CG': {
    pipelineId: '86PQ8Pz1Fo7R8oo2MTQQ',
    stageId: '8d0c1f69-1903-40db-8e92-d337792ef202', // New Leads
  },
  // Mum's Cleaning Services Chicago
  'YVtPYdLotWLwuy5AA8Vv': {
    pipelineId: 'dPOqOjXHi51iQpKKbsJP',
    stageId: '3a8a1718-05bc-40e2-8c0d-e03a7c645ad7', // New Leads
  },
  // Ya'll Maid Austin
  '19jBWYeRsrzDq6Oe1nth': {
    pipelineId: 'xxJiHoWuxh6cQUEh2aSW',
    stageId: '39091e9f-d5a9-4d11-9929-b9ef12138c1a', // New Lead
  },
  // Rapids Cleaning Services
  '8duUHE4ENvhQTCtg3z6o': {
    pipelineId: 'bHG1epKxLmE812KHzc78',
    stageId: 'b7c17a87-4ba9-4fb2-b73e-a4b63e308d42', // New Leads
  },
};

const KNOWN_INTAKE_WORKFLOWS: Record<string, string> = {
  // Jacksonville Cleaning Co
  'EKXbBmGEV6hnLQFQRPc7': 'e8b97156-510c-4a30-bd9b-12c9dd5ccc7f',
  // Capable Clean
  's94e80clit6bCL9VBWgl': '1a15dac8-d602-48a7-948e-b25103feae23',
  // Ascend Cleaning
  'IdJoWa68hD3nVj45Fv7f': '9081ebf9-bd89-4857-9621-391c79a2db7c',
  // The Sparkle Squad Co (Miami)
  'ThUMNqsKmDfYKMF0jsBb': 'de47c01d-cab0-44ea-a0ef-94e4a94dba2f',
  // Sunny Side Clean Team
  'WOwi6fpdaZavuqHU8Rux': '17ab8ca4-ce33-4925-a5dc-1ced6734db34',
  // Puget Sound Cleaners
  'MucxtGIfmvLViGQWD0CG': '7a95286d-4a43-48df-856e-122ee11c3ec9',
  // Mum's Cleaning Services Chicago
  'YVtPYdLotWLwuy5AA8Vv': 'c3be0b24-5bc7-4ff1-ad57-9dc6aeaf0467',
  // Ya'll Maid Austin
  '19jBWYeRsrzDq6Oe1nth': 'b57e3d68-e8ef-4af4-adcc-edfc88b0017b',
};

export class GHLService {
  private static recentContactCache = new Map<string, { contactId: string; timestamp: number }>();

  public static cacheContact(
    locationId: string,
    contactId: string,
    info: { leadId?: string; name?: string; email?: string; phone?: string }
  ): void {
    const now = Date.now();
    if (info.leadId && !info.leadId.startsWith('yelp_17')) {
      this.recentContactCache.set(`lead:${locationId}:${info.leadId.trim().toLowerCase()}`, { contactId, timestamp: now });
    }
    if (info.name && info.name.trim().toLowerCase() !== 'yelp customer') {
      this.recentContactCache.set(`name:${locationId}:${info.name.trim().toLowerCase()}`, { contactId, timestamp: now });
    }
    if (info.email) {
      this.recentContactCache.set(`email:${locationId}:${info.email.trim().toLowerCase()}`, { contactId, timestamp: now });
    }
    if (info.phone) {
      const digits = info.phone.replace(/[^0-9]/g, '').slice(-10);
      if (digits.length === 10) {
        this.recentContactCache.set(`phone:${locationId}:${digits}`, { contactId, timestamp: now });
      }
    }
  }

  public static getCachedContact(
    locationId: string,
    info: { leadId?: string; name?: string; email?: string; phone?: string }
  ): string | null {
    const ttl = 60 * 60 * 1000; // 60 minutes
    const now = Date.now();
    const keys: string[] = [];

    if (info.leadId && !info.leadId.startsWith('yelp_17')) {
      keys.push(`lead:${locationId}:${info.leadId.trim().toLowerCase()}`);
    }
    if (info.email) {
      keys.push(`email:${locationId}:${info.email.trim().toLowerCase()}`);
    }
    if (info.phone) {
      const digits = info.phone.replace(/[^0-9]/g, '').slice(-10);
      if (digits.length === 10) keys.push(`phone:${locationId}:${digits}`);
    }
    if (info.name && info.name.trim().toLowerCase() !== 'yelp customer') {
      keys.push(`name:${locationId}:${info.name.trim().toLowerCase()}`);
    }

    for (const k of keys) {
      const entry = this.recentContactCache.get(k);
      if (entry && now - entry.timestamp < ttl) {
        console.log(`[GHLService] Instant cache hit (${k}) -> ${entry.contactId}`);
        return entry.contactId;
      }
    }
    return null;
  }

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
   * Fetch a contact by ID
   */
  public static async getContact(contactId: string, locationId?: string): Promise<any> {
    const locId = locationId || config.ghl.locationId;
    const url = `${config.ghl.apiUrl}/contacts/${contactId}`;
    const res = await axios.get(url, { headers: this.getHeaders(locId) });
    return res.data?.contact || null;
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
   * Explicitly apply tags via /contacts/:id/tags and enroll in Master Intake workflow
   * Runs after a brief delay so any initial inbound message bubble is posted first
   * without triggering 'Stop on Response' prematurely.
   */
  public static triggerTagsAndWorkflow(contactId: string, locationId: string, tags: string[] = ['source: yelp', 'yelp-lead']): void {
    const headers = this.getHeaders(locationId);
    setTimeout(async () => {
      try {
        await axios.post(
          `${config.ghl.apiUrl}/contacts/${contactId}/tags`,
          { tags },
          { headers }
        );
      } catch (e: any) {
        console.warn(`[GHLService] Post-creation tag apply note for ${contactId}:`, e.response?.data || e.message);
      }

      const workflowId = KNOWN_INTAKE_WORKFLOWS[locationId];
      if (workflowId) {
        try {
          await axios.post(
            `${config.ghl.apiUrl}/contacts/${contactId}/workflow/${workflowId}`,
            {},
            { headers }
          );
          console.log(`[GHLService] Enrolled contact ${contactId} into intake workflow ${workflowId} (loc: ${locationId})`);
        } catch (e: any) {
          console.warn(`[GHLService] Workflow enrollment note for ${contactId}:`, e.response?.data || e.message);
        }
      }
    }, 2500);
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

    // 0. Zero-latency in-memory cache check (bypasses GHL's 10-15s Elasticsearch indexing delay)
    const cachedId = this.getCachedContact(locId, details);
    if (cachedId) {
      this.cacheContact(locId, cachedId, details);
      return cachedId;
    }

    // 1. First priority: Scan 50 most recent contacts directly
    // Matches by exact Yelp Lead ID in custom fields OR by exact full name on recent Yelp leads
    try {
      const recentRes = await axios.get(`${config.ghl.apiUrl}/contacts/`, {
        params: { locationId: locId, limit: 50 },
        headers,
      });
      const recentContacts: any[] = recentRes.data?.contacts || [];

      if (details.leadId) {
        const targetLeadId = details.leadId.trim().toLowerCase();
        const matchedByLeadId = recentContacts.find((c: any) =>
          c.customFields?.some((f: any) => typeof f.value === 'string' && f.value.trim().toLowerCase() === targetLeadId) ||
          (c.email && c.email.toLowerCase().includes(targetLeadId))
        );
        if (matchedByLeadId?.id) {
          console.log(`[GHLService] Matched contact by customField/email yelp_lead_id "${details.leadId}" in location ${locId} -> ${matchedByLeadId.id}`);
          this.cacheContact(locId, matchedByLeadId.id, details);
          return matchedByLeadId.id;
        }
      }

      if (details.name && details.name !== 'Yelp Customer') {
        const cleanTarget = details.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const tenMinsAgo = Date.now() - 10 * 60 * 1000;

        const matchedByRecentName = recentContacts.find((c: any) => {
          const full = (c.contactName || `${c.firstName || ''} ${c.lastName || ''}`);
          const cleanFull = full.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const isNameMatch = cleanFull === cleanTarget && cleanTarget.length > 2;

          const created = c.dateAdded ? new Date(c.dateAdded).getTime() : 0;
          const isWithinWindow = created >= tenMinsAgo;

          return isNameMatch && isWithinWindow;
        });

        if (matchedByRecentName?.id) {
          console.log(`[GHLService] Matched recent contact by name & time window "${details.name}" (${matchedByRecentName.dateAdded}) in location ${locId} -> ${matchedByRecentName.id}`);
          this.cacheContact(locId, matchedByRecentName.id, details);
          return matchedByRecentName.id;
        }
      }

      // Check 3: Customer notes/request or questionnaire fingerprint matching (created within last 30 minutes)
      const incomingNotesField = details.customFields?.find((f: any) =>
        f.key === 'yelp_notes__customer_request' || f.id === 'DgCDxzJcWvEs7qjpxzbg'
      );
      const incomingNotes = incomingNotesField?.value;
      if (incomingNotes && typeof incomingNotes === 'string' && incomingNotes.length > 20) {
        const cleanIncoming = incomingNotes.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;

        const matchedByNotes = recentContacts.find((c: any) => {
          const created = c.dateAdded ? new Date(c.dateAdded).getTime() : 0;
          if (created < thirtyMinsAgo) return false;

          const existingNoteField = c.customFields?.find((f: any) =>
            f.id === 'DgCDxzJcWvEs7qjpxzbg' || (typeof f.value === 'string' && f.value.length > 20)
          );
          if (!existingNoteField?.value || typeof existingNoteField.value !== 'string') return false;

          const cleanExisting = existingNoteField.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          return (
            (cleanExisting.includes(cleanIncoming) || cleanIncoming.includes(cleanExisting)) &&
            Math.min(cleanExisting.length, cleanIncoming.length) > 25
          );
        });

        if (matchedByNotes?.id) {
          console.log(`[GHLService] Matched recent contact by customer request notes fingerprint in location ${locId} -> ${matchedByNotes.id}`);
          this.cacheContact(locId, matchedByNotes.id, details);
          return matchedByNotes.id;
        }
      }
    } catch (err) {
      // Continue to next tier
    }

    // 2. Search by email or phone (GET /contacts/search/duplicate)
    if (details.email || details.phone) {
      try {
        const searchUrl = `${config.ghl.apiUrl}/contacts/search/duplicate`;
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
          this.cacheContact(locId, searchRes.data.contact.id, details);
          return searchRes.data.contact.id;
        }
      } catch (err) {
        // Continue to next tier
      }
    }

    // 3. Search by Name across existing indexed contacts in the location
    if (details.name && details.name !== 'Yelp Customer') {
      try {
        const queryTerm = details.name.trim();
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
          this.cacheContact(locId, match.id, details);
          return match.id;
        }
      } catch (err) {
        // Proceed to create if search finds no match
      }
    }

    // 4. Create new contact
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
      const newContactId = createRes.data?.contact?.id;
      if (newContactId) {
        this.cacheContact(locId, newContactId, details);
        this.triggerTagsAndWorkflow(newContactId, locId, ['source: yelp', 'yelp-lead']);
      }
      return newContactId;
    } catch (err: any) {
      // If contact already exists in GHL, reuse matching contactId
      if (err.response?.data?.meta?.contactId) {
        console.log(`[GHLService] Contact exists (${err.response.data.meta.contactId}), reusing existing contact.`);
        this.cacheContact(locId, err.response.data.meta.contactId, details);
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
      // Deduplication check: Check if an opportunity already exists for this contact in this pipeline
      const searchUrl = `${config.ghl.apiUrl}/opportunities/search`;
      const searchRes = await axios.get(searchUrl, {
        params: {
          location_id: locId,
          contact_id: params.contactId,
        },
        headers: this.getHeaders(locId),
      });

      const existingOpp = searchRes.data?.opportunities?.find(
        (o: any) => o.pipelineId === pipelineConfig.pipelineId
      );
      if (existingOpp) {
        console.log(`[GHLService] Opportunity ${existingOpp.id} already exists for contact ${params.contactId} in pipeline ${pipelineConfig.pipelineId}. Skipping duplicate creation.`);
        return existingOpp.id;
      }

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

  /**
   * Smart Upsert: Reconciles by Yelp Lead ID first, or falls back to sanitized GHL /contacts/upsert
   */
  public static async smartUpsertContact(
    payload: Record<string, any>,
    leadId?: string,
    authHeader?: string
  ): Promise<string> {
    const locId = payload.locationId || config.ghl.locationId;
    const headers = authHeader
      ? { Authorization: authHeader, Version: '2021-07-28', 'Content-Type': 'application/json' }
      : this.getHeaders(locId);

    // 0. Zero-latency in-memory cache check (bypasses GHL's 10-15s Elasticsearch indexing delay)
    const cacheInfo = {
      leadId,
      name: payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim(),
      email: payload.email,
      phone: payload.phone,
    };
    const cachedId = this.getCachedContact(locId, cacheInfo);
    if (cachedId) {
      try {
        const updateBody: Record<string, any> = {};
        if (payload.phone) updateBody.phone = payload.phone;
        if (payload.name) updateBody.name = payload.name;
        if (payload.firstName) updateBody.firstName = payload.firstName;
        if (payload.lastName) updateBody.lastName = payload.lastName;
        if (Array.isArray(payload.customFields) && payload.customFields.length > 0) {
          updateBody.customFields = payload.customFields;
        }
        await axios.put(`${config.ghl.apiUrl}/contacts/${cachedId}`, updateBody, { headers });
        if (Array.isArray(payload.tags) && payload.tags.length > 0) {
          await axios.post(
            `${config.ghl.apiUrl}/contacts/${cachedId}/tags`,
            { tags: payload.tags },
            { headers }
          );
        }
        this.cacheContact(locId, cachedId, cacheInfo);
        console.log(`[GHLService] SmartUpsert updated cached contact ${cachedId}`);
        return cachedId;
      } catch (e) {
        // Fall through if cached contact update fails
      }
    }

    // 1. Try matching existing contact by Yelp Lead ID inside customFields across recent contacts
    if (leadId) {
      try {
        const queryRes = await axios.get(`${config.ghl.apiUrl}/contacts/`, {
          params: { locationId: locId, limit: 50 },
          headers,
        });
        const targetLeadId = leadId.trim().toLowerCase();
        const match = (queryRes.data?.contacts || []).find((c: any) =>
          c.customFields?.some((f: any) => typeof f.value === 'string' && f.value.trim().toLowerCase() === targetLeadId) ||
          (c.email && c.email.toLowerCase().includes(targetLeadId))
        );
        if (match?.id) {
          const updateBody: Record<string, any> = {};
          if (payload.phone) updateBody.phone = payload.phone;
          if (payload.name) updateBody.name = payload.name;
          if (payload.firstName) updateBody.firstName = payload.firstName;
          if (payload.lastName) updateBody.lastName = payload.lastName;
          if (!match.email && payload.email) updateBody.email = payload.email;
          if (Array.isArray(payload.customFields) && payload.customFields.length > 0) {
            updateBody.customFields = payload.customFields;
          }

          await axios.put(`${config.ghl.apiUrl}/contacts/${match.id}`, updateBody, { headers });

          if (Array.isArray(payload.tags) && payload.tags.length > 0) {
            await axios.post(
              `${config.ghl.apiUrl}/contacts/${match.id}/tags`,
              { tags: payload.tags },
              { headers }
            );
          }
          this.cacheContact(locId, match.id, cacheInfo);
          console.log(`[GHLService] SmartUpsert updated existing contact ${match.id} by leadId ${leadId}`);
          return match.id;
        }

        // Secondary check in queryRes: same normalized name created in last 10 minutes
        const candidateName = payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim();
        if (candidateName && candidateName.toLowerCase() !== 'yelp customer') {
          const cleanTarget = candidateName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const tenMinsAgo = Date.now() - 10 * 60 * 1000;
          const nameMatch = (queryRes.data?.contacts || []).find((c: any) => {
            const full = (c.contactName || `${c.firstName || ''} ${c.lastName || ''}`);
            const cleanFull = full.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const created = c.dateAdded ? new Date(c.dateAdded).getTime() : 0;
            return cleanFull === cleanTarget && cleanTarget.length > 2 && created >= tenMinsAgo;
          });
          if (nameMatch?.id) {
            const updateBody: Record<string, any> = {};
            if (payload.phone) updateBody.phone = payload.phone;
            if (Array.isArray(payload.customFields) && payload.customFields.length > 0) {
              updateBody.customFields = payload.customFields;
            }
            await axios.put(`${config.ghl.apiUrl}/contacts/${nameMatch.id}`, updateBody, { headers });
            this.cacheContact(locId, nameMatch.id, cacheInfo);
            console.log(`[GHLService] SmartUpsert matched recent contact ${nameMatch.id} by name & time window "${candidateName}"`);
            return nameMatch.id;
          }
        }

        // Tertiary check in queryRes: same customer request notes / questionnaire fingerprint
        const incomingNotesField = Array.isArray(payload.customFields)
          ? payload.customFields.find((f: any) => f.key === 'yelp_notes__customer_request' || f.id === 'DgCDxzJcWvEs7qjpxzbg')
          : undefined;
        const incomingNotes = incomingNotesField?.value;
        if (incomingNotes && typeof incomingNotes === 'string' && incomingNotes.length > 20) {
          const cleanIncoming = incomingNotes.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
          const notesMatch = (queryRes.data?.contacts || []).find((c: any) => {
            const created = c.dateAdded ? new Date(c.dateAdded).getTime() : 0;
            if (created < thirtyMinsAgo) return false;
            const existingNote = c.customFields?.find((f: any) =>
              f.id === 'DgCDxzJcWvEs7qjpxzbg' || (typeof f.value === 'string' && f.value.length > 20)
            );
            if (!existingNote?.value || typeof existingNote.value !== 'string') return false;
            const cleanExisting = existingNote.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            return (
              (cleanExisting.includes(cleanIncoming) || cleanIncoming.includes(cleanExisting)) &&
              Math.min(cleanExisting.length, cleanIncoming.length) > 25
            );
          });
          if (notesMatch?.id) {
            const updateBody: Record<string, any> = {};
            if (payload.phone) updateBody.phone = payload.phone;
            if (Array.isArray(payload.customFields) && payload.customFields.length > 0) {
              updateBody.customFields = payload.customFields;
            }
            await axios.put(`${config.ghl.apiUrl}/contacts/${notesMatch.id}`, updateBody, { headers });
            this.cacheContact(locId, notesMatch.id, cacheInfo);
            console.log(`[GHLService] SmartUpsert matched recent contact ${notesMatch.id} by notes fingerprint`);
            return notesMatch.id;
          }
        }
      } catch (e) {
        // Fall through to next tier
      }
    }

    // 2. If email is missing (Yelp sent "Temporary Email: No data") and no leadId matched,
    // check if there is a recent Yelp contact (created in the last 30 mins) that still has no phone number
    if (!payload.email && payload.phone) {
      try {
        const recentRes = await axios.get(`${config.ghl.apiUrl}/contacts/`, {
          params: { locationId: locId, query: 'leadsapi', limit: 10 },
          headers,
        });
        const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
        const recentUnphoned = (recentRes.data?.contacts || []).find((c: any) => {
          const created = c.dateAdded ? new Date(c.dateAdded).getTime() : 0;
          return !c.phone && created >= thirtyMinsAgo;
        });

        if (recentUnphoned?.id) {
          const updateBody: Record<string, any> = { phone: payload.phone };
          if (Array.isArray(payload.customFields) && payload.customFields.length > 0) {
            updateBody.customFields = payload.customFields;
          }
          await axios.put(`${config.ghl.apiUrl}/contacts/${recentUnphoned.id}`, updateBody, { headers });
          if (Array.isArray(payload.tags) && payload.tags.length > 0) {
            await axios.post(
              `${config.ghl.apiUrl}/contacts/${recentUnphoned.id}/tags`,
              { tags: payload.tags },
              { headers }
            );
          }
          this.cacheContact(locId, recentUnphoned.id, cacheInfo);
          console.log(`[GHLService] SmartUpsert matched recent un-phoned Yelp contact ${recentUnphoned.id}`);
          return recentUnphoned.id;
        }
      } catch (e) {
        // Fall through to native upsert
      }
    }

    // 3. Native GHL /contacts/upsert with sanitized payload (uses email if present, or phone if email was empty)
    const res = await axios.post(`${config.ghl.apiUrl}/contacts/upsert`, payload, { headers });
    const contactId = res.data?.contact?.id;
    if (contactId) {
      this.cacheContact(locId, contactId, cacheInfo);
      if (Array.isArray(payload.tags) && (payload.tags.includes('source: yelp') || payload.tags.includes('yelp-lead'))) {
        this.triggerTagsAndWorkflow(contactId, locId, payload.tags);
        this.createOpportunity({
          contactId,
          name: payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || 'Yelp Customer',
          locationId: locId,
        }).catch(e => console.warn('[GHLService] Auto opp creation note:', e.message));
      }
    }
    return contactId;
  }
}


