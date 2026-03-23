describe('Pitch Books list (authenticated)', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/pitchbooks');
  });

  it('displays the Pitch Books heading', () => {
    cy.getByTestId('pitchbooks-heading').should('be.visible').and('contain.text', 'Pitch Books');
  });

  it('has a New Pitch Book button', () => {
    cy.getByTestId('pitchbooks-new-btn').should('have.attr', 'href', '/pitchbooks/new');
  });

  it('shows a search input', () => {
    cy.getByTestId('pitchbooks-search').should('be.visible');
  });

  it('shows empty state or pitch book cards', () => {
    // Wait for pitch book cards or empty state text to appear (data loaded)
    cy.get('[data-testid^="pitchbook-card-"], :contains("No pitch books")', { timeout: 20000 })
      .should('exist');
  });
});

describe('New Pitch Book form (authenticated)', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/pitchbooks/new');
  });

  it('displays the New Pitch Book heading', () => {
    cy.getByTestId('new-pb-heading').should('be.visible').and('contain.text', 'New Pitch Book');
  });

  it('has all required form fields', () => {
    cy.getByTestId('new-pb-form').should('exist');
    cy.getByTestId('new-pb-title').should('be.visible');
    cy.getByTestId('new-pb-company').should('be.visible');
    cy.getByTestId('new-pb-type').should('be.visible');
    cy.getByTestId('new-pb-tx-type').should('be.visible');
    cy.getByTestId('new-pb-context').scrollIntoView().should('be.visible');
  });

  it('has cancel and submit buttons', () => {
    cy.getByTestId('new-pb-cancel').scrollIntoView().should('be.visible');
    cy.getByTestId('new-pb-submit').should('be.visible');
  });

  it('pitch book type dropdown has correct options', () => {
    cy.getByTestId('new-pb-type').find('option').should('have.length.at.least', 7);
  });

  it('transaction type dropdown has correct options', () => {
    cy.getByTestId('new-pb-tx-type').find('option').should('have.length.at.least', 5);
  });
});
