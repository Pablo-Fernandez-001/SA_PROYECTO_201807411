import { loginAs, mockBackend } from './utils/mockApi'

describe('E2E UI - Flujo repartidor', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    mockBackend()
    cy.on('window:confirm', () => true)
  })

  it('acepta orden, revisa activas e historial', () => {
    loginAs('repartidor@test.com')

    cy.url().should('include', '/repartidor-dashboard')
    cy.contains('Panel de Repartidor').should('be.visible')
    cy.screenshot('e2e-ui-courier-01-dashboard')

    cy.contains('button', '✅ Aceptar Orden').first().click()
    cy.contains('aceptada').should('be.visible')
    cy.screenshot('e2e-ui-courier-02-orden-aceptada')

    cy.contains('button', '🚗 Mis Entregas Activas').click()
    cy.contains('Entrega #').should('be.visible')

    cy.contains('button', '📋 Historial').click()
    cy.contains('No tienes entregas en tu historial').should('not.exist')
    cy.contains('th', 'Orden').should('be.visible')
    cy.screenshot('e2e-ui-courier-03-historial')
  })
})
