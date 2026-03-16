describe('Dashboard (authenticated)', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/dashboard');
  });

  it('displays the dashboard heading', () => {
    cy.getByTestId('dashboard-heading').should('be.visible').and('contain.text', 'Dashboard');
  });

  it('shows the sidebar with navigation links', () => {
    cy.getByTestId('sidebar-dashboard').should('be.visible');
    cy.getByTestId('sidebar-pitchbooks').should('be.visible');
    cy.getByTestId('sidebar-pitchbooks-new').should('be.visible');
    cy.getByTestId('sidebar-templates').should('be.visible');
    cy.getByTestId('sidebar-layouts').should('be.visible');
  });

  it('shows stats cards section', () => {
    cy.getByTestId('dashboard-stats').should('be.visible');
    cy.getByTestId('dashboard-stats').find('[class*="card"]').should('have.length.at.least', 3);
  });

  it('has a New Pitch Book button linking to /pitchbooks/new', () => {
    cy.getByTestId('dashboard-new-btn').should('have.attr', 'href', '/pitchbooks/new');
  });

  it('has a View All link to /pitchbooks', () => {
    cy.getByTestId('dashboard-view-all').should('have.attr', 'href', '/pitchbooks');
  });

  it('shows empty state or recent pitch books list after loading', () => {
    // Wait for spinner to disappear
    cy.get('[class*="animate-spin"]', { timeout: 15000 }).should('not.exist');
    // Either the empty CTA or pitch book items should appear
    cy.get('body').then(($body) => {
      const hasEmpty = $body.find('[data-testid="dashboard-empty-cta"]').length > 0;
      const hasList = $body.find('[class*="space-y-3"]').length > 0;
      expect(hasEmpty || hasList).to.be.true;
    });
  });

  it('sidebar settings link goes to /settings', () => {
    cy.getByTestId('sidebar-settings').should('have.attr', 'href', '/settings');
  });

  it('sidebar has a sign out button', () => {
    cy.getByTestId('sidebar-signout').should('be.visible');
  });
});
