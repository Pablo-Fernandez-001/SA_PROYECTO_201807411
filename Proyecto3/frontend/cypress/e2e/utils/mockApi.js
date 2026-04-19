const USERS = {
  ADMIN: {
    id: 1,
    name: 'Admin Principal',
    email: 'admin@delivereats.com',
    role: 'ADMIN',
    is_active: true,
  },
  CLIENTE: {
    id: 2,
    name: 'Cliente Demo',
    email: 'cliente@test.com',
    role: 'CLIENTE',
    is_active: true,
  },
  RESTAURANTE: {
    id: 3,
    name: 'Restaurante Demo',
    email: 'restaurant@test.com',
    role: 'RESTAURANTE',
    is_active: true,
  },
  REPARTIDOR: {
    id: 4,
    name: 'Repartidor Demo',
    email: 'repartidor@test.com',
    role: 'REPARTIDOR',
    is_active: true,
  },
}

const USERS_BY_EMAIL = {
  'admin@delivereats.com': USERS.ADMIN,
  'cliente@test.com': USERS.CLIENTE,
  'restaurant@test.com': USERS.RESTAURANTE,
  'repartidor@test.com': USERS.REPARTIDOR,
}

function buildInitialState() {
  const restaurants = [
    {
      id: 10,
      name: 'Pizza Planet',
      description: 'Pizzas artesanales y combos',
      category: 'Italiana',
      address: 'Zona 10, Guatemala',
      ownerId: 3,
      is_active: true,
    },
    {
      id: 11,
      name: 'Sushi Central',
      description: 'Sushi premium',
      category: 'Asiatica',
      address: 'Zona 14, Guatemala',
      ownerId: 30,
      is_active: true,
    },
  ]

  const menuItems = [
    {
      id: 1001,
      restaurant_id: 10,
      restaurantId: 10,
      name: 'Pizza Suprema',
      description: 'Queso, pepperoni y vegetales',
      category: 'Pizza',
      price: 45,
      stock: 25,
      is_available: true,
      isAvailable: true,
    },
    {
      id: 1002,
      restaurant_id: 10,
      restaurantId: 10,
      name: 'Limonada',
      description: 'Bebida natural',
      category: 'Bebida',
      price: 12,
      stock: 50,
      is_available: true,
      isAvailable: true,
    },
    {
      id: 1101,
      restaurant_id: 11,
      restaurantId: 11,
      name: 'Sushi Roll',
      description: 'Roll clasico',
      category: 'Sushi',
      price: 55,
      stock: 15,
      is_available: true,
      isAvailable: true,
    },
  ]

  const orders = [
    {
      id: 501,
      order_number: 'ORD-501',
      user_id: 2,
      restaurant_id: 10,
      restaurantId: 10,
      restaurant_name: 'Pizza Planet',
      restaurantName: 'Pizza Planet',
      total: 57,
      status: 'PAGADO',
      delivery_address: 'Zona 1, Guatemala',
      created_at: '2026-04-19T09:15:00.000Z',
      items: [
        {
          menuItemExternalId: 1001,
          name: 'Pizza Suprema',
          quantity: 1,
          price: 45,
          subtotal: 45,
        },
        {
          menuItemExternalId: 1002,
          name: 'Limonada',
          quantity: 1,
          price: 12,
          subtotal: 12,
        },
      ],
    },
    {
      id: 502,
      order_number: 'ORD-502',
      user_id: 2,
      restaurant_id: 10,
      restaurantId: 10,
      restaurant_name: 'Pizza Planet',
      restaurantName: 'Pizza Planet',
      total: 50,
      status: 'ENTREGADO',
      delivery_address: 'Zona 12, Guatemala',
      created_at: '2026-04-18T13:00:00.000Z',
      items: [
        {
          menuItemExternalId: 1001,
          name: 'Pizza Suprema',
          quantity: 1,
          price: 50,
          subtotal: 50,
        },
      ],
    },
    {
      id: 503,
      order_number: 'ORD-503',
      user_id: 2,
      restaurant_id: 10,
      restaurantId: 10,
      restaurant_name: 'Pizza Planet',
      restaurantName: 'Pizza Planet',
      total: 45,
      status: 'FINALIZADA',
      delivery_address: 'Zona 4, Guatemala',
      created_at: '2026-04-19T12:00:00.000Z',
      items: [
        {
          menuItemExternalId: 1001,
          name: 'Pizza Suprema',
          quantity: 1,
          price: 45,
          subtotal: 45,
        },
      ],
    },
  ]

  const deliveries = [
    {
      id: 700,
      orderExternalId: 503,
      order_external_id: 503,
      status: 'EN_CAMINO',
      deliveryAddress: 'Zona 4, Guatemala',
      courier_id: 4,
      startedAt: '2026-04-19T12:20:00.000Z',
      deliveredAt: null,
      durationMinutes: null,
    },
    {
      id: 701,
      orderExternalId: 502,
      order_external_id: 502,
      status: 'ENTREGADO',
      deliveryAddress: 'Zona 12, Guatemala',
      courier_id: 4,
      startedAt: '2026-04-18T13:10:00.000Z',
      deliveredAt: '2026-04-18T13:45:00.000Z',
      durationMinutes: 35,
    },
  ]

  const payments = [
    {
      id: 900,
      order_id: 501,
      payment_number: 'PAY-501',
      transaction_id: 'TX-501',
      amount: 57,
      currency: 'GTQ',
      status: 'COMPLETADO',
      created_at: '2026-04-19T09:20:00.000Z',
    },
  ]

  const promotions = [
    {
      id: 801,
      restaurant_id: 10,
      title: 'Promo Almuerzo',
      description: '10% de descuento',
      discount_type: 'PERCENT',
      discount_value: 10,
      is_active: true,
    },
  ]

  const coupons = [
    {
      id: 851,
      restaurant_id: 10,
      code: 'CUPON10',
      discount_type: 'AMOUNT',
      discount_value: 10,
      is_active: true,
    },
  ]

  return {
    users: [
      { ...USERS.ADMIN, created_at: '2026-01-01T00:00:00.000Z' },
      { ...USERS.CLIENTE, created_at: '2026-01-02T00:00:00.000Z' },
      { ...USERS.RESTAURANTE, created_at: '2026-01-03T00:00:00.000Z' },
      { ...USERS.REPARTIDOR, created_at: '2026-01-04T00:00:00.000Z' },
    ],
    restaurants,
    menuItems,
    orders,
    deliveries,
    payments,
    promotions,
    coupons,
  }
}

