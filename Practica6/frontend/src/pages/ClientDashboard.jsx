import React, { useState, useEffect } from 'react'
import { 
  UserIcon, 
  ShoppingBagIcon, 
  ClockIcon,
  StarIcon,
  TruckIcon 
} from '@heroicons/react/24/outline'
import useAuthStore from '../stores/authStore'
import { ordersAPI, catalogAPI } from '../services/api'
import { useSocketReload } from '../hooks/useSocket'

const ClientDashboard = () => {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [promotions, setPromotions] = useState([])
  const [coupons, setCoupons] = useState([])

  useEffect(() => {
    fetchOrders()
    fetchOffers()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      // Get all orders and filter by user on frontend
      // In production, you'd want a dedicated endpoint for user orders
      const res = await ordersAPI.getOrders()
      const allOrders = res.data.data || res.data || []
      const userOrders = allOrders.filter(o => o.user_id === user?.id)
      setOrders(userOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOffers = async () => {
    try {
      const [promosRes, couponsRes] = await Promise.all([
        catalogAPI.getPromotions({ active: true }),
        catalogAPI.getCoupons({ active: true })
      ])
      setPromotions(promosRes.data?.data || promosRes.data || [])
      setCoupons(couponsRes.data?.data || couponsRes.data || [])
    } catch (error) {
      console.error('Error fetching offers:', error)
    }
  }

  // Real-time updates
  useSocketReload(['order:statusChanged', 'order:created', 'delivery:updated'], fetchOrders)

  // Calculate real stats from orders
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  
  const ordersThisMonth = orders.filter(o => {
    const orderDate = new Date(o.created_at)
    return orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear
  })

  const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0)
  const pendingDeliveries = orders.filter(o => 
    o.status === 'EN_CAMINO' || o.status === 'PREPARANDO'
  ).length

  const stats = [
    {
      name: 'Pedidos Totales',
      value: orders.length.toString(),
      icon: ShoppingBagIcon,
      change: null,
      changeType: null,
    },
    {
      name: 'Pedidos Este Mes',
      value: ordersThisMonth.length.toString(),
      icon: ClockIcon,
      change: null,
      changeType: null,
    },
    {
      name: 'Dinero Gastado',
      value: `Q${totalSpent.toFixed(2)}`,
      icon: StarIcon,
      change: null,
      changeType: null,
    },
    {
      name: 'Entregas Pendientes',
      value: pendingDeliveries.toString(),
      icon: TruckIcon,
      change: null,
      changeType: null,
    },
  ]

  // Get recent orders (last 5)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  const getStatusColor = (status) => {
    switch (status) {
      case 'ENTREGADA':
        return 'bg-green-100 text-green-800'
      case 'EN_CAMINO':
        return 'bg-blue-100 text-blue-800'
      case 'PREPARANDO':
        return 'bg-yellow-100 text-yellow-800'
      case 'ACEPTADA':
        return 'bg-orange-100 text-orange-800'
      case 'PENDIENTE':
        return 'bg-gray-100 text-gray-800'
      case 'RECHAZADA':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      'PENDIENTE': 'Pendiente',
      'ACEPTADA': 'Aceptada',
      'PREPARANDO': 'Preparando',
      'EN_CAMINO': 'En camino',
      'ENTREGADA': 'Entregado',
      'RECHAZADA': 'Rechazada'
    }
    return labels[status] || status
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Hola {user?.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Bienvenido a tu dashboard. Aquí puedes ver tus pedidos y estadísticas.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((item) => (
            <div key={item.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className="h-8 w-8 text-orange-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 truncate">
                    {item.name}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Promotions & Coupons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Promociones vigentes</h3>
            {promotions.length === 0 ? (
              <p className="text-sm text-gray-400">No hay promociones activas.</p>
            ) : (
              <div className="space-y-3">
                {promotions.slice(0, 4).map((promo) => (
                  <div key={promo.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{promo.title}</p>
                        <p className="text-xs text-gray-500">{promo.description || 'Sin descripcion'}</p>
                      </div>
                      <span className="text-sm font-semibold text-orange-600">
                        {promo.discount_type === 'PERCENT' ? `${promo.discount_value}%` : `Q${promo.discount_value}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>Minimo: {promo.min_order || 'sin minimo'}</span>
                      <span>Hasta: {promo.expires_at || 'sin fecha'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cupones disponibles</h3>
            {coupons.length === 0 ? (
              <p className="text-sm text-gray-400">No hay cupones activos.</p>
            ) : (
              <div className="space-y-3">
                {coupons.slice(0, 4).map((coupon) => (
                  <div key={coupon.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800">{coupon.code}</p>
                      <span className="text-sm font-semibold text-orange-600">
                        {coupon.discount_type === 'PERCENT' ? `${coupon.discount_value}%` : `Q${coupon.discount_value}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>Minimo: {coupon.min_order || 'sin minimo'}</span>
                      <span>Hasta: {coupon.expires_at || 'sin fecha'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Pedidos Recientes ({recentOrders.length})
            </h3>
          </div>
          <div className="p-6">
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Restaurante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.order_number || order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.restaurant_name || `ID ${order.restaurant_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          Q{parseFloat(order.total || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBagIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aún no has realizado ningún pedido</p>
                <p className="text-sm mt-2">¡Explora restaurantes y haz tu primer pedido!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200 text-center">
            <ShoppingBagIcon className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nuevo Pedido
            </h3>
            <p className="text-gray-600">
              Explora restaurantes y haz un nuevo pedido
            </p>
          </a>

          <a href="/my-orders" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200 text-center">
            <ClockIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Mis Pedidos
            </h3>
            <p className="text-gray-600">
              Ve el historial completo de tus pedidos
            </p>
          </a>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200 text-center cursor-pointer">
            <UserIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Mi Perfil
            </h3>
            <p className="text-gray-600">
              Actualiza tu información personal
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ClientDashboard
