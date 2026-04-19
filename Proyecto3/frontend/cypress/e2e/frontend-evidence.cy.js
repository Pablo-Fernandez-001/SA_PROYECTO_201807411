describe('Frontend Evidence - DeliverEats', () => {
  it('captures login page baseline', () => {
    cy.visit('/login')
    cy.contains('Email').should('be.visible')
    cy.contains(/Contrase/i).should('be.visible')
    cy.screenshot('01-login-page')
  })

  it('captures register page baseline', () => {
    cy.visit('/login')
    cy.get('a[href="/register"]').first().click()
    cy.url().should('include', '/register')
    cy.contains('Nombre').should('be.visible')
    cy.contains(/Contrase/i).should('be.visible')
    cy.screenshot('02-register-page')
  })

  it('captures redirect from protected route to login', () => {
    cy.clearLocalStorage()
    cy.visit('/')
    cy.url().should('include', '/login')
    cy.screenshot('03-protected-route-redirect')
  })
})
