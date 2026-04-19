import { loginAs, mockBackend } from './utils/mockApi'

describe('E2E UI - Flujo admin', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    mockBackend()
    cy.on('window:confirm', () => true)
  })

  it('recorre panel admin y gestion de usuarios', () => {
    loginAs('admin@delivereats.com')

    cy.contains('a', 'Panel Admin').click()
    cy.url().should('include', '/admin')
    cy.contains('Panel de Administración').should('be.visible')
    cy.screenshot('e2e-ui-admin-01-panel-general')

    cy.contains('button', 'Menu Items').click()
    cy.contains('Items de Menú').should('be.visible')

    cy.contains('button', '💳 Pagos').click()
    cy.contains('Pagos').should('be.visible')
    cy.screenshot('e2e-ui-admin-02-tab-pagos')

    cy.contains('button', '💱 FX Cache').click()
    cy.contains('Estado del Servicio FX').should('be.visible')
    cy.screenshot('e2e-ui-admin-03-tab-fx')

    cy.contains('button', 'Usuarios').click()
    cy.url().should('include', '/admin/users')
    cy.contains('Panel de Administración').should('be.visible')

    cy.contains('button', 'Registrar Usuario').click({ force: true })
    cy.contains('Registrar Nuevo Usuario').should('be.visible')
    cy.get('input[name="name"]').type('Nuevo Operador')
    cy.get('input[name="email"]').type('operador@demo.com')
    cy.get('input[name="password"]').type('admin123')
    cy.get('select[name="role"]').select('REPARTIDOR')
    cy.screenshot('e2e-ui-admin-04-registro-usuario')
    cy.get('form').within(() => {
      cy.contains('button', 'Registrar Usuario').click({ force: true })
    })
  })
})
