export interface ParsedYelpProjectSummary {
  isProjectSummary: boolean;
  serviceType: string;
  bedrooms: string;
  bathrooms: string;
  cleaningFrequency: string;
  notes: string;
  zip: string;
  timing: string;
  otherServices: string;
  productTypes: string;
}

export interface YelpCustomFieldInput {
  key: string;
  value: string;
}

type SectionKey =
  | 'serviceType'
  | 'bedrooms'
  | 'bathrooms'
  | 'cleaningFrequency'
  | 'notes'
  | 'otherServices'
  | 'productTypes'
  | 'timing'
  | 'zip'
  | 'availabilityStatus';

const SECTION_PATTERNS: Array<{ key: SectionKey; pattern: RegExp; singleLine?: boolean }> = [
  {
    key: 'serviceType',
    pattern: /^(?:question:\s*)?(?:what kind of (?:cleaning )?(?:service|work)\s*(?:are you looking for|would you like to get done)|what type of (?:cleaning|service) do you need)\??$/i,
    singleLine: true,
  },
  {
    key: 'bedrooms',
    pattern: /^(?:question:\s*)?(?:how many bedrooms[^\n]*|number of bedrooms[^\n]*)\??$/i,
    singleLine: true,
  },
  {
    key: 'bathrooms',
    pattern: /^(?:question:\s*)?(?:how many bathrooms[^\n]*|number of bathrooms[^\n]*)\??$/i,
    singleLine: true,
  },
  {
    key: 'cleaningFrequency',
    pattern: /^(?:question:\s*)?(?:how often do you want[^\n]*|how often[^\n]*(?:clean|service)[^\n]*)\??$/i,
    singleLine: true,
  },
  {
    key: 'notes',
    pattern: /^(?:question:\s*)?(?:are there any other details you'?d like to share|any details you'?d like to add|any additional information|any other details|additional details|additional notes|special instructions|tell us more about your project)[^\n]*\??$/i,
  },
  {
    key: 'otherServices',
    pattern: /^(?:question:\s*)?do you need any of these other services[^\n]*\??$/i,
  },
  {
    key: 'productTypes',
    pattern: /^(?:question:\s*)?do you require any of these cleaning product types[^\n]*\??$/i,
  },
  {
    key: 'timing',
    pattern: /^(?:question:\s*)?(?:when do you require this service|what (?:are|is) your availability dates?)[^\n]*\??$/i,
    singleLine: true,
  },
  {
    key: 'availabilityStatus',
    pattern: /^(?:question:\s*)?what is your availability status[^\n]*\??$/i,
    singleLine: true,
  },
  {
    key: 'zip',
    pattern: /^(?:question:\s*)?(?:in what location do you need the service|what is your location postcode)[^\n]*\??$/i,
    singleLine: true,
  },
];

