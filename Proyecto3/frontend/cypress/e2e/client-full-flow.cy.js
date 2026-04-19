import { loginAs, mockBackend } from './utils/mockApi'

describe('E2E UI - Flujo completo cliente', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    mockBackend()
  })

  it('completa navegacion, pedido y pago', () => {
    loginAs('cliente@test.com')

    cy.contains('Pizza Planet').click()
    cy.url().should('include', '/restaurant/10')
    cy.contains('Menú').should('be.visible')

    cy.contains('button', '+ Agregar').click()
    cy.contains('button', '+ Agregar').click()
    cy.contains('Cupón aplicado: CUPON10').should('not.exist')
    cy.get('input[placeholder="Ingresar codigo"]').type('CUPON10')
    cy.contains('button', 'Aplicar').click()
    cy.contains('Cupón aplicado: CUPON10').should('be.visible')

    cy.contains('button', 'Realizar Pedido').click()
    cy.contains('¡Pedido creado exitosamente!').should('be.visible')

    cy.contains('a', 'Mis Órdenes').click()
    cy.url().should('include', '/my-orders')
    cy.contains('Mis Pedidos').should('be.visible')
    cy.contains('button', '💰 Pagar').first().click()

    cy.url().should('include', '/payment')
    cy.contains('Pagar Pedido').should('be.visible')
    cy.contains('button', 'USD').click()
    cy.contains('button', 'Continuar al Pago').click()

    cy.get('input[placeholder="4242 4242 4242 4242"]').type('4242424242424242')
    cy.get('input[placeholder="Juan Pérez"]').type('Cliente Cypress')
    cy.get('input[placeholder="MM/YY"]').type('1230')
    cy.get('input[placeholder="123"]').type('123')
    cy.contains('button', 'Revisar Pago').click()

    cy.contains('button', '💰 Pagar').click()
    cy.contains('¡Pago Exitoso!').should('be.visible')
  })
})
