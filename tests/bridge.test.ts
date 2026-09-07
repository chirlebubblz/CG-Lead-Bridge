import { describe, it, expect } from 'vitest';
import { YelpService } from '../src/services/yelp';
import { ThumbtackService } from '../src/services/thumbtack';

describe('Yelp Service - Plain Text Sanitizer', () => {
  it('should strip rich HTML tags and leave clean plain text', () => {
    const rawHtml = '<p>Hello <b>Jordan</b>, thank you for reaching out!</p><br/><a href="https://cleangenie.com">Click here</a>';
    const result = YelpService.stripHtml(rawHtml);
    expect(result).toBe('Hello Jordan, thank you for reaching out! Click here');
  });

  it('should remove inline script and style tags', () => {
    const input = '<style>.test { color: red; }</style><p>Hi there</p><script>alert("hack")</script>';
    const result = YelpService.stripHtml(input);
    expect(result).toBe('Hi there');
  });

  it('should convert HTML entities into regular characters', () => {
    const input = 'Mum&apos;s Cleaning &amp; Janitorial &quot;Express&quot;';
    const result = YelpService.stripHtml(input);
    expect(result).toBe("Mum's Cleaning & Janitorial \"Express\"");
  });
});

describe('Thumbtack Adapter', () => {
  it('should cleanly extract inbound lead fields', () => {
    const mockPayload = {
      lead_id: 'tt_98765',
      customer: {
        name: 'Sarah Connor',
        phone: '+13125550199',
      },
      message: {
        text: 'Need 2 bedrooms cleaned this Saturday',
      },
    };

    const parsed = ThumbtackService.parseInboundMessage(mockPayload);
    expect(parsed.leadId).toBe('tt_98765');
    expect(parsed.customerName).toBe('Sarah Connor');
    expect(parsed.message).toBe('Need 2 bedrooms cleaned this Saturday');
    expect(parsed.phone).toBe('+13125550199');
  });
});