const FOOTER_STOP_PATTERNS: RegExp[] = [
  /^\s*\[?\s*reply for free on yelp biz/i,
  /^\s*or reply directly to this email/i,
  /^\s*i'?m not interested/i,
  /^\s*i already replied/i,
  /^\s*report this conversation/i,
  /^\s*don'?t miss out on future leads/i,
  /^\s*keep track of incoming leads/i,
  /^\s*this email was sent to/i,
  /^\s*manage (?:your )?\[?email preferences/i,
  /^\s*©\s*\d{4}\s*\|\s*yelp/i,
  /^\s*respond now\b/i,
  /^\s*or simply respond\b/i,
  /^\s*view on yelp\b/i,
  /^\s*sent from my\b/i,
];

const SUMMARY_DETECTION_PATTERNS: RegExp[] = [
  /requested a quote/i,
  /you have a new\s+.+?\s+request/i,
  /answers to yelp'?s questions/i,
  /how many bedrooms/i,
  /how many bathrooms/i,
  /how often do you want/i,
  /what kind of (?:cleaning )?(?:service|work)/i,
  /do you need any of these other services/i,
  /are there any other details you'?d like to share/i,
  /any details you'?d like to add/i,
  /any additional information/i,
  /when do you require this service/i,
  /in what location do you need the service/i,
  /question:\s*.+[\r\n]+answer:/i,
  /\bproject\s+summary\s*:/i,
];

const LABELED_FIELD_PATTERNS: Array<{ key: keyof Pick<ParsedYelpProjectSummary, 'serviceType' | 'bedrooms' | 'bathrooms' | 'cleaningFrequency' | 'notes' | 'zip' | 'timing'>; pattern: RegExp }> = [
  { key: 'serviceType', pattern: /^(?:yelp\s+)?service(?:\s+type)?\s*[:\-]\s*(.+)$/i },
  { key: 'serviceType', pattern: /^project\s+job\s+names?\s*[:\-]\s*(.+)$/i },
  { key: 'bedrooms', pattern: /^(?:yelp\s+)?bed(?:room)?s?\s*[:\-]\s*(.+)$/i },
  { key: 'bathrooms', pattern: /^(?:yelp\s+)?bath(?:room)?s?\s*[:\-]\s*(.+)$/i },
  { key: 'cleaningFrequency', pattern: /^(?:yelp\s+)?(?:cleaning\s+)?frequency\s*[:\-]\s*(.+)$/i },
  { key: 'notes', pattern: /^(?:yelp\s+)?(?:notes(?:\s*\/\s*customer request)?|customer\s+(?:request|notes)|additional\s+(?:details|notes)|special\s+instructions)\s*[:\-]\s*(.+)$/i },
  { key: 'zip', pattern: /^(?:zip(?:\s+code)?|postal\s*code|location)\s*[:\-]\s*(.+)$/i },
  { key: 'timing', pattern: /^(?:when|timing|preferred\s+(?:date|timing)|availability)\s*[:\-]\s*(.+)$/i },
];

function stripAnswerPrefix(value: string): string {
  return value.replace(/^answer:\s*/i, '').trim();
}

function cleanInputLines(rawText: string): string[] {
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines: string[] = [];
  for (const rawLine of normalized.split('\n')) {
    const trimmed = rawLine.trim();

    if (FOOTER_STOP_PATTERNS.some((p) => p.test(trimmed))) {
      break;
    }

    // Skip Markdown table pipes and horizontal rules from HTML-to-text emails
    if (/^(?:\|[\s|]*|---+\s*)$/.test(trimmed)) {
      continue;
    }

    // Clean Markdown heading prefix (e.g., "## You have a new deep cleaning request.")
    const withoutHeading = trimmed.replace(/^#{1,6}\s+/, '');
    lines.push(withoutHeading);
  }
  return lines;
}

/**
 * Normalizes bedroom/bathroom counts while preserving decimals (e.g. "2.5") and "4 or more" ("4+").
 */
export function normalizeRoomCount(raw: string): string {
  const cleaned = stripAnswerPrefix(raw).trim();
  if (!cleaned) return '';

  const orMoreMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:\+|or\s+more\b)/i);
  if (orMoreMatch) {
    return `${orMoreMatch[1]}+`;
  }

  if (/^studio\b/i.test(cleaned)) {
    return 'Studio';
  }

  // Single numeric value optionally followed by bed/bath unit text
  const singleNumMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:bed(?:room)?s?|bath(?:room)?s?|br|ba)?$/i);
  if (singleNumMatch) {
    return singleNumMatch[1];
  }

  // e.g. "2 bedrooms (approx 1500 sq ft)" -> extract leading count if it's clearly a room unit
  const leadingUnitMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:bed(?:room)?s?|bath(?:room)?s?|br|ba)\b/i);
  if (leadingUnitMatch) {
    return leadingUnitMatch[1];
  }

  // Fallback: preserve compound values like "1 full, 1 half" instead of corrupting to "11"
  return cleaned;
}

function extractInlineCount(text: string, unitRegex: RegExp): string {
  const match = text.match(unitRegex);
  if (!match) return '';
  return normalizeRoomCount(match[1] || match[0]);
}

function extractInlineFrequency(text: string): string {
  const match = text.match(
    /\b(just once|one[- ]time|every\s+other\s+week|every\s+2\s+weeks|bi[- ]?weekly|every\s+week|weekly|every\s+month|monthly)\b/i
  );
  return match ? match[1].trim() : '';
}

/**
 * Deterministically parses a Yelp project summary / quote request into structured GHL fields.
 */