function getUserFromToken(token) {
  if (!token) return USERS.CLIENTE
  const lower = String(token).toLowerCase()
  if (lower.includes('admin')) return USERS.ADMIN
  if (lower.includes('restaurant')) return USERS.RESTAURANTE
  if (lower.includes('repartidor')) return USERS.REPARTIDOR
  return USERS.CLIENTE
}

export function loginAs(email, password = 'admin123') {
  cy.visit('/login')
  cy.get('input[type="email"]').clear().type(email)
  cy.get('input[type="password"]').clear().type(password)
  cy.contains('button', 'Ingresar').click()
}

export function mockBackend() {
  const state = buildInitialState()

  cy.intercept('POST', '**/api/auth/login', (req) => {
    const selected = USERS_BY_EMAIL[req.body?.email] || USERS.CLIENTE
    req.reply({
      statusCode: 200,
      body: {
        success: true,
        data: {
          user: selected,
          token: `token-${selected.role.toLowerCase()}`,
        },
      },
    })
  })

  cy.intercept('POST', '**/api/auth/register', (req) => {
    const newUser = {
      id: 100 + state.users.length,
      name: req.body?.name || 'Usuario Nuevo',
      email: req.body?.email || `nuevo-${Date.now()}@test.com`,
      role: req.body?.role || 'CLIENTE',
      is_active: true,
      created_at: new Date().toISOString(),
    }
    state.users.push(newUser)
    req.reply({ statusCode: 200, body: { success: true, data: { user: newUser, token: 'token-cliente' } } })
  })

  cy.intercept('POST', '**/api/auth/validate', (req) => {
    const user = getUserFromToken(req.body?.token)
    req.reply({ statusCode: 200, body: { success: true, data: { valid: true, user } } })
  })

  cy.intercept('GET', '**/api/auth/users', {
    statusCode: 200,
    body: { success: true, data: state.users },
  })

  cy.intercept('POST', '**/api/auth/admin/register', (req) => {
    const user = {
      id: 100 + state.users.length,
      name: req.body?.name || 'Usuario Registrado',
      email: req.body?.email || `registro-${Date.now()}@test.com`,
      role: req.body?.role || 'CLIENTE',
      is_active: true,
      created_at: new Date().toISOString(),
    }
    state.users.push(user)
    req.reply({ statusCode: 201, body: { success: true, data: user } })
  })

  cy.intercept('PUT', /.*\/api\/auth\/users\/\d+$/, (req) => {
    req.reply({ statusCode: 200, body: { success: true } })
  })

  cy.intercept('PUT', /.*\/api\/auth\/users\/\d+\/role$/, (req) => {
    req.reply({ statusCode: 200, body: { success: true } })
  })

  cy.intercept('DELETE', /.*\/api\/auth\/users\/\d+$/, (req) => {
    req.reply({ statusCode: 200, body: { success: true } })
  })

  cy.intercept('GET', '**/api/catalog/restaurants', {
    statusCode: 200,
    body: { success: true, data: state.restaurants },
  })

  cy.intercept('GET', /.*\/api\/catalog\/restaurants\/\d+$/, (req) => {
    const id = Number(req.url.split('/').pop())
    const restaurant = state.restaurants.find((r) => r.id === id)
    req.reply({ statusCode: 200, body: { success: true, data: restaurant || state.restaurants[0] } })
  })

  cy.intercept('GET', /.*\/api\/catalog\/restaurants\/\d+\/menu.*/, (req) => {
    const match = req.url.match(/restaurants\/(\d+)\/menu/)
    const restaurantId = Number(match?.[1])
    const items = state.menuItems.filter((item) => item.restaurant_id === restaurantId)
    req.reply({ statusCode: 200, body: { success: true, data: items } })
  })

  cy.intercept('GET', '**/api/catalog/search*', (req) => {
    const url = new URL(req.url)
    const restaurantId = Number(url.searchParams.get('restaurantId'))
    const includeMenu = url.searchParams.get('includeMenu')
    const query = (url.searchParams.get('q') || '').toLowerCase()

    if (restaurantId || includeMenu === 'true') {
      let menu = state.menuItems.filter((item) => !restaurantId || item.restaurant_id === restaurantId)
      if (query) {
        menu = menu.filter((item) => item.name.toLowerCase().includes(query))
      }
      req.reply({ statusCode: 200, body: { success: true, data: { menuItems: menu } } })
      return
    }

    let restaurants = [...state.restaurants]
    if (query) {
      restaurants = restaurants.filter((r) => r.name.toLowerCase().includes(query))
    }
    req.reply({ statusCode: 200, body: { success: true, data: { restaurants } } })
  })

  cy.intercept('GET', '**/api/catalog/menu-items', {
    statusCode: 200,
    body: { success: true, data: state.menuItems },
  })

  cy.intercept('GET', /.*\/api\/catalog\/ratings\/restaurants\/\d+$/, {
    statusCode: 200,
    body: { success: true, data: { average: 4.7 } },
  })

  cy.intercept('GET', /.*\/api\/catalog\/ratings\/menu-items\/\d+$/, {
    statusCode: 200,
    body: { success: true, data: { average: 4.5 } },
  })

  cy.intercept('GET', '**/api/catalog/promotions*', {
    statusCode: 200,
    body: { success: true, data: state.promotions },
  })

  cy.intercept('GET', '**/api/catalog/coupons*', {
    statusCode: 200,
    body: { success: true, data: state.coupons },
  })

  cy.intercept('POST', '**/api/catalog/promotions/validate', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        valid: true,
        promotion: state.promotions[0],
        discountAmount: 5,
      },
    },
  })

  cy.intercept('POST', '**/api/catalog/coupons/validate', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        valid: true,
        coupon: state.coupons[0],
        discountAmount: 10,
      },
    },
  })

  cy.intercept('POST', '**/api/catalog/promotions', (req) => {
    const promo = {
      id: 900 + state.promotions.length,
      restaurant_id: Number(req.body?.restaurantId || 10),
      title: req.body?.title || 'Promo',
      description: req.body?.description || '',
      discount_type: req.body?.discountType || 'PERCENT',
      discount_value: Number(req.body?.discountValue || 10),
      is_active: true,
    }
    state.promotions.push(promo)
    req.reply({ statusCode: 201, body: { success: true, data: promo } })
  })

  cy.intercept('POST', '**/api/catalog/coupons', (req) => {
    const coupon = {
      id: 950 + state.coupons.length,
      restaurant_id: Number(req.body?.restaurantId || 10),
      code: req.body?.code || 'CUP-AUTO',
      discount_type: req.body?.discountType || 'PERCENT',
      discount_value: Number(req.body?.discountValue || 10),
      is_active: true,
    }
    state.coupons.push(coupon)
    req.reply({ statusCode: 201, body: { success: true, data: coupon } })
  })

  cy.intercept('PATCH', '**/api/catalog/promotions/*/toggle', { statusCode: 200, body: { success: true } })
  cy.intercept('PATCH', '**/api/catalog/coupons/*/toggle', { statusCode: 200, body: { success: true } })
  cy.intercept('DELETE', '**/api/catalog/promotions/*', { statusCode: 200, body: { success: true } })
  cy.intercept('DELETE', '**/api/catalog/coupons/*', { statusCode: 200, body: { success: true } })

  cy.intercept('POST', '**/api/catalog/menu-items', (req) => {
    const item = {
      id: 1200 + state.menuItems.length,
      restaurant_id: Number(req.body?.restaurant_id || req.body?.restaurantId || 10),
      restaurantId: Number(req.body?.restaurant_id || req.body?.restaurantId || 10),
      name: req.body?.name || 'Item Nuevo',
      description: req.body?.description || '',
      category: req.body?.category || 'General',
      price: Number(req.body?.price || 20),
      stock: Number(req.body?.stock || 100),
      is_available: true,
      isAvailable: true,
    }
    state.menuItems.push(item)
    req.reply({ statusCode: 201, body: { success: true, data: item } })
  })

  cy.intercept('PUT', '**/api/catalog/menu-items/*', { statusCode: 200, body: { success: true } })
  cy.intercept('PATCH', '**/api/catalog/menu-items/*/toggle', { statusCode: 200, body: { success: true } })
  cy.intercept('DELETE', '**/api/catalog/menu-items/*', { statusCode: 200, body: { success: true } })

  cy.intercept('POST', '**/api/catalog/restaurants', (req) => {
    const restaurant = {
      id: 20 + state.restaurants.length,
      name: req.body?.name || 'Restaurante Nuevo',
      description: req.body?.description || '',
      category: req.body?.category || 'General',
      address: req.body?.address || 'Dirección',
      ownerId: Number(req.body?.ownerId || 3),
      is_active: true,
    }
    state.restaurants.push(restaurant)
    req.reply({ statusCode: 201, body: { success: true, data: restaurant } })
  })

  cy.intercept('PUT', '**/api/catalog/restaurants/*', { statusCode: 200, body: { success: true } })
  cy.intercept('PATCH', '**/api/catalog/restaurants/*/toggle', { statusCode: 200, body: { success: true } })
  cy.intercept('DELETE', '**/api/catalog/restaurants/*', { statusCode: 200, body: { success: true } })

  cy.intercept('GET', '**/api/orders/user/*', (req) => {
    const userId = Number(req.url.split('/').pop())
    req.reply({ statusCode: 200, body: { success: true, data: state.orders.filter((o) => o.user_id === userId) } })
  })

  cy.intercept('GET', '**/api/orders/restaurant/*', (req) => {
    const restaurantId = Number(req.url.split('/').pop())
    req.reply({ statusCode: 200, body: { success: true, data: state.orders.filter((o) => o.restaurant_id === restaurantId) } })
  })

  cy.intercept('GET', /.*\/api\/orders\/\d+$/, (req) => {
    const id = Number(req.url.split('/').pop())
    const order = state.orders.find((o) => o.id === id)
    req.reply({ statusCode: 200, body: { success: true, data: order } })
  })

  cy.intercept('GET', '**/api/orders', {
    statusCode: 200,
    body: { success: true, data: state.orders },
  })

  cy.intercept('POST', '**/api/orders', (req) => {
    const created = {
      id: 1000 + state.orders.length,
      order_number: `ORD-${1000 + state.orders.length}`,
      user_id: USERS.CLIENTE.id,
      restaurant_id: Number(req.body?.restaurant_id || 10),
      restaurantId: Number(req.body?.restaurant_id || 10),
      restaurant_name: 'Pizza Planet',
      restaurantName: 'Pizza Planet',
      total: Number(req.body?.items?.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0) || 0),
      status: 'CREADA',
      delivery_address: req.body?.delivery_address || 'Dirección',
      created_at: new Date().toISOString(),
      items: (req.body?.items || []).map((item) => ({
        menuItemExternalId: item.menu_item_id,
        name: state.menuItems.find((m) => m.id === item.menu_item_id)?.name || 'Item',
        quantity: item.quantity,
        price: item.unit_price,
        subtotal: Number(item.unit_price) * Number(item.quantity),
      })),
    }
    state.orders.unshift(created)
    req.reply({ statusCode: 201, body: { success: true, data: { id: created.id }, order: { id: created.id } } })
  })

  cy.intercept('PATCH', '**/api/orders/*/status', (req) => {
    const id = Number(req.url.match(/orders\/(\d+)\/status/)?.[1])
    const order = state.orders.find((o) => o.id === id)
    if (order) {
      order.status = req.body?.status || order.status
    }
    req.reply({ statusCode: 200, body: { success: true } })
  })

  cy.intercept('POST', '**/api/orders/*/cancel', (req) => {
    const id = Number(req.url.match(/orders\/(\d+)\/cancel/)?.[1])
    const order = state.orders.find((o) => o.id === id)
    if (order) {
      order.status = 'CANCELADO'
    }
    req.reply({ statusCode: 200, body: { success: true } })
  })

  cy.intercept('POST', '**/api/orders/*/reject', (req) => {
    const id = Number(req.url.match(/orders\/(\d+)\/reject/)?.[1])
    const order = state.orders.find((o) => o.id === id)
    if (order) {
      order.status = 'RECHAZADA'
    }
    req.reply({ statusCode: 200, body: { success: true } })
  })

  cy.intercept('GET', '**/api/delivery/available-orders', {
    statusCode: 200,
    body: {
      success: true,
      data: [
        {
          id: 503,
          orderNumber: 'ORD-503',
          status: 'FINALIZADA',
          restaurantName: 'Pizza Planet',
          deliveryAddress: 'Zona 4, Guatemala',
          total: 45,
        },
      ],
    },
  })

  cy.intercept('GET', '**/api/delivery/courier/*/active', {
    statusCode: 200,
    body: { success: true, data: state.deliveries.filter((d) => d.status === 'EN_CAMINO') },
  })

  cy.intercept('GET', '**/api/delivery/courier/*', {
    statusCode: 200,
    body: { success: true, data: state.deliveries },
  })

  cy.intercept('GET', '**/api/delivery/order/*', {
    statusCode: 200,
    body: { success: true, data: { courier_id: 4 } },
  })

  cy.intercept('GET', '**/api/delivery/order/*/photo', {
    statusCode: 200,
    body: { success: true, data: { photo: 'aGVsbG8=', content_type: 'image/jpeg' } },
  })

  cy.intercept('GET', '**/api/delivery/*/photo', {
    statusCode: 200,
    body: { success: true, data: { photo: 'aGVsbG8=', content_type: 'image/jpeg' } },
  })

  cy.intercept('POST', '**/api/delivery/accept', {
    statusCode: 200,
    body: { success: true, data: { id: 800, status: 'EN_CAMINO' } },
  })

  cy.intercept('POST', '**/api/delivery/*/start', { statusCode: 200, body: { success: true } })
  cy.intercept('POST', '**/api/delivery/*/complete', { statusCode: 200, body: { success: true } })
  cy.intercept('POST', '**/api/delivery/*/fail', { statusCode: 200, body: { success: true } })
  cy.intercept('POST', '**/api/delivery/*/cancel', { statusCode: 200, body: { success: true } })
  cy.intercept('POST', '**/api/delivery/ratings/couriers', { statusCode: 200, body: { success: true } })
  cy.intercept('POST', '**/api/catalog/ratings/restaurants', { statusCode: 200, body: { success: true } })
  cy.intercept('POST', '**/api/catalog/ratings/menu-items', { statusCode: 200, body: { success: true } })

  cy.intercept('GET', '**/api/payments', {
    statusCode: 200,
    body: { success: true, data: state.payments },
  })

  cy.intercept('GET', '**/api/payments/order/*', {
    statusCode: 200,
    body: { success: true, data: state.payments[0] },
  })

  cy.intercept('POST', '**/api/payments/process', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        payment_number: 'PAY-NEW-001',
        transaction_id: 'TX-NEW-001',
        status: 'COMPLETADO',
        amount_usd: 7.5,
      },
    },
  })

  cy.intercept('POST', '**/api/payments/refund', {
    statusCode: 200,
    body: { success: true, data: { status: 'REEMBOLSADO' } },
  })

  cy.intercept('POST', '**/api/fx/convert', {
    statusCode: 200,
    body: { success: true, data: { converted_amount: 7.5, rate: 0.131578 } },
  })

  cy.intercept('GET', '**/api/fx/cache/stats', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        cache_keys: 2,
        fallback_keys: 1,
        total_keys: 3,
        used_memory: '1.2MB',
        cache_ttl: 300,
        connected: true,
      },
    },
  })
}
