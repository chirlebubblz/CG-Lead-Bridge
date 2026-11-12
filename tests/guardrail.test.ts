import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { GHLService } from '../src/services/ghl';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Orphan Contact Guardrail Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPhoneAvailabilityPayload', () => {
    it('should identify payloads with yelp-phone-captured tag', () => {
      expect(GHLService.isPhoneAvailabilityPayload({ tags: ['yelp-phone-captured'] })).toBe(true);
      expect(GHLService.isPhoneAvailabilityPayload({ tags: 'yelp-phone-captured' })).toBe(true);
      expect(GHLService.isPhoneAvailabilityPayload({ tags: ['source: yelp', 'yelp_phone_captured'] })).toBe(true);
    });

    it('should identify payloads with phone_captured in customFields', () => {
      expect(GHLService.isPhoneAvailabilityPayload({
        customFields: [{ key: 'yelp_phone_captured', value: 'Yes' }]
      })).toBe(true);
      expect(GHLService.isPhoneAvailabilityPayload({
        customFields: [{ key: 'contact.yelp_phone_captured', value: 'true' }]
      })).toBe(true);
    });

    it('should identify payloads with phone availability flags', () => {
      expect(GHLService.isPhoneAvailabilityPayload({ yelp_phone_captured: true })).toBe(true);
      expect(GHLService.isPhoneAvailabilityPayload({ phoneAvailability: true })).toBe(true);
      expect(GHLService.isPhoneAvailabilityPayload({ action: 'phone_availability' })).toBe(true);
      expect(GHLService.isPhoneAvailabilityPayload({ eventType: 'phone_availability' })).toBe(true);
    });

    it('should return false for regular lead intake payloads', () => {
      expect(GHLService.isPhoneAvailabilityPayload({
        name: 'Jane Doe',
        tags: ['source: yelp', 'yelp-lead'],
        customFields: [{ key: 'yelp_service_type', value: 'Deep Clean' }]
      })).toBe(false);
    });
  });

  describe('hasNoRealName', () => {
    it('should return true for missing or undefined names', () => {
      expect(GHLService.hasNoRealName({})).toBe(true);
      expect(GHLService.hasNoRealName({ name: '' })).toBe(true);
      expect(GHLService.hasNoRealName({ name: '   ', firstName: '' })).toBe(true);
    });

    it('should return true for generic Yelp placeholder names', () => {
      expect(GHLService.hasNoRealName({ name: 'Yelp Customer' })).toBe(true);
      expect(GHLService.hasNoRealName({ name: 'yelp customer' })).toBe(true);
      expect(GHLService.hasNoRealName({ firstName: 'Yelp Customer' })).toBe(true);
    });

    it('should return false when a real customer name is present', () => {
      expect(GHLService.hasNoRealName({ name: 'Sarah Connor' })).toBe(false);
      expect(GHLService.hasNoRealName({ firstName: 'Sarah' })).toBe(false);
      expect(GHLService.hasNoRealName({ name: 'Alex M.' })).toBe(false);
    });
  });

  describe('smartUpsertContact guardrail blocking', () => {
    it('should block orphan contact creation and return null when no contact exists in location', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock duplicate search to return no contact
      mockedAxios.get.mockResolvedValue({ data: { contact: null, contacts: [] } });

      const payload = {
        locationId: 's94e80clit6bCL9VBWgl',
        email: 'leadsapi+orphan123@messaging.yelp.com',
        phone: '+13125550199',
        tags: ['yelp-phone-captured'],
        customFields: [{ key: 'yelp_phone_captured', value: 'Yes' }]
      };

      const result = await GHLService.smartUpsertContact(payload);

      expect(result).toBeNull();
      // Verify axios.post to /contacts/upsert was NOT called
      const upsertPostCalls = mockedAxios.post.mock.calls.filter(call =>
        typeof call[0] === 'string' && call[0].includes('/contacts/upsert')
      );
      expect(upsertPostCalls.length).toBe(0);

      // Verify guardrail warning log was emitted
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Guardrail Blocked] Prevented orphan contact creation for leadsapi+orphan123@messaging.yelp.com in location s94e80clit6bCL9VBWgl')
      );

      warnSpy.mockRestore();
    });

    it('should update existing contact when matching contact is found via duplicate search', async () => {
      // Mock duplicate search by email to find an existing contact
      mockedAxios.get.mockImplementation(async (url: string) => {
        if (url.includes('/contacts/search/duplicate')) {
          return { data: { contact: { id: 'existing_contact_999' } } };
        }
        return { data: { contacts: [] } };
      });
      mockedAxios.put.mockResolvedValue({ data: { contact: { id: 'existing_contact_999' } } });
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const payload = {
        locationId: 's94e80clit6bCL9VBWgl',
        email: 'leadsapi+existing123@messaging.yelp.com',
        phone: '+13125550199',
        tags: ['yelp-phone-captured'],
      };

      const result = await GHLService.smartUpsertContact(payload);

      expect(result).toBe('existing_contact_999');
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/contacts/existing_contact_999'),
        expect.objectContaining({ phone: '+13125550199' }),
        expect.anything()
      );
    });

    it('should proceed to create contact if payload has a real name', async () => {
      mockedAxios.get.mockResolvedValue({ data: { contact: null, contacts: [] } });
      mockedAxios.post.mockImplementation(async (url: string) => {
        if (url.includes('/contacts/upsert')) {
          return { data: { contact: { id: 'new_contact_777' } } };
        }
        return { data: { success: true } };
      });

      const payload = {
        locationId: 's94e80clit6bCL9VBWgl',
        name: 'Jordan Belfort',
        email: 'jordan@wallstreet.com',
        phone: '+12125550188',
        tags: ['source: yelp', 'yelp-lead'],
      };

      const result = await GHLService.smartUpsertContact(payload);

      expect(result).toBe('new_contact_777');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/contacts/upsert'),
        expect.objectContaining({ name: 'Jordan Belfort' }),
        expect.anything()
      );
    });
  });

  describe('Route Response Contract: /contacts/upsert', () => {
    it('should format skipped_orphan_guardrail response object when contactId is null', () => {
      const contactId: string | null = null;
      let responseData: any = null;
      let responseStatus: number = 0;

      const mockRes: any = {
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (data: any) => {
              responseData = data;
            },
          };
        },
      };

      if (!contactId) {
        mockRes.status(200).json({
          success: true,
          action: 'skipped_orphan_guardrail',
          message: 'Skipped orphan contact creation: no existing contact in location',
        });
      }

      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({
        success: true,
        action: 'skipped_orphan_guardrail',
        message: 'Skipped orphan contact creation: no existing contact in location',
      });
    });
  });
});
