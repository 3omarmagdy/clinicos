import { buildAllowedOrigins } from './cors-policy';

describe('CORS origin policy', () => {
  it('allows configured Production and Preview frontends but not localhost', () => {
    const allowed = buildAllowedOrigins({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://clinicos-crm.vercel.app',
      FRONTEND_URLS: 'https://clinicos-preview.vercel.app',
    });
    expect(allowed.has('https://clinicos-crm.vercel.app')).toBe(true);
    expect(allowed.has('https://clinicos-preview.vercel.app')).toBe(true);
    expect(allowed.has('http://localhost:3000')).toBe(false);
    expect(allowed.has('https://unknown-origin.example')).toBe(false);
  });

  it('allows localhost only outside Production', () => {
    const allowed = buildAllowedOrigins({ NODE_ENV: 'development', FRONTEND_URL: 'https://clinicos-crm.vercel.app' });
    expect(allowed.has('http://localhost:3000')).toBe(true);
    expect(allowed.has('https://clinicos-crm.vercel.app')).toBe(true);
  });

  it('trims and splits the configured Preview allowlist without accepting arbitrary origins', () => {
    const allowed = buildAllowedOrigins({
      NODE_ENV: 'production',
      FRONTEND_URL: ' https://clinicos-crm.vercel.app ',
      FRONTEND_URLS: 'https://preview-a.vercel.app, https://preview-b.vercel.app',
    });
    expect([...allowed]).toEqual([
      'https://clinicos-crm.vercel.app',
      'https://preview-a.vercel.app',
      'https://preview-b.vercel.app',
    ]);
  });
});
