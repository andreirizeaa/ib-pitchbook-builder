describe('Settings (authenticated)', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/settings');
  });

  it('displays the Settings heading', () => {
    cy.getByTestId('settings-heading').should('be.visible').and('contain.text', 'Settings');
  });

  it('shows the user email', () => {
    cy.getByTestId('settings-email').should('be.visible').and('contain.text', '@');
  });

  it('has a password change field', () => {
    cy.getByTestId('settings-password').should('be.visible');
  });

  it('has an update password button', () => {
    cy.getByTestId('settings-update-password').should('be.visible');
  });

  it('has a sign out button', () => {
    cy.getByTestId('settings-signout').should('be.visible');
  });
});