export function parseYelpProjectSummary(input: {
  message?: string;
  subject?: string;
  projectSummary?: string;
}): ParsedYelpProjectSummary {
  const combinedSource = [input.projectSummary, input.message]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join('\n\n');

  const emptyResult: ParsedYelpProjectSummary = {
    isProjectSummary: false,
    serviceType: '',
    bedrooms: '',
    bathrooms: '',
    cleaningFrequency: '',
    notes: '',
    zip: '',
    timing: '',
    otherServices: '',
    productTypes: '',
  };

  if (!combinedSource.trim()) {
    return emptyResult;
  }

  const lines = cleanInputLines(combinedSource);
  const cleanedText = lines.join('\n');

  const sectionValues: Partial<Record<SectionKey, string[]>> = {};
  const labeledValues: Partial<Record<'serviceType' | 'bedrooms' | 'bathrooms' | 'cleaningFrequency' | 'notes' | 'zip' | 'timing', string>> = {};
  let labeledCount = 0;
  let currentSection: { key: SectionKey; singleLine?: boolean } | null = null;

  for (const rawLine of lines) {
    if (!rawLine) {
      continue;
    }

    // Split pipe-delimited summary lines (e.g. "Project Summary: Deep Clean | 3 bed | Notes: ...")
    const segments = rawLine.includes('|')
      ? rawLine.split('|').map((s) => s.trim()).filter(Boolean)
      : [rawLine];

    for (const segment of segments) {
      const line = segment.replace(/^(?:yelp\s+)?project\s+summary\s*:\s*/i, '').trim();
      if (!line) {
        continue;
      }

      // 1. Check if line is a Yelp Q&A question heading
      const matchedSection = SECTION_PATTERNS.find((s) => s.pattern.test(line));
      if (matchedSection) {
        currentSection = { key: matchedSection.key, singleLine: matchedSection.singleLine };
        if (!sectionValues[matchedSection.key]) {
          sectionValues[matchedSection.key] = [];
        }
        continue;
      }

      // 2. Check if line is a labeled Key: Value field (e.g. "Service Type: Deep Clean")
      let matchedLabel = false;
      for (const lf of LABELED_FIELD_PATTERNS) {
        const m = line.match(lf.pattern);
        if (m && m[1]) {
          const val = stripAnswerPrefix(m[1]);
          if (val && !labeledValues[lf.key]) {
            labeledValues[lf.key] = val;
          }
          labeledCount++;
          currentSection = null;
          matchedLabel = true;
          break;
        }
      }
      if (matchedLabel) {
        continue;
      }

      // If this was the first segment after "Project Summary: <Service>" in a pipe-delimited line
      if (
        segments.length > 1 &&
        /^(?:yelp\s+)?project\s+summary\s*:/i.test(rawLine) &&
        !labeledValues.serviceType &&
        !/\d+\s*(?:bed|bath|br|ba)\b/i.test(line) &&
        !extractInlineFrequency(line)
      ) {
        labeledValues.serviceType = line;
        labeledCount++;
        continue;
      }

      // 3. Collect answer line for the active Yelp Q&A section
      if (currentSection) {
        const answerLine = stripAnswerPrefix(line);
        if (answerLine) {
          sectionValues[currentSection.key]!.push(answerLine);
          if (currentSection.singleLine) {
            currentSection = null;
          }
        }
      }
    }
  }

  const hasExplicitProjectSummary = Boolean(input.projectSummary && input.projectSummary.trim());
  const hasSummaryMarker = SUMMARY_DETECTION_PATTERNS.some((p) => p.test(cleanedText));
  const isProjectSummary = hasExplicitProjectSummary || hasSummaryMarker || labeledCount >= 2;

  if (!isProjectSummary) {
    return emptyResult;
  }

  // Extract raw fields from Q&A sections first, then labeled fields, then prose fallbacks
  const qaService = sectionValues.serviceType?.join(' ').trim() || '';
  const headerServiceMatch =
    cleanedText.match(/requested a quote(?:\s+from\s+[^\n]+?)?\s+for\s+(?:a|an)\s+([a-zA-Z0-9\s\-\/&]+?)(?:\.|!|\n|$)/i) ||
    cleanedText.match(/(?:you have a\s+)?new\s+([a-zA-Z0-9\s\-\/&]+?)\s+request/i);
  const subjectServiceMatch = input.subject
    ? input.subject.match(/for\s+(?:a|an)\s+([a-zA-Z0-9\s\-\/&]+?)(?:\.|!|$)/i)
    : null;
  const serviceType =
    qaService ||
    labeledValues.serviceType ||
    (headerServiceMatch ? headerServiceMatch[1].trim() : '') ||
    (subjectServiceMatch ? subjectServiceMatch[1].trim() : '');

  const rawBedrooms =
    sectionValues.bedrooms?.[0] ||
    labeledValues.bedrooms ||
    extractInlineCount(cleanedText, /\b(\d+\s*(?:\+|or\s+more)?\s*(?:bed(?:room)?s?|br)|studio)\b/i);
  const bedrooms = rawBedrooms ? normalizeRoomCount(rawBedrooms) : '';

  const rawBathrooms =
    sectionValues.bathrooms?.[0] ||
    labeledValues.bathrooms ||
    extractInlineCount(cleanedText, /\b(\d+(?:\.\d+)?\s*(?:\+|or\s+more)?\s*(?:bath(?:room)?s?|ba))\b/i);
  const bathrooms = rawBathrooms ? normalizeRoomCount(rawBathrooms) : '';

  const cleaningFrequency =
    sectionValues.cleaningFrequency?.[0] ||
    labeledValues.cleaningFrequency ||
    extractInlineFrequency(cleanedText);

  const explicitNotes = (sectionValues.notes?.join(' ') || labeledValues.notes || '').trim();
  const otherServices = (sectionValues.otherServices?.join(', ') || '').trim();
  const productTypes = (sectionValues.productTypes?.join(', ') || '').trim();
  const timing = (sectionValues.timing?.[0] || labeledValues.timing || '').trim();
  const zip = (sectionValues.zip?.[0] || labeledValues.zip || '').trim();

  // Build Yelp Notes / Customer Request combining explicit notes + additional survey details
  const noteParts: string[] = [];
  if (explicitNotes) {
    noteParts.push(explicitNotes);
  }
  const normalizedExplicit = explicitNotes.toLowerCase();
  if (otherServices && !normalizedExplicit.includes(otherServices.toLowerCase())) {
    noteParts.push(`Other services: ${otherServices}`);
  }
  if (productTypes && !normalizedExplicit.includes(productTypes.toLowerCase())) {
    noteParts.push(`Products: ${productTypes}`);
  }
  if (!explicitNotes && timing) {
    noteParts.push(`Timing: ${timing}`);
  }

  const notes = noteParts.join(' | ');

  return {
    isProjectSummary: true,
    serviceType,
    bedrooms,
    bathrooms,
    cleaningFrequency,
    notes,
    zip,
    timing,
    otherServices,
    productTypes,
  };
}

