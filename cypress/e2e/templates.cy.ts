describe('Templates (authenticated)', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/templates');
  });

  it('displays the Templates heading', () => {
    cy.getByTestId('templates-heading').should('be.visible').and('contain.text', 'Templates');
  });

  it('has an Upload Template button', () => {
    cy.getByTestId('templates-upload-btn').should('be.visible');
  });

  it('shows empty state or template cards', () => {
    cy.get('[class*="animate-spin"]', { timeout: 15000 }).should('not.exist');
    cy.get('body').then(($body) => {
      const hasCards = $body.find('[data-testid^="template-card-"]').length > 0;
      const hasEmpty = $body.text().includes('No templates uploaded');
      expect(hasCards || hasEmpty).to.be.true;
    });
  });
});
