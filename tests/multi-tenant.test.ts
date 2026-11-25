import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CLIENTS,
  detectClientByBrandText,
  getClientByLocationId,
  getClientBySlug,
  getClientStatusSummary,
  normalizeLocationId,
  recordClientHit,
  resetClientActivity,
} from '../src/clients';

describe('Multi-Tenant Client Registry & Isolation', () => {
  beforeEach(() => {
    resetClientActivity();
  });

  it('resolves all 11 configured clients by slug (case-insensitive and trimmed)', () => {
    expect(CLIENTS).toHaveLength(11);

    const expectedSlugs = [
      'jacksonville',
      'capable-clean',
      'ascend',
      'sparkle-squad',
      'sunny-side',
      'puget-sound',
      'mums-cleaning',
      'austin',
      'rapids',
      'maid-co',
      'poppy-pro',
    ];

    for (const slug of expectedSlugs) {
      const client = getClientBySlug(slug);
      expect(client).toBeDefined();
      expect(client?.slug).toBe(slug);
      expect(client?.locationId).toBeTruthy();
    }

    expect(getClientBySlug('  ASCEND  ')?.locationId).toBe('IdJoWa68hD3nVj45Fv7f');
    expect(getClientBySlug('unknown-client')).toBeUndefined();
    expect(getClientBySlug('')).toBeUndefined();
  });

  it('normalizes Jacksonville typo locationId and returns undefined for empty inputs', () => {
    expect(normalizeLocationId('EKXbBmGEV6hnLQFQRPc')).toBe('EKXbBmGEV6hnLQFQRPc7');
    expect(normalizeLocationId('  s94e80clit6bCL9VBWgl  ')).toBe('s94e80clit6bCL9VBWgl');
    expect(normalizeLocationId('')).toBeUndefined();
    expect(normalizeLocationId('   ')).toBeUndefined();
    expect(normalizeLocationId(undefined)).toBeUndefined();
    expect(normalizeLocationId(null)).toBeUndefined();

    expect(getClientByLocationId('EKXbBmGEV6hnLQFQRPc')?.slug).toBe('jacksonville');
  });

  it('detects brands cleanly without falling back when no brand matches', () => {
    expect(detectClientByBrandText('New lead from John for Austin Y\'all Maid')?.slug).toBe('austin');
    expect(detectClientByBrandText('Message for Poppy Pro Cleaning')?.slug).toBe('poppy-pro');
    expect(detectClientByBrandText('Generic cleaning request with no brand')).toBeUndefined();
  });

  it('tracks per-client webhook hits accurately without cross-contamination', () => {
    recordClientHit('IdJoWa68hD3nVj45Fv7f', '/webhook/yelp/ascend');
    recordClientHit('IdJoWa68hD3nVj45Fv7f', '/contacts/upsert/ascend');

    const summary = getClientStatusSummary();
    const ascend = summary.find((c) => c.slug === 'ascend');
    const jacksonville = summary.find((c) => c.slug === 'jacksonville');

    expect(ascend?.status).toBe('verified');
    expect(ascend?.hitCount).toBe(2);
    expect(ascend?.lastEndpoint).toBe('/contacts/upsert/ascend');
    expect(ascend?.lastSeenAt).toBeTruthy();

    expect(jacksonville?.status).toBe('pending');
    expect(jacksonville?.hitCount).toBe(0);
    expect(jacksonville?.lastSeenAt).toBeNull();
  });

  it('does not silently default config.ghl.locationId to Jacksonville when GHL_LOCATION_ID is unset', async () => {
    const originalLocationId = process.env.GHL_LOCATION_ID;
    delete process.env.GHL_LOCATION_ID;
    vi.resetModules();
    vi.doMock('dotenv', () => ({ default: { config: vi.fn() } }));

    const { config } = await import('../src/config');
    expect(config.ghl.locationId).toBe('');

    vi.doUnmock('dotenv');
    if (originalLocationId !== undefined) {
      process.env.GHL_LOCATION_ID = originalLocationId;
    }
  });
});
