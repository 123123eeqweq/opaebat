import { LANGUAGES, LANG_STORAGE_KEY } from '../languages';

describe('languages', () => {
  it('LANGUAGES has entries', () => {
    expect(LANGUAGES.length).toBeGreaterThan(0);
  });

  it('each language has code, label, flag', () => {
    LANGUAGES.forEach((l) => {
      expect(l).toHaveProperty('code');
      expect(l).toHaveProperty('label');
      expect(l).toHaveProperty('flag');
      expect(typeof l.code).toBe('string');
      expect(typeof l.label).toBe('string');
    });
  });

  it('contains RU and EN', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(codes).toContain('RU');
    expect(codes).toContain('EN');
  });

  it('LANG_STORAGE_KEY is string', () => {
    expect(typeof LANG_STORAGE_KEY).toBe('string');
    expect(LANG_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});
