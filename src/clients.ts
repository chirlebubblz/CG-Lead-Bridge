export interface ClientConfig {
  slug: string;
  name: string;
  locationId: string;
  brandPattern: RegExp;
}

export interface ClientActivity {
  hitCount: number;
  lastSeenAt: string | null;
  lastEndpoint: string | null;
}

export interface ClientStatusSummary {
  slug: string;
  name: string;
  locationId: string;
  hitCount: number;
  lastSeenAt: string | null;
  lastEndpoint: string | null;
  status: 'verified' | 'pending';
}

export const CLIENTS: ClientConfig[] = [
  {
    slug: 'jacksonville',
    name: 'Jacksonville Cleaning Co',
    locationId: 'EKXbBmGEV6hnLQFQRPc7',
    brandPattern: /jacksonville\s*cleaning/i,
  },
  {
    slug: 'capable-clean',
    name: 'Capable Clean',
    locationId: 's94e80clit6bCL9VBWgl',
    brandPattern: /capable\s*clean/i,
  },
  {
    slug: 'ascend',
    name: 'Ascend Cleaning',
    locationId: 'IdJoWa68hD3nVj45Fv7f',
    brandPattern: /ascend\s*cleaning/i,
  },
  {
    slug: 'sparkle-squad',
    name: 'The Sparkle Squad Co',
    locationId: 'ThUMNqsKmDfYKMF0jsBb',
    brandPattern: /sparkle\s*squad/i,
  },
  {
    slug: 'sunny-side',
    name: 'Sunny Side Clean Team',
    locationId: 'WOwi6fpdaZavuqHU8Rux',
    brandPattern: /sunny\s*side\s*clean/i,
  },
  {
    slug: 'puget-sound',
    name: 'Puget Sound Cleaners',
    locationId: 'MucxtGIfmvLViGQWD0CG',
    brandPattern: /puget\s*sound\s*cleaners/i,
  },
  {
    slug: 'mums-cleaning',
    name: "Mum's Cleaning Services Chicago",
    locationId: 'YVtPYdLotWLwuy5AA8Vv',
    brandPattern: /mum'?s\s*cleaning/i,
  },
  {
    slug: 'austin',
    name: "Ya'll Maid Austin",
    locationId: '19jBWYeRsrzDq6Oe1nth',
    brandPattern: /(?:ya'?ll|y'?all)\s*maid/i,
  },
  {
    slug: 'rapids',
    name: 'Rapids Cleaning Services',
    locationId: '8duUHE4ENvhQTCtg3z6o',
    brandPattern: /rapids\s*cleaning/i,
  },
  {
    slug: 'maid-co',
    name: 'Maid Co Cleaning',
    locationId: 'IoU6ToP3okYmCe2CKNly',
    brandPattern: /maid\s*co/i,
  },
  {
    slug: 'poppy-pro',
    name: 'Poppy Pro Cleaning',
    locationId: 'n1jnBtlfzNKJC4BdrN2y',
    brandPattern: /poppy\s*pro(?:\s*clean(?:ing|er)?)?/i,
  },
];

const JACKSONVILLE_TYPO_LOCATION_ID = 'EKXbBmGEV6hnLQFQRPc';
const JACKSONVILLE_LOCATION_ID = 'EKXbBmGEV6hnLQFQRPc7';

/**
 * Normalizes known locationId typos and trims whitespace.
 * Returns undefined if no non-empty locationId is provided.
 */
export function normalizeLocationId(locationId?: string | null): string | undefined {
  if (typeof locationId !== 'string') return undefined;
  const trimmed = locationId.trim();
  if (!trimmed) return undefined;
  if (trimmed === JACKSONVILLE_TYPO_LOCATION_ID) {
    return JACKSONVILLE_LOCATION_ID;
  }
  return trimmed;
}

export function getClientBySlug(slug: string): ClientConfig | undefined {
  if (typeof slug !== 'string') return undefined;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return undefined;
  return CLIENTS.find((c) => c.slug === normalized);
}

export function getClientByLocationId(locationId: string): ClientConfig | undefined {
  const normalized = normalizeLocationId(locationId);
  if (!normalized) return undefined;
  return CLIENTS.find((c) => c.locationId === normalized);
}

export function detectClientByBrandText(text: string): ClientConfig | undefined {
  if (!text) return undefined;
  return CLIENTS.find((c) => c.brandPattern.test(text));
}

const clientActivityMap = new Map<string, ClientActivity>();

export function recordClientHit(locationId: string, endpoint: string): void {
  const normalized = normalizeLocationId(locationId);
  if (!normalized) return;

  const existing = clientActivityMap.get(normalized);
  clientActivityMap.set(normalized, {
    hitCount: (existing?.hitCount ?? 0) + 1,
    lastSeenAt: new Date().toISOString(),
    lastEndpoint: endpoint,
  });
}

export function resetClientActivity(): void {
  clientActivityMap.clear();
}

export function getClientStatusSummary(): ClientStatusSummary[] {
  return CLIENTS.map((client) => {
    const activity = clientActivityMap.get(client.locationId);
    const hitCount = activity?.hitCount ?? 0;
    return {
      slug: client.slug,
      name: client.name,
      locationId: client.locationId,
      hitCount,
      lastSeenAt: activity?.lastSeenAt ?? null,
      lastEndpoint: activity?.lastEndpoint ?? null,
      status: hitCount > 0 ? 'verified' : 'pending',
    };
  });
}
