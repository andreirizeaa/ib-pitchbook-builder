// This spec requires a running backend — skip in CI.
describe('Generate Screenshots for Dissertation', () => {
  before(function () {
    if (Cypress.env('CI')) {
      this.skip();
    }
  });
    beforeEach(() => {
        // Force light mode
        cy.on('window:before:load', (win) => {
            win.localStorage.setItem('theme', 'light');
        });
    });

    const takeScreenshot = (name: string) => {
        // Wait for network and stable UI
        cy.wait(3000);
        cy.screenshot(name, { capture: 'fullPage' });
    };

    it('Takes screenshots of unauthenticated pages', () => {
        cy.visit('/auth/login');
        takeScreenshot('01-login-page');

        cy.visit('/auth/register');
        takeScreenshot('02-register-page');

        cy.visit('/auth/forgot-password');
        takeScreenshot('03-forgot-password-page');
    });

    it('Takes screenshots of authenticated pages', () => {
        cy.login();

        // Helper to create a pitchbook
        const createPb = (title: string, company: string) => {
            cy.visit('/pitchbooks/new');
            cy.wait(3000); // ensure interactive
            cy.getByTestId('new-pb-title').type(title);
            cy.getByTestId('new-pb-company').type(company);
            cy.getByTestId('new-pb-type').select(1);
            cy.getByTestId('new-pb-tx-type').select(1);
            cy.getByTestId('new-pb-submit').click();
            cy.url({ timeout: 15000 }).should('not.include', '/pitchbooks/new');
        };

        // Create a few pitchbooks
        createPb('Project Alpha', 'TechCorp Inc.');
        createPb('Project Beta', 'Global Holdings');
        createPb('Project Gamma', 'Innovate LLC');

        // Visit Dashboard
        cy.visit('/dashboard');
        takeScreenshot('04-dashboard');

        // Visit Pitchbooks Gallery
        cy.visit('/pitchbooks');
        takeScreenshot('05-pitchbook-gallery-with-thumbnails');

        // Wait for at least one pitchbook to finish generation (can take 45+ seconds), then click it
        // Using cy.contains(selector, content) directly so the 90s timeout applies correctly
        cy.contains('[data-testid^="pitchbook-card-"]', 'Completed', { timeout: 90000 }).click();

        cy.wait(4000); // Wait for the deck layout to fully load
        takeScreenshot('05a-pitchbook-deck-layout');

        // Visit new pitchbook form and fill it out for the screenshot
        cy.visit('/pitchbooks/new');

        cy.wait(3000); // Ensure form is active

        // Fill with mock data
        cy.getByTestId('new-pb-title').type('Project Delta Generation');
        cy.getByTestId('new-pb-company').type('Stark Industries');
        cy.getByTestId('new-pb-type').select(1);
        cy.getByTestId('new-pb-tx-type').select(1);
        cy.getByTestId('new-pb-context').type('Strategic context highlighting upcoming M&A opportunities within the broader European market.');

        // Scroll back to the top of the scrollable main area before taking the screenshot
        cy.get('main').scrollTo('top');

        takeScreenshot('06-new-pitchbook');

        // Visit templates
        cy.visit('/templates');
        takeScreenshot('07-templates');

        // Visit layouts list
        cy.visit('/layouts');
        takeScreenshot('08-layouts');

        // Click into one layout to edit
        cy.get('body').then(($body) => {
            const cards = $body.find('[data-testid^="layout-card-"]');
            if (cards.length > 0) {
                cy.wrap(cards[0]).click();
            } else {
                // Fallback if cards are links without testid
                const links = $body.find('a[href^="/layouts/"]').not('[href="/layouts/new"]');
                if (links.length > 0) {
                    cy.wrap(links[0]).click();
                }
            }
        });

        cy.wait(3000);
        takeScreenshot('08a-layout-edit');

        // Visit settings
        cy.visit('/settings');
        takeScreenshot('09-settings');
    });
});
