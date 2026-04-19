describe('Frontend Evidence - DeliverEats', () => {
  it('captures login page baseline', () => {
    cy.visit('/login')
    cy.contains('Email').should('be.visible')
    cy.contains(/Contrase/i).should('be.visible')
    cy.screenshot('e2e-ui-base-01-login-page', { capture: 'viewport' })
  })

  it('captures register page baseline', () => {
    cy.visit('/login')
    cy.get('a[href="/register"]').first().click()
    cy.url().should('include', '/register')
    cy.contains('Nombre').should('be.visible')
    cy.contains(/Contrase/i).should('be.visible')
    cy.screenshot('e2e-ui-base-02-register-page', { capture: 'viewport' })
  })

  it('captures redirect from protected route to login', () => {
    cy.clearLocalStorage()
    cy.visit('/')
    cy.url().should('include', '/login')
    cy.screenshot('e2e-ui-base-03-protected-route-redirect', { capture: 'viewport' })
  })
})
