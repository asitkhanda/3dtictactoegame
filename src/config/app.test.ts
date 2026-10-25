import { describe, expect, it } from 'vitest';
import { getIosBetaCta } from './app';

describe('getIosBetaCta', () => {
  it('links straight to TestFlight once a public link exists', () => {
    const cta = getIosBetaCta('https://testflight.apple.com/join/ABC123');
    expect(cta.href).toBe('https://testflight.apple.com/join/ABC123');
    expect(cta.external).toBe(true);
    expect(cta.label).toMatch(/TestFlight/);
  });

  it('falls back to a prefilled email request', () => {
    const cta = getIosBetaCta(null, 'help@example.com');
    expect(cta.href.startsWith('mailto:help@example.com?')).toBe(true);
    expect(cta.href).toContain('subject=Twisted%20Tac%20iOS%20beta%20access');
    expect(cta.external).toBe(false);
    expect(cta.label).toBe('Request beta access');
  });
});
