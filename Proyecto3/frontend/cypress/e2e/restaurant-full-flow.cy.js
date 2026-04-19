import { loginAs, mockBackend } from './utils/mockApi'

describe('E2E UI - Flujo restaurante', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    mockBackend()
    cy.on('window:confirm', () => true)
  })

  it('gestiona menu, inventario, ordenes y promociones', () => {
    loginAs('restaurant@test.com')

    cy.url().should('include', '/restaurant-dashboard')
    cy.contains('Dashboard - Pizza Planet').should('be.visible')
    cy.screenshot('e2e-ui-restaurant-01-dashboard')

    cy.contains('button', 'Inventario').click()
    cy.contains('Control de Inventario').should('be.visible')

    cy.contains('button', 'Órdenes Recibidas').click()
    cy.contains('Órdenes Recibidas').should('be.visible')
    cy.contains('button', '✅ Aceptar').first().click()
    cy.screenshot('e2e-ui-restaurant-02-orden-aceptada')

    cy.contains('button', 'Cupones y Promos').click()
    cy.contains('Crear promocion').should('be.visible')
    cy.get('input[placeholder="Titulo de la promocion"]').type('Promo Cypress')
    cy.get('input[placeholder="Ej: 15"]').clear().type('15')
    cy.contains('button', 'Guardar promocion').click()

    cy.contains('Crear cupon').should('be.visible')
    cy.get('input[placeholder="Codigo (dejar vacio para generar)"]').type('CYPRESS15')
    cy.get('input[placeholder="Ej: 10"]').clear().type('10')
    cy.contains('button', 'Guardar cupon').click()
  })
})