/**
 * Converts a parsed Yelp project summary into GHL customFields payload entries.
 */
export function buildYelpCustomFields(
  parsed: ParsedYelpProjectSummary,
  leadId?: string
): YelpCustomFieldInput[] {
  const customFields: YelpCustomFieldInput[] = [];

  if (parsed.serviceType) {
    customFields.push({ key: 'yelp_service_type', value: parsed.serviceType });
  }
  if (parsed.bedrooms) {
    customFields.push({ key: 'yelp_bedrooms', value: parsed.bedrooms });
  }
  if (parsed.bathrooms) {
    customFields.push({ key: 'yelp_bathrooms', value: parsed.bathrooms });
  }
  if (parsed.cleaningFrequency) {
    customFields.push({ key: 'yelp_cleaning_frequency', value: parsed.cleaningFrequency });
  }
  if (parsed.notes) {
    customFields.push({ key: 'yelp_notes__customer_request', value: parsed.notes });
  }
  if (leadId && !leadId.startsWith('yelp_')) {
    customFields.push({ key: 'yelp_lead_id', value: leadId });
  }

  return customFields;
}

const SYSTEM_EMAIL_SUBJECT_PATTERN =
  /confirm your email|verify your email|invited you to manage|invitation from|welcome to yelp|your yelp invoice|forwarding confirmation|confirm the request|your request was sent|good news! your request/i;

const SYSTEM_EMAIL_BODY_PATTERN =
  /confirm your email address on yelp|has invited you to manage|automatically forward mail to your email|you're closer to hiring a pro|keep an eye out for messages in your projects tab/i;

const SYSTEM_MARKETING_AND_MEETING_PATTERN =
  /nearby jobs in your area|welcome to nearby jobs|welcome to yelp advertising|yelp customer success|your upcoming meeting with yelp|your yelp meeting|just a reminder that our meeting is starting|just a reminder that we['’]ll be ringing you|how was your recent experience with/i;

/**
 * Returns true when an inbound Yelp/Gmail notification is an administrative,
 * marketing, Nearby Jobs, Customer Success, meeting reminder, or feedback email
 * rather than a real customer lead or reply.
 */
export function isYelpSystemEmail(subject: string = '', directMessage: string = ''): boolean {
  const safeSubject = subject || '';
  const safeMessage = directMessage || '';
  return (
    SYSTEM_EMAIL_SUBJECT_PATTERN.test(safeSubject) ||
    SYSTEM_EMAIL_BODY_PATTERN.test(safeMessage) ||
    SYSTEM_MARKETING_AND_MEETING_PATTERN.test(safeSubject) ||
    SYSTEM_MARKETING_AND_MEETING_PATTERN.test(safeMessage)
  );
}
