describe('Auth Pages', () => {
  describe('Login Page', () => {
    beforeEach(() => {
      cy.visit('/auth/login');
    });

    it('should display the login heading', () => {
      cy.getByTestId('login-heading').should('be.visible').and('contain.text', 'Welcome back');
    });

    it('should display the login form with email and password fields', () => {
      cy.getByTestId('login-form').should('be.visible');
      cy.getByTestId('login-email').should('exist');
      cy.getByTestId('login-password').should('exist');
    });

    it('should display the submit button', () => {
      cy.getByTestId('login-submit').should('be.visible').and('contain.text', 'Log In');
    });

    it('should have a link to the register page', () => {
      cy.getByTestId('login-signup-link')
        .should('be.visible')
        .and('have.attr', 'href', '/auth/register');
    });

    it('should have a forgot password link', () => {
      cy.getByTestId('login-forgot-password')
        .should('be.visible')
        .and('have.attr', 'href', '/auth/forgot-password');
    });

    it('should have a password visibility toggle button', () => {
      cy.getByTestId('login-toggle-password').should('be.visible');
    });
  });

  describe('Register Page', () => {
    beforeEach(() => {
      cy.visit('/auth/register');
    });

    it('should display the register heading', () => {
      cy.getByTestId('register-heading').should('be.visible').and('contain.text', 'Create your account');
    });

    it('should display the registration form with all fields', () => {
      cy.getByTestId('register-form').should('be.visible');
      cy.getByTestId('register-name').should('exist');
      cy.getByTestId('register-email').should('exist');
      cy.getByTestId('register-password').should('exist');
    });

    it('should display the submit button', () => {
      cy.getByTestId('register-submit').should('be.visible').and('contain.text', 'Create Account');
    });

    it('should have a link to the login page', () => {
      cy.getByTestId('register-login-link')
        .should('be.visible')
        .and('have.attr', 'href', '/auth/login');
    });
  });
});
