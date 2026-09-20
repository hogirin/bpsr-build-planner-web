const PLAN_HASH_PREFIX = '#plan=';

export function buildLongShareUrl(planCode: string, location: Location = window.location): string {
  return `${location.origin}${location.pathname}${location.search}${PLAN_HASH_PREFIX}${encodeURIComponent(planCode)}`;
}

export function extractPlanCodeFromHash(hash: string): string | null {
  if (!hash.startsWith(PLAN_HASH_PREFIX)) return null;
  try {
    const planCode = decodeURIComponent(hash.slice(PLAN_HASH_PREFIX.length));
    return planCode || null;
  } catch {
    return null;
  }
}
