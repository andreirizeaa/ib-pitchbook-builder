describe('Landing Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the hero heading', () => {
    cy.getByTestId('hero-heading').should('be.visible');
    cy.getByTestId('hero-heading').should('contain.text', 'Pitch Books');
  });

  it('should display the navigation bar with logo and links', () => {
    cy.getByTestId('logo-link').should('be.visible');
    cy.getByTestId('nav-login').should('be.visible').and('contain.text', 'Log in');
    cy.getByTestId('nav-get-started').should('be.visible').and('contain.text', 'Get Started');
  });

  it('should display the hero CTA button', () => {
    cy.getByTestId('hero-cta')
      .should('be.visible')
      .and('contain.text', 'Start Building')
      .and('have.attr', 'href', '/auth/register');
  });

  it('should display all 6 feature cards', () => {
    cy.getByTestId('features-grid').should('be.visible');
    for (let i = 0; i < 6; i++) {
      cy.getByTestId(`feature-card-${i}`).should('be.visible');
    }
  });

  it('should display the how-it-works steps', () => {
    for (let i = 0; i < 4; i++) {
      cy.getByTestId(`step-${i}`).should('be.visible');
    }
  });

  it('should have anchor links for Features, How It Works, and Pricing', () => {
    cy.get('a[href="#features"]').should('exist');
    cy.get('a[href="#how-it-works"]').should('exist');
    cy.get('a[href="#pricing"]').should('exist');
  });

  it('should have login link pointing to /auth/login', () => {
    cy.getByTestId('nav-login').should('have.attr', 'href', '/auth/login');
  });

  it('should have Get Started link pointing to /auth/register', () => {
    cy.getByTestId('nav-get-started').should('have.attr', 'href', '/auth/register');
  });

  it('should have hero CTA link pointing to /auth/register', () => {
    cy.getByTestId('hero-cta').should('have.attr', 'href', '/auth/register');
  });

  it('should display footer with copyright', () => {
    cy.get('footer').should('be.visible');
    cy.get('footer').should('contain.text', 'PitchDeck AI');
  });
});
