import { describe, expect, it } from 'vitest';
import { buildLongShareUrl, extractPlanCodeFromHash } from './longUrl';

describe('long build URL', () => {
  it('round-trips a plan code through the hash', () => {
    const location = {
      origin: 'https://example.github.io',
      pathname: '/planner/',
      search: '',
    } as Location;
    const url = buildLongShareUrl('2:name:data+/=', location);
    expect(url).toBe('https://example.github.io/planner/#plan=2%3Aname%3Adata%2B%2F%3D');
    expect(extractPlanCodeFromHash(new URL(url).hash)).toBe('2:name:data+/=');
  });

  it('ignores unrelated or malformed hashes', () => {
    expect(extractPlanCodeFromHash('#/short-code')).toBeNull();
    expect(extractPlanCodeFromHash('#plan=%E0%A4%A')).toBeNull();
  });
});
