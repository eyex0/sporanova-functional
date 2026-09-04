const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_RE = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const API_KEY_RE = /\b(sk[_-]?live[_]?|pk[_-]?live[_]?|sk[_-]?test[_]?|pk[_-]?test[_]?|sk[_-]|pk[_-]|ak[_-]|key[_-]|api[_-]?key[_-]?)[a-zA-Z0-9]{10,}/gi;
const PASSWORD_RE = /\b(password|passwd|pwd)\s*[:=]\s*\S+/gi;

interface PiiRule {
  pattern: RegExp;
  label: string;
  validator?: (value: string, fullText?: string) => boolean;
  transform?: (value: string) => string;
}

const PII_RULES: PiiRule[] = [
  { pattern: EMAIL_RE, label: '[EMAIL]' },
  { pattern: SSN_RE, label: '[SSN]' },
  { pattern: CREDIT_CARD_RE, label: '[CREDIT_CARD]' },
  { pattern: API_KEY_RE, label: '[API_KEY]' },
  {
    pattern: PASSWORD_RE,
    label: '[PASSWORD]',
    transform: (match: string) => match.replace(/[:=]\s*\S+/, ': [PASSWORD]'),
  },
  {
    pattern: PHONE_RE,
    label: '[PHONE]',
    validator: (value: string) => {
      const digits = value.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },
  },
  {
    pattern: IP_RE,
    label: '[IP]',
    validator: (value: string, fullText?: string) => {
      if (!fullText) return true;
      const idx = fullText.indexOf(value);
      if (idx === -1) return true;
      const before = fullText.slice(Math.max(0, idx - 5), idx);
      if (/\d\.$/.test(before)) return false;
      if (/^[a-z]/i.test(fullText.slice(idx + value.length, idx + value.length + 3))) return false;
      return true;
    },
  },
];

function createRegex(rule: PiiRule): RegExp {
  return new RegExp(rule.pattern.source, rule.pattern.flags);
}

export class NovaAnonymizer {
  anonymizeText(text: string): { anonymized: string; piiFound: string[] } {
    const piiFound: string[] = [];
    let anonymized = text;

    for (const rule of PII_RULES) {
      const regex = createRegex(rule);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const value = match[0];

        if (rule.validator && !rule.validator(value, text)) {
          continue;
        }

        const label = rule.label;
        piiFound.push(`${label}:${value}`);
      }
    }

    for (const rule of PII_RULES) {
      const regex = createRegex(rule);
      anonymized = anonymized.replace(regex, (match) => {
        if (rule.validator && !rule.validator(match, text)) {
          return match;
        }
        if (rule.transform) {
          return rule.transform(match);
        }
        return rule.label;
      });
    }

    const uniquePii = [...new Set(piiFound.map(p => p.split(':')[0]))];
    return { anonymized, piiFound: uniquePii };
  }

  anonymizeConversation(
    messages: Array<{ role: string; content: string }>
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => {
      const { anonymized } = this.anonymizeText(msg.content);
      return { role: msg.role, content: anonymized };
    });
  }

  containsSensitiveData(text: string): { safe: boolean; reasons: string[] } {
    const reasons: string[] = [];

    for (const rule of PII_RULES) {
      const regex = createRegex(rule);
      if (regex.test(text)) {
        reasons.push(`Contains ${rule.label.replace(/[[\]]/g, '').toLowerCase()}`);
      }
    }

    const secretPatterns = [
      /private[_\s]?key/i,
      /secret[_\s]?key/i,
      /access[_\s]?token/i,
      /authorization[_\s]?bearer/i,
    ];
    for (const p of secretPatterns) {
      if (p.test(text)) {
        reasons.push(`Contains sensitive reference: ${p.source}`);
      }
    }

    return { safe: reasons.length === 0, reasons };
  }
}
