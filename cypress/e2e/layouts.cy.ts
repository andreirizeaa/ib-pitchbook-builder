describe('Deck Layouts list (authenticated)', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/layouts');
  });

  it('displays the Deck Layouts heading', () => {
    cy.getByTestId('layouts-heading').should('be.visible').and('contain.text', 'Deck Layouts');
  });

  it('has a New Deck Type button', () => {
    cy.getByTestId('layouts-new-btn').should('be.visible');
  });

  it('clicking New Deck Type toggles the form', () => {
    cy.getByTestId('layouts-new-form').should('not.exist');
    cy.getByTestId('layouts-new-btn').click();
    cy.getByTestId('layouts-new-form').should('be.visible');
    cy.getByTestId('layouts-new-name').should('be.visible');
    cy.getByTestId('layouts-new-desc').should('be.visible');
    cy.getByTestId('layouts-new-create').should('be.visible');
  });

  it('create button is disabled when name is empty', () => {
    cy.getByTestId('layouts-new-btn').click();
    cy.getByTestId('layouts-new-create').should('be.disabled');
  });

  it('closing the new form hides it', () => {
    cy.getByTestId('layouts-new-btn').click();
    cy.getByTestId('layouts-new-form').should('be.visible');
    // Click again to close (toggle)
    cy.getByTestId('layouts-new-btn').click();
    cy.getByTestId('layouts-new-form').should('not.exist');
  });

  it('shows empty state or layout cards', () => {
    cy.get('[class*="animate-spin"]', { timeout: 15000 }).should('not.exist');
    cy.get('body').then(($body) => {
      const hasCards = $body.find('[data-testid^="layout-card-"]').length > 0;
      const hasEmpty = $body.text().includes('No deck layouts');
      expect(hasCards || hasEmpty).to.be.true;
    });
  });
});
