import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { catalogAPI, ordersAPI } from '../services/api'
import useAuthStore from '../stores/authStore'

export default function RestaurantMenu() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [promoValidation, setPromoValidation] = useState(null)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponValidation, setCouponValidation] = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponError, setCouponError] = useState(null)
  const [restaurantRating, setRestaurantRating] = useState(0)
  const [itemRatings, setItemRatings] = useState({})
  const [itemSearch, setItemSearch] = useState('')
  const [itemCategory, setItemCategory] = useState('')

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const totalDiscount = Math.min(cartTotal, promoDiscount + couponDiscount)
  const totalAfterDiscount = Math.max(0, cartTotal - totalDiscount)

  const validatePromotion = async () => {
    if (!id || cartTotal <= 0) {
      setPromoValidation(null)
      setPromoDiscount(0)
      return
    }
    try {
      const res = await catalogAPI.validatePromotion({ restaurantId: parseInt(id), subtotal: cartTotal })
      const payload = res.data?.data || res.data
      if (payload?.valid) {
        setPromoValidation(payload.promotion)
        setPromoDiscount(payload.discountAmount || 0)
      } else {
        setPromoValidation(null)
        setPromoDiscount(0)
      }
    } catch (err) {
      console.error('Error validating promotion:', err)
      setPromoValidation(null)
      setPromoDiscount(0)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  useEffect(() => {
    if (!restaurant?.id) return
    searchMenuItems()
  }, [itemSearch, itemCategory, restaurant?.id])

  useEffect(() => {
    validatePromotion()
  }, [cartTotal, id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [restRes, menuRes] = await Promise.all([
        catalogAPI.getRestaurant(id),
        catalogAPI.getMenu(id)
      ])
      const restaurantData = restRes.data.data || restRes.data
      const itemsData = menuRes.data.data || menuRes.data || []
      setRestaurant(restaurantData)
      setMenuItems(itemsData)
      fetchRatings(restaurantData?.id, itemsData)
    } catch (err) {
      setError('Error al cargar el menú: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const searchMenuItems = async () => {
    try {
      const res = await catalogAPI.searchCatalog({
        restaurantId: id,
        q: itemSearch || undefined,
        foodType: itemCategory || undefined,
        includeMenu: 'true'
      })
      const data = res.data.data || res.data
      const items = data?.menuItems || []
      setMenuItems(items)
      fetchRatings(restaurant?.id || id, items)
    } catch (err) {
      console.error('Error searching menu items:', err)
    }
  }

  const fetchRatings = async (restaurantId, items) => {
    if (!restaurantId) return
    try {
      const res = await catalogAPI.getRestaurantRating(restaurantId)
      const data = res.data.data || res.data
      setRestaurantRating(data?.average || 0)
    } catch {
      setRestaurantRating(0)
    }
    try {
      const entries = await Promise.all(items.map(async (item) => {
        try {
          const res = await catalogAPI.getMenuItemRating(item.id)
          const data = res.data.data || res.data
          return [item.id, data?.average || 0]
        } catch {
          return [item.id, 0]
        }
      }))
      setItemRatings(Object.fromEntries(entries))
    } catch {
      setItemRatings({})
    }
  }

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id)
      if (existing) {
        return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: parseFloat(item.price), quantity: 1 }]
    })
  }

  const removeFromCart = (menuItemId) => {
    setCart(prev => prev.filter(c => c.menu_item_id !== menuItemId))
  }

  const updateQty = (menuItemId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.menu_item_id !== menuItemId) return c
      const newQty = c.quantity + delta
      return newQty < 1 ? c : { ...c, quantity: newQty }
    }))
  }

  const applyCoupon = async () => {
    setCouponError(null)
    if (!couponCode.trim() || cartTotal <= 0) return
    try {
      const res = await catalogAPI.validateCoupon({
        restaurantId: parseInt(id),
        code: couponCode.trim(),
        subtotal: cartTotal
      })
      const payload = res.data?.data || res.data
      if (payload?.valid) {
        setCouponValidation(payload.coupon)
        setCouponDiscount(payload.discountAmount || 0)
      } else {
        setCouponValidation(null)
        setCouponDiscount(0)
        setCouponError('Cupon no valido para este pedido')
      }
    } catch (err) {
      setCouponValidation(null)
      setCouponDiscount(0)
      setCouponError(err.response?.data?.message || 'Error validando cupon')
    }
  }

  const clearCoupon = () => {
    setCouponCode('')
    setCouponValidation(null)
    setCouponDiscount(0)
    setCouponError(null)
  }

  const placeOrder = async () => {
    if (cart.length === 0) return
    setOrderLoading(true)
    setMessage(null)
    setError(null)
    try {
      const notesParts = []
      if (promoValidation) {
        notesParts.push(`Promo: ${promoValidation.title} (${promoValidation.discount_type === 'PERCENT' ? promoValidation.discount_value + '%' : 'Q' + promoValidation.discount_value})`)
      }
      if (couponValidation) {
        notesParts.push(`Cupon: ${couponValidation.code} (${couponValidation.discount_type === 'PERCENT' ? couponValidation.discount_value + '%' : 'Q' + couponValidation.discount_value})`)
      }

      const orderData = {
        restaurant_id: parseInt(id),
        items: cart.map(c => ({
          menu_item_id: c.menu_item_id,
          quantity: c.quantity,
          unit_price: c.price
        })),
        delivery_address: 'Dirección de prueba, Ciudad de Guatemala',
        notes: notesParts.join(' | ')
      }
      const res = await ordersAPI.createOrder(orderData)
      const orderId = res.data?.order?.id || res.data?.data?.id || res.data?.orderId
      if (orderId && totalDiscount > 0) {
        const raw = localStorage.getItem('order-discounts')
        const current = raw ? JSON.parse(raw) : {}
        current[String(orderId)] = {
          discountAmount: totalDiscount,
          promo: promoValidation,
          coupon: couponValidation
        }
        localStorage.setItem('order-discounts', JSON.stringify(current))
      }
      setMessage('¡Pedido creado exitosamente! ID: ' + (orderId || 'OK'))
      setCart([])
      setPromoValidation(null)
      setPromoDiscount(0)
      clearCoupon()
    } catch (err) {
      const errData = err.response?.data
      let errMsg = errData?.message || err.message
      if (errData?.failedItems) {
        errMsg += '\n\nDetalles de validación gRPC:\n' +
          errData.failedItems.map(f => `• Item ${f.menu_item_id}: ${f.error_message}`).join('\n')
      }
      setError('Error al crear pedido: ' + errMsg)
    } finally {
      setOrderLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => navigate('/')} className="text-orange-600 hover:underline mb-4 inline-block">
        ← Volver a restaurantes
      </button>

      {restaurant && (
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 mb-6 text-white">
          <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          <p className="mt-1 opacity-90">{restaurant.description || 'Restaurante disponible'}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-block text-sm bg-white/20 px-3 py-1 rounded-full">
              {restaurant.category || 'General'}
            </span>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              ⭐ {Number(restaurantRating || 0).toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 whitespace-pre-wrap">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Menú</h2>
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="border border-gray-200 rounded-lg px-3 py-2"
              />
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="">Categoria de producto</option>
                {Array.from(new Set(menuItems.map(i => i.category).filter(Boolean))).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          {menuItems.length === 0 ? (
            <p className="text-gray-400">No hay items disponibles.</p>
          ) : (
            <div className="space-y-3">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.description || ''}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-orange-600 font-bold">Q{parseFloat(item.price).toFixed(2)}</span>
                      <span className={`text-xs ${item.is_available ? 'text-green-500' : 'text-red-500'}`}>
                        {item.is_available ? 'Disponible' : 'No disponible'}
                      </span>
                      <span className="text-xs text-gray-400">⭐ {Number(itemRatings[item.id] || 0).toFixed(1)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.is_available}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div>
          <div className="bg-white rounded-2xl shadow-md p-5 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Carrito</h2>
            {cart.length === 0 ? (
              <p className="text-gray-400 text-sm">Tu carrito está vacío</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map(c => (
                    <div key={c.menu_item_id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-gray-500">Q{c.price.toFixed(2)} x {c.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.menu_item_id, -1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">-</button>
                        <span className="w-6 text-center text-sm">{c.quantity}</span>
                        <button onClick={() => updateQty(c.menu_item_id, 1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">+</button>
                        <button onClick={() => removeFromCart(c.menu_item_id)} className="ml-1 text-red-400 hover:text-red-600">×</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 mb-4">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Subtotal:</span>
                    <span>Q{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Descuentos:</span>
                    <span>- Q{totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-orange-600">Q{totalAfterDiscount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Cupon</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Ingresar codigo"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                    {couponValidation ? (
                      <button
                        onClick={clearCoupon}
                        className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        onClick={applyCoupon}
                        className="px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        Aplicar
                      </button>
                    )}
                  </div>
                  {couponValidation && (
                    <p className="text-xs text-green-600 mt-2">
                      Cupón aplicado: {couponValidation.code}
                    </p>
                  )}
                  {couponError && (
                    <p className="text-xs text-red-600 mt-2">{couponError}</p>
                  )}
                </div>
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Promocion</p>
                  {promoValidation ? (
                    <div className="text-xs text-green-600">
                      Promo activa: {promoValidation.title}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">No hay promo activa para este pedido</div>
                  )}
                </div>
                <button
                  onClick={placeOrder}
                  disabled={orderLoading}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  {orderLoading ? 'Procesando...' : 'Realizar Pedido'}
                </button>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Los items se validan vía gRPC antes de confirmar
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
