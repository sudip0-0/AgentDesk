const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9]{8,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL)\s*=\s*[^\s'"]+/gi,
  /\bBearer\s+[A-Za-z0-9._-]{10,}\b/gi
];

export const redactSecrets = (text: string): string => {
  let redacted = text;

  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }

  return redacted;
};
