import React, { useState, useEffect } from 'react'
import { 
  ShoppingBagIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'
import useAuthStore from '../stores/authStore'
import { catalogAPI, ordersAPI } from '../services/api'
import { useSocketReload } from '../hooks/useSocket'

const RestaurantDashboard = () => {
  const { user, token } = useAuthStore()
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('menu') // menu, orders, inventory, promos
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: 100,
    isAvailable: true
  })

  // Order action states (must be at top level — React hooks rules)
  const [orderActionLoading, setOrderActionLoading] = useState(null)
  const [orderMessage, setOrderMessage] = useState(null)

  const [promotions, setPromotions] = useState([])
  const [coupons, setCoupons] = useState([])
  const [promoForm, setPromoForm] = useState({
    title: '',
    description: '',
    discountType: 'PERCENT',
    discountValue: '',
    minOrder: '',
    maxUses: '',
    restrictions: '',
    startsAt: '',
    expiresAt: '',
    active: true
  })
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'PERCENT',
    discountValue: '',
    minOrder: '',
    maxUses: '',
    restrictions: '',
    startsAt: '',
    expiresAt: '',
    active: true
  })

  useEffect(() => {
    loadRestaurantData()
  }, [])

  useEffect(() => {
    if (!restaurant?.id) return
    loadOffers()
  }, [restaurant?.id])

  const loadOffers = async () => {
    if (!restaurant?.id) return
    try {
      const [promosRes, couponsRes] = await Promise.all([
        catalogAPI.getPromotions({ restaurantId: restaurant.id }),
        catalogAPI.getCoupons({ restaurantId: restaurant.id })
      ])
      setPromotions(promosRes.data?.data || promosRes.data || [])
      setCoupons(couponsRes.data?.data || couponsRes.data || [])
    } catch (error) {
      console.error('Error loading offers:', error)
    }
  }

  const generateCode = (prefix = 'DELI', length = 6) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let out = prefix
    for (let i = 0; i < length; i += 1) {
      out += chars[Math.floor(Math.random() * chars.length)]
    }
    return out
  }

  const handleCreatePromotion = async () => {
    if (!promoForm.title.trim() || !promoForm.discountValue) return
    try {
      await catalogAPI.createPromotion({
        restaurantId: restaurant.id,
        title: promoForm.title.trim(),
        description: promoForm.description.trim(),
        discountType: promoForm.discountType,
        discountValue: parseFloat(promoForm.discountValue),
        minOrder: promoForm.minOrder ? parseFloat(promoForm.minOrder) : null,
        maxUses: promoForm.maxUses ? parseInt(promoForm.maxUses) : null,
        restrictions: promoForm.restrictions.trim(),
        startsAt: promoForm.startsAt || null,
        expiresAt: promoForm.expiresAt || null,
        isActive: !!promoForm.active
      })
      await loadOffers()
      setPromoForm({
        title: '',
        description: '',
        discountType: 'PERCENT',
        discountValue: '',
        minOrder: '',
        maxUses: '',
        restrictions: '',
        startsAt: '',
        expiresAt: '',
        active: true
      })
    } catch (error) {
      console.error('Error creating promotion:', error)
      alert('Error al crear promocion')
    }
  }

  const handleCreateCoupon = async () => {
    if (!couponForm.discountValue) return
    try {
      const code = couponForm.code.trim() || generateCode('CUP')
      await catalogAPI.createCoupon({
        restaurantId: restaurant.id,
        code,
        discountType: couponForm.discountType,
        discountValue: parseFloat(couponForm.discountValue),
        minOrder: couponForm.minOrder ? parseFloat(couponForm.minOrder) : null,
        maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : null,
        restrictions: couponForm.restrictions.trim(),
        startsAt: couponForm.startsAt || null,
        expiresAt: couponForm.expiresAt || null,
        isActive: !!couponForm.active
      })
      await loadOffers()
      setCouponForm({
        code: '',
        discountType: 'PERCENT',
        discountValue: '',
        minOrder: '',
        maxUses: '',
        restrictions: '',
        startsAt: '',
        expiresAt: '',
        active: true
      })
    } catch (error) {
      console.error('Error creating coupon:', error)
      alert('Error al crear cupon')
    }
  }

  const togglePromotion = async (promoId) => {
    try {
      await catalogAPI.togglePromotion(promoId)
      await loadOffers()
    } catch (error) {
      console.error('Error toggling promotion:', error)
    }
  }

  const toggleCoupon = async (couponId) => {
    try {
      await catalogAPI.toggleCoupon(couponId)
      await loadOffers()
    } catch (error) {
      console.error('Error toggling coupon:', error)
    }
  }

  const deletePromotion = async (promoId) => {
    try {
      await catalogAPI.deletePromotion(promoId)
      await loadOffers()
    } catch (error) {
      console.error('Error deleting promotion:', error)
    }
  }

  const deleteCoupon = async (couponId) => {
    try {
      await catalogAPI.deleteCoupon(couponId)
      await loadOffers()
    } catch (error) {
      console.error('Error deleting coupon:', error)
    }
  }

  const loadRestaurantData = async () => {
    try {
      setLoading(true)
      
      // Get all restaurants and find the one owned by this user
      const resRestaurants = await catalogAPI.getRestaurants()
      const allRestaurants = resRestaurants.data.data || resRestaurants.data || []
      const myRestaurant = allRestaurants.find(r => String(r.ownerId) === String(user?.id))
      
      if (!myRestaurant) {
        console.error('No restaurant found for this user')
        setLoading(false)
        return
      }
      
      setRestaurant(myRestaurant)
      
      // Load ALL menu items for this restaurant (including unavailable)
      const resMenu = await catalogAPI.getMenu(myRestaurant.id, true)
      setMenuItems(resMenu.data?.data || resMenu.data || [])
      
      // Load orders for this restaurant
      const resOrders = await ordersAPI.getByRestaurant(myRestaurant.id)
      setOrders(resOrders.data?.data || resOrders.data || [])
      
    } catch (error) {
      console.error('Error loading restaurant data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Real-time updates
  useSocketReload(['order:statusChanged', 'order:created', 'delivery:updated'], loadRestaurantData)

  const handleCreateItem = () => {
    setEditingItem(null)
    setItemFormData({
      name: '',
      description: '',
      price: '',
      stock: 100,
      isAvailable: true
    })
    setShowItemModal(true)
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setItemFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      stock: item.stock,
      isAvailable: item.isAvailable
    })
    setShowItemModal(true)
  }

  const handleSaveItem = async () => {
    try {
      const itemData = {
        ...itemFormData,
        restaurantId: restaurant.id,
        price: parseFloat(itemFormData.price),
        stock: parseInt(itemFormData.stock)
      }

      if (editingItem) {
        // Update existing item
        await catalogAPI.updateMenuItem(editingItem.id, itemData)
      } else {
        // Create new item
        await catalogAPI.createMenuItem(itemData)
      }

      setShowItemModal(false)
      loadRestaurantData()
    } catch (error) {
      console.error('Error saving item:', error)
      alert('Error al guardar el item')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('¿Está seguro de eliminar este item?')) return
    
    try {
      await catalogAPI.deleteMenuItem(itemId)
      loadRestaurantData()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error al eliminar el item')
    }
  }

  const handleToggleAvailability = async (item) => {
    try {
      await catalogAPI.toggleMenuItem(item.id)
      loadRestaurantData()
    } catch (error) {
      console.error('Error toggling availability:', error)
    }
  }

  const handleUpdateStock = async (itemId, newStock) => {
    try {
      const item = menuItems.find(i => i.id === itemId)
      await catalogAPI.updateMenuItem(itemId, {
        ...item,
        stock: parseInt(newStock)
      })
      loadRestaurantData()
    } catch (error) {
      console.error('Error updating stock:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!restaurant) {
    const handleCreateRestaurant = async () => {
      try {
        setLoading(true)
        const payload = {
          name: `Restaurante ${user?.name || user?.email}`,
          address: 'Dirección por definir',
          ownerId: user.id
        }
        await catalogAPI.createRestaurant(payload)
        await loadRestaurantData()
      } catch (err) {
        console.error('Error creando restaurante:', err)
        alert('Error al crear restaurante')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">No tienes un restaurante asignado</h2>
        <p className="text-yellow-700 mb-4">Puedes crear un restaurante para comenzar a gestionar tu menú.</p>
        <div className="flex gap-3">
          <button onClick={handleCreateRestaurant} className="px-4 py-2 bg-orange-600 text-white rounded-lg">Crear Restaurante</button>
        </div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Items',
      value: menuItems.length.toString(),
      icon: ShoppingBagIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Items Disponibles',
      value: menuItems.filter(i => i.isAvailable).length.toString(),
      icon: ArchiveBoxIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Órdenes Recibidas',
      value: orders.length.toString(),
      icon: ClockIcon,
      color: 'bg-orange-500'
    },
    {
      name: 'Órdenes Activas',
      value: orders.filter(o => o.status === 'CREADA' || o.status === 'EN_PROCESO').length.toString(),
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500'
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'FINALIZADA':
        return 'bg-purple-100 text-purple-800'
      case 'EN_PROCESO':
        return 'bg-blue-100 text-blue-800'
      case 'CREADA':
        return 'bg-yellow-100 text-yellow-800'
      case 'EN_CAMINO':
        return 'bg-indigo-100 text-indigo-800'
      case 'ENTREGADO':
        return 'bg-green-100 text-green-800'
      case 'CANCELADO':
        return 'bg-red-100 text-red-800'
      case 'RECHAZADA':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const statusLabels = {
    CREADA: 'Nueva',
    EN_PROCESO: 'En Proceso',
    FINALIZADA: 'Lista',
    EN_CAMINO: 'En Camino',
    ENTREGADO: 'Entregado',
    CANCELADO: 'Cancelado',
    RECHAZADA: 'Rechazada',
  }

  const handleAcceptOrder = async (orderId) => {
    setOrderActionLoading(orderId)
    try {
      await ordersAPI.updateStatus(orderId, 'EN_PROCESO')
      setOrderMessage({ text: 'Orden aceptada — en proceso', type: 'success' })
      loadRestaurantData()
    } catch (err) {
      setOrderMessage({ text: err.response?.data?.error || 'Error', type: 'error' })
    }
    setOrderActionLoading(null)
    setTimeout(() => setOrderMessage(null), 3000)
  }

  const handleRejectOrder = async (orderId) => {
    if (!window.confirm('¿Estás seguro de rechazar esta orden?')) return
    setOrderActionLoading(orderId)
    try {
      await ordersAPI.reject(orderId)
      setOrderMessage({ text: 'Orden rechazada', type: 'success' })
      loadRestaurantData()
    } catch (err) {
      setOrderMessage({ text: err.response?.data?.error || 'Error', type: 'error' })
    }
    setOrderActionLoading(null)
    setTimeout(() => setOrderMessage(null), 3000)
  }

  const handleFinalizeOrder = async (orderId) => {
    setOrderActionLoading(orderId)
    try {
      await ordersAPI.updateStatus(orderId, 'FINALIZADA')
      setOrderMessage({ text: 'Orden finalizada — lista para repartidor', type: 'success' })
      loadRestaurantData()
    } catch (err) {
      setOrderMessage({ text: err.response?.data?.error || 'Error', type: 'error' })
    }
    setOrderActionLoading(null)
    setTimeout(() => setOrderMessage(null), 3000)
  }

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta orden?')) return
    setOrderActionLoading(orderId)
    try {
      await ordersAPI.updateStatus(orderId, 'CANCELADO')
      setOrderMessage({ text: 'Orden cancelada', type: 'success' })
      loadRestaurantData()
    } catch (err) {
      setOrderMessage({ text: err.response?.data?.error || 'Error', type: 'error' })
    }
    setOrderActionLoading(null)
    setTimeout(() => setOrderMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard - {restaurant.name}</h1>
        <p className="text-gray-600 mt-1">{restaurant.address}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'menu'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Gestión de Menú
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'inventory'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inventario
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Órdenes Recibidas
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'promos'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cupones y Promos
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Menu Management Tab */}
          {activeTab === 'menu' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Items del Menú</h2>
                <button
                  onClick={handleCreateItem}
                  className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  Añadir Item
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-orange-600">Q{item.price.toFixed(2)}</span>
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.isAvailable
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.isAvailable ? 'Disponible' : 'No disponible'}
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Stock: {item.stock} unidades
                    </div>
                  </div>
                ))}
              </div>

              {menuItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No hay items en el menú. ¡Añade el primero!
                </div>
              )}
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Control de Inventario</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {menuItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">Q{item.price.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={item.stock}
                            onChange={(e) => handleUpdateStock(item.id, e.target.value)}
                            className="w-24 px-2 py-1 border rounded"
                            min="0"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.stock === 0 ? 'bg-red-100 text-red-800' :
                            item.stock < 20 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.stock === 0 ? 'Agotado' :
                             item.stock < 20 ? 'Bajo' : 'Disponible'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            className={`text-sm px-3 py-1 rounded ${
                              item.isAvailable
                                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {item.isAvailable ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {menuItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No hay items para gestionar
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Órdenes Recibidas</h2>

              {orderMessage && (
                <div className={`mb-4 p-3 rounded-lg ${orderMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {orderMessage.text}
                </div>
              )}

              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">Orden #{order.order_number}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleString('es-GT')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm text-gray-600 mb-2">Dirección: {order.delivery_address}</p>
                      {order.notes && (
                        <p className="text-sm text-gray-600 mb-2">Notas: {order.notes}</p>
                      )}
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-2xl font-bold text-orange-600">Q{parseFloat(order.total).toFixed(2)}</span>
                        
                        {/* Action buttons based on order status */}
                        <div className="flex gap-2">
                          {order.status === 'PAGADO' && (
                            <>
                              <button
                                onClick={() => handleAcceptOrder(order.id)}
                                disabled={orderActionLoading === order.id}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition"
                              >
                                {orderActionLoading === order.id ? '...' : '✅ Aceptar'}
                              </button>
                              <button
                                onClick={() => handleRejectOrder(order.id)}
                                disabled={orderActionLoading === order.id}
                                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50 transition"
                              >
                                Rechazar
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={orderActionLoading === order.id}
                                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {order.status === 'EN_PROCESO' && (
                            <>
                              <button
                                onClick={() => handleFinalizeOrder(order.id)}
                                disabled={orderActionLoading === order.id}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition"
                              >
                                {orderActionLoading === order.id ? '...' : '📦 Marcar Lista'}
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={orderActionLoading === order.id}
                                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleRejectOrder(order.id)}
                                disabled={orderActionLoading === order.id}
                                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50 transition"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {orders.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No hay órdenes recibidas aún
                </div>
              )}
            </div>
          )}

          {/* Promotions & Coupons Tab */}
          {activeTab === 'promos' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Crear promocion</h2>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={promoForm.title}
                      onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                      placeholder="Titulo de la promocion"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
                    <textarea
                      value={promoForm.description}
                      onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                      placeholder="Descripcion"
                      rows="3"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={promoForm.discountType}
                        onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <option value="PERCENT">% Descuento</option>
                        <option value="AMOUNT">Monto fijo (Q)</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={promoForm.discountValue}
                        onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                        placeholder={promoForm.discountType === 'PERCENT' ? 'Ej: 15' : 'Ej: 25'}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={promoForm.minOrder}
                        onChange={(e) => setPromoForm({ ...promoForm, minOrder: e.target.value })}
                        placeholder="Minimo (ej: Q60)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        value={promoForm.maxUses}
                        onChange={(e) => setPromoForm({ ...promoForm, maxUses: e.target.value })}
                        placeholder="Max usos"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                        min="1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={promoForm.startsAt}
                        onChange={(e) => setPromoForm({ ...promoForm, startsAt: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                      <input
                        type="date"
                        value={promoForm.expiresAt}
                        onChange={(e) => setPromoForm({ ...promoForm, expiresAt: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <textarea
                      value={promoForm.restrictions}
                      onChange={(e) => setPromoForm({ ...promoForm, restrictions: e.target.value })}
                      placeholder="Restricciones (opcional)"
                      rows="2"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={promoForm.active}
                        onChange={(e) => setPromoForm({ ...promoForm, active: e.target.checked })}
                      />
                      Visible para clientes (activa)
                    </label>
                    <button
                      onClick={handleCreatePromotion}
                      className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition"
                    >
                      Guardar promocion
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Crear cupon</h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="text"
                        value={couponForm.code}
                        onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                        placeholder="Codigo (dejar vacio para generar)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                      <button
                        onClick={() => setCouponForm({ ...couponForm, code: generateCode('CUP') })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-white"
                      >
                        Generar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={couponForm.discountType}
                        onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <option value="PERCENT">% Descuento</option>
                        <option value="AMOUNT">Monto fijo (Q)</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={couponForm.discountValue}
                        onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                        placeholder={couponForm.discountType === 'PERCENT' ? 'Ej: 10' : 'Ej: 20'}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={couponForm.minOrder}
                        onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })}
                        placeholder="Minimo (ej: Q80)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        value={couponForm.maxUses}
                        onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                        placeholder="Max usos"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                        min="1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={couponForm.startsAt}
                        onChange={(e) => setCouponForm({ ...couponForm, startsAt: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                      <input
                        type="date"
                        value={couponForm.expiresAt}
                        onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <textarea
                      value={couponForm.restrictions}
                      onChange={(e) => setCouponForm({ ...couponForm, restrictions: e.target.value })}
                      placeholder="Restricciones (opcional)"
                      rows="2"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={couponForm.active}
                        onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
                      />
                      Visible para clientes (activo)
                    </label>
                    <button
                      onClick={handleCreateCoupon}
                      className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition"
                    >
                      Guardar cupon
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Promociones existentes</h3>
                  {promotions.length === 0 ? (
                    <p className="text-sm text-gray-400">No hay promociones registradas.</p>
                  ) : (
                    <div className="space-y-3">
                      {promotions.map((promo) => (
                        <div key={promo.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">{promo.title}</p>
                              <p className="text-sm text-gray-500">{promo.description || 'Sin descripcion'}</p>
                              {promo.restrictions && (
                                <p className="text-xs text-gray-400 mt-1">Restricciones: {promo.restrictions}</p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {promo.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3 text-sm">
                            <span className="text-orange-600 font-semibold">
                              {promo.discount_type === 'PERCENT' ? `${promo.discount_value}%` : `Q${promo.discount_value}`}
                            </span>
                            <span className="text-gray-400">Hasta {promo.expires_at || 'sin fecha'}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>Minimo: {promo.min_order || 'sin minimo'}</span>
                            <span>Max usos: {promo.max_uses || 'sin limite'}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => togglePromotion(promo.id)}
                              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                            >
                              {promo.is_active ? 'Inhabilitar' : 'Habilitar'}
                            </button>
                            <button
                              onClick={() => deletePromotion(promo.id)}
                              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Cupones existentes</h3>
                  {coupons.length === 0 ? (
                    <p className="text-sm text-gray-400">No hay cupones registrados.</p>
                  ) : (
                    <div className="space-y-3">
                      {coupons.map((coupon) => (
                        <div key={coupon.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">{coupon.code}</p>
                              {coupon.restrictions && (
                                <p className="text-xs text-gray-400 mt-1">Restricciones: {coupon.restrictions}</p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {coupon.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3 text-sm">
                            <span className="text-orange-600 font-semibold">
                              {coupon.discount_type === 'PERCENT' ? `${coupon.discount_value}%` : `Q${coupon.discount_value}`}
                            </span>
                            <span className="text-gray-400">Hasta {coupon.expires_at || 'sin fecha'}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>Minimo: {coupon.min_order || 'sin minimo'}</span>
                            <span>Max usos: {coupon.max_uses || 'sin limite'}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => toggleCoupon(coupon.id)}
                              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                            >
                              {coupon.is_active ? 'Inhabilitar' : 'Habilitar'}
                            </button>
                            <button
                              onClick={() => deleteCoupon(coupon.id)}
                              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Editar Item' : 'Nuevo Item'}
              </h2>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ej: Hamburguesa Clásica"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  rows="3"
                  placeholder="Descripción del platillo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (Q)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={itemFormData.stock}
                    onChange={(e) => setItemFormData({ ...itemFormData, stock: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={itemFormData.isAvailable}
                  onChange={(e) => setItemFormData({ ...itemFormData, isAvailable: e.target.checked })}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Disponible para ordenar
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowItemModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {editingItem ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RestaurantDashboard
