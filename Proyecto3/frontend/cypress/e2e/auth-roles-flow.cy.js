import { loginAs, mockBackend } from './utils/mockApi'

describe('E2E UI - Autenticacion y roles', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    mockBackend()
  })

  it('captura pantalla publica de login', () => {
    cy.visit('/login')
    cy.contains('Iniciar Sesión').should('be.visible')
    cy.screenshot('e2e-ui-auth-01-login-publico', { capture: 'viewport' })
  })

  it('captura pantalla publica de registro', () => {
    cy.visit('/login')
    cy.get('a[href="/register"]').first().click()
    cy.url().should('include', '/register')
    cy.contains('Registrarse').should('be.visible')
    cy.screenshot('e2e-ui-auth-02-registro-publico', { capture: 'viewport' })
  })

  it('valida proteccion de ruta privada', () => {
    cy.visit('/')
    cy.url().should('include', '/login')
    cy.screenshot('e2e-ui-auth-03-ruta-protegida')
  })

  it('login admin con redireccion valida', () => {
    loginAs('admin@delivereats.com')
    cy.contains('Panel Admin').should('be.visible')
    cy.screenshot('e2e-ui-auth-04-admin-login')
  })

  it('login cliente con inicio de compra', () => {
    loginAs('cliente@test.com')
    cy.contains('Restaurantes').should('be.visible')
    cy.contains('Pizza Planet').should('be.visible')
    cy.screenshot('e2e-ui-auth-05-cliente-login')
  })

  it('login restaurante con dashboard propio', () => {
    loginAs('restaurant@test.com')
    cy.url().should('include', '/restaurant-dashboard')
    cy.contains('Dashboard - Pizza Planet').should('be.visible')
    cy.screenshot('e2e-ui-auth-06-restaurante-login', { capture: 'viewport' })
  })

  it('login repartidor con dashboard propio', () => {
    loginAs('repartidor@test.com')
    cy.url().should('include', '/repartidor-dashboard')
    cy.contains('Panel de Repartidor').should('be.visible')
    cy.screenshot('e2e-ui-auth-07-repartidor-login')
  })
})
