import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://34.55.27.36:8080/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't clear on login attempts
      if (!error.config.url.includes('/auth/login')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  validate: (token) => api.post('/auth/validate', { token }),
  getUsers: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  updateRole: (id, role) => api.put(`/auth/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
}

// ─── Catalog ─────────────────────────────────────────────────────────────────
export const catalogAPI = {
  getRestaurants: () => api.get('/catalog/restaurants'),
  searchCatalog: (params = {}) => api.get('/catalog/search', { params }),
  getRestaurant: (id) => api.get(`/catalog/restaurants/${id}`),
  getMenu: (restaurantId, all = false) => api.get(`/catalog/restaurants/${restaurantId}/menu${all ? '?all=true' : ''}`),
  getAllMenuItems: () => api.get('/catalog/menu-items'),
  getPromotions: (params = {}) => api.get('/catalog/promotions', { params }),
  getCoupons: (params = {}) => api.get('/catalog/coupons', { params }),
  createPromotion: (data) => api.post('/catalog/promotions', data),
  createCoupon: (data) => api.post('/catalog/coupons', data),
  togglePromotion: (id) => api.patch(`/catalog/promotions/${id}/toggle`),
  toggleCoupon: (id) => api.patch(`/catalog/coupons/${id}/toggle`),
  deletePromotion: (id) => api.delete(`/catalog/promotions/${id}`),
  deleteCoupon: (id) => api.delete(`/catalog/coupons/${id}`),
  validatePromotion: (data) => api.post('/catalog/promotions/validate', data),
  validateCoupon: (data) => api.post('/catalog/coupons/validate', data),
  createRestaurantRating: (data) => api.post('/catalog/ratings/restaurants', data),
  createMenuItemRating: (data) => api.post('/catalog/ratings/menu-items', data),
  getRestaurantRating: (restaurantId) => api.get(`/catalog/ratings/restaurants/${restaurantId}`),
  getMenuItemRating: (menuItemId) => api.get(`/catalog/ratings/menu-items/${menuItemId}`),
  createRestaurant: (data) => api.post('/catalog/restaurants', data),
  updateRestaurant: (id, data) => api.put(`/catalog/restaurants/${id}`, data),
  deleteRestaurant: (id) => api.delete(`/catalog/restaurants/${id}`),
  toggleRestaurant: (id) => api.patch(`/catalog/restaurants/${id}/toggle`),
  createMenuItem: (data) => api.post('/catalog/menu-items', data),
  updateMenuItem: (id, data) => api.put(`/catalog/menu-items/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/catalog/menu-items/${id}`),
  toggleMenuItem: (id) => api.patch(`/catalog/menu-items/${id}/toggle`),
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export const ordersAPI = {
  getOrders: () => api.get('/orders'),
  getAll: () => api.get('/orders'),
  getByUser: (userId) => api.get(`/orders/user/${userId}`),
  getByRestaurant: (restaurantId) => api.get(`/orders/restaurant/${restaurantId}`),
  getById: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  reject: (id, reason) => api.post(`/orders/${id}/reject`, { reason }),
}

// ─── Delivery ────────────────────────────────────────────────────────────────
export const deliveryAPI = {
  getDeliveries: () => api.get('/delivery'),
  getAll: () => api.get('/delivery'),
  getByCourier: (courierId) => api.get(`/delivery/courier/${courierId}`),
  getActiveByCourier: (courierId) => api.get(`/delivery/courier/${courierId}/active`),
  getById: (id) => api.get(`/delivery/${id}`),
  getByOrder: (orderId) => api.get(`/delivery/order/${orderId}`),
  getAvailableOrders: () => api.get('/delivery/available-orders'),
  acceptOrder: (data) => api.post('/delivery/accept', data),
  create: (data) => api.post('/delivery', data),
  start: (id) => api.post(`/delivery/${id}/start`),
  complete: (id, data) => api.post(`/delivery/${id}/complete`, data),
  fail: (id, reason) => api.post(`/delivery/${id}/fail`, { reason }),
  cancel: (id) => api.post(`/delivery/${id}/cancel`),
  reassign: (id, courierId) => api.put(`/delivery/${id}/reassign`, { courierId }),
  getPhoto: (id) => api.get(`/delivery/${id}/photo`),
  getPhotoByOrder: (orderId) => api.get(`/delivery/order/${orderId}/photo`),
  createCourierRating: (data) => api.post('/delivery/ratings/couriers', data),
  getCourierRating: (courierId) => api.get(`/delivery/ratings/couriers/${courierId}`),
}

// ─── FX (Divisas) ────────────────────────────────────────────────────────────
export const fxAPI = {
  getRate: (from, to) => api.get(`/fx/rate?from=${from}&to=${to}`),
  getRates: (base, targets) => api.get(`/fx/rates?base=${base}&targets=${targets}`),
  convert: (data) => api.post('/fx/convert', data),
  getCurrencies: () => api.get('/fx/currencies'),
  getCacheStats: () => api.get('/fx/cache/stats'),
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export const paymentAPI = {
  processPayment: (data) => api.post('/payments/process', data),
  processRefund: (data) => api.post('/payments/refund', data),
  getByOrder: (orderId) => api.get(`/payments/order/${orderId}`),
  getAll: () => api.get('/payments'),
  convertCurrency: (from, to, amount) => api.get(`/payments/fx/convert?from=${from}&to=${to}&amount=${amount}`),
}

export default api
