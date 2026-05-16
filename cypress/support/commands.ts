/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

/**
 * Base64URL encode a string (matching @supabase/ssr's stringToBase64URL).
 */
function stringToBase64URL(str: string): string {
  // Encode as UTF-8 bytes, then base64url
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Cypress.Commands.add('login', () => {
  const supabaseUrl = Cypress.env('SUPABASE_URL') || '';
  const supabaseAnonKey = Cypress.env('SUPABASE_ANON_KEY') || '';
  const email = Cypress.env('TEST_USER_EMAIL') || '';
  const password = Cypress.env('TEST_USER_PASSWORD') || '';
  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  const cookieName = `sb-${ref}-auth-token`;
  const MAX_CHUNK_SIZE = 3180;

  cy.session('supabase-auth', () => {
    cy.request({
      method: 'POST',
      url: `${supabaseUrl}/auth/v1/token?grant_type=password`,
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: { email, password },
    }).then(({ body }) => {
      const sessionJson = JSON.stringify({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        expires_in: body.expires_in,
        expires_at: body.expires_at,
        token_type: body.token_type,
        user: body.user,
      });

      // @supabase/ssr v0.6.x stores as "base64-" + base64url(json), chunked at 3180 bytes
      const encoded = 'base64-' + stringToBase64URL(sessionJson);

      // Chunk the encoded value
      const chunks: string[] = [];
      for (let i = 0; i < encoded.length; i += MAX_CHUNK_SIZE) {
        chunks.push(encoded.substring(i, i + MAX_CHUNK_SIZE));
      }

      if (chunks.length === 1) {
        cy.setCookie(cookieName, chunks[0], { path: '/' });
      } else {
        chunks.forEach((chunk, index) => {
          cy.setCookie(`${cookieName}.${index}`, chunk, { path: '/' });
        });
      }

      // Also set in localStorage for client-side Supabase
      window.localStorage.setItem(cookieName, sessionJson);
    });
  });
});

export {};
