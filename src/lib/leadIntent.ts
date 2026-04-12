const APPLICATION_PATTERNS: RegExp[] = [
  /\bbewerb(?:ung|e|en|er)?\b/i,
  /\blebenslauf\b/i,
  /\bcv\b/i,
  /\banschreiben\b/i,
  /\bpraktik(?:um|a)\b/i,
  /\bausbildung\b/i,
  /\bwerkstudent(?:in)?\b/i,
  /\bminijob\b/i,
  /\bvollzeit\b/i,
  /\bteilzeit\b/i,
  /\bjob(?:s)?\b/i,
  /\bstelle(?:n)?\b/i,
  /\bkarriere\b/i,
  /\binitiativbewerb(?:ung)?\b/i,
  /\bresume\b/i,
  /\bcover\s*letter\b/i,
  /\binternship\b/i,
  /\btrainee\b/i,
  /\bjob\s*application\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bhiring\b/i,
  /\bcareer(?:s)?\b/i,
];

export function isLikelyApplicationLead(values: Array<string | null | undefined>): boolean {
  const normalized = values
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim())
    .join(' ');

  if (!normalized) {
    return false;
  }

  return APPLICATION_PATTERNS.some((pattern) => pattern.test(normalized));
}
