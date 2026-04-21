import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI, deliveryAPI, catalogAPI } from '../services/api'
import useAuthStore from '../stores/authStore'
import { useSocketReload } from '../hooks/useSocket'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(null)
  const [message, setMessage] = useState(null)
  const [photoModal, setPhotoModal] = useState(null) // base64 image or null
  const [ratingOpen, setRatingOpen] = useState({})
  const [ratingForms, setRatingForms] = useState({})
  const [deliveryByOrder, setDeliveryByOrder] = useState({})
  const [ratingMessage, setRatingMessage] = useState(null)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchOrders()
  }, [user])

  const fetchOrders = async () => {
    if (!user || !user.id) {
      setError('Usuario no autenticado')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await ordersAPI.getByUser(user.id)
      setOrders(res.data.data || res.data || [])
    } catch (err) {
      setError('Error al cargar pedidos: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const loadDeliveryForOrder = async (orderId) => {
    if (deliveryByOrder[orderId]) return
    try {
      const res = await deliveryAPI.getByOrder(orderId)
      const data = res.data.data || res.data
      setDeliveryByOrder(prev => ({ ...prev, [orderId]: data }))
    } catch {
      setDeliveryByOrder(prev => ({ ...prev, [orderId]: null }))
    }
  }

  const initRatingForm = (order) => {
    const items = {}
    order.items?.forEach((item) => {
      items[item.menuItemExternalId] = 5
    })
    setRatingForms(prev => ({
      ...prev,
      [order.id]: {
        restaurant: 5,
        courier: 5,
        items,
        comment: ''
      }
    }))
  }

  const handleToggleRating = (order) => {
    setRatingOpen(prev => ({ ...prev, [order.id]: !prev[order.id] }))
    if (!ratingForms[order.id]) {
      initRatingForm(order)
    }
    loadDeliveryForOrder(order.id)
  }

  const submitRatings = async (order) => {
    const form = ratingForms[order.id]
    if (!form) return
    try {
      await catalogAPI.createRestaurantRating({
        restaurantId: order.restaurantId,
        orderId: order.id,
        userId: user.id,
        rating: form.restaurant,
        comment: form.comment
      })

      if (deliveryByOrder[order.id]?.courier_id) {
        await deliveryAPI.createCourierRating({
          courierId: deliveryByOrder[order.id].courier_id,
          orderId: order.id,
          userId: user.id,
          rating: form.courier,
          comment: form.comment
        })
      }

      const itemEntries = Object.entries(form.items || {})
      for (const [menuItemId, rating] of itemEntries) {
        await catalogAPI.createMenuItemRating({
          menuItemId: parseInt(menuItemId),
          orderId: order.id,
          userId: user.id,
          rating
        })
      }

      setRatingMessage({ text: 'Calificacion enviada', type: 'success' })
      setTimeout(() => setRatingMessage(null), 3000)
      setRatingOpen(prev => ({ ...prev, [order.id]: false }))
    } catch (err) {
      setRatingMessage({ text: err.response?.data?.error || 'Error enviando calificacion', type: 'error' })
      setTimeout(() => setRatingMessage(null), 3000)
    }
  }

  // Real-time updates
  useSocketReload(['order:statusChanged', 'order:created', 'delivery:updated'], fetchOrders)

  const statusColors = {
    CREADA: 'bg-gray-100 text-gray-800',
    PENDIENTE: 'bg-yellow-100 text-yellow-800',
    CONFIRMADO: 'bg-blue-100 text-blue-800',
    EN_PROCESO: 'bg-blue-100 text-blue-800',
    EN_PREPARACION: 'bg-purple-100 text-purple-800',
    FINALIZADA: 'bg-purple-100 text-purple-800',
    PAGADO: 'bg-emerald-100 text-emerald-800',
    EN_CAMINO: 'bg-indigo-100 text-indigo-800',
    ENTREGADO: 'bg-green-100 text-green-800',
    CANCELADO: 'bg-red-100 text-red-800',
    RECHAZADA: 'bg-red-100 text-red-800',
    REEMBOLSADO: 'bg-amber-100 text-amber-800',
  }

  const statusLabels = {
    CREADA: 'Creada',
    EN_PROCESO: 'En Proceso',
    FINALIZADA: 'Lista para Envío',
    PAGADO: 'Pagado',
    EN_CAMINO: 'En Camino',
    ENTREGADO: 'Entregado',
    CANCELADO: 'Cancelado',
    RECHAZADA: 'Rechazada',
    REEMBOLSADO: 'Reembolsado',
  }

  const canPay = (status) => status === 'CREADA'

  // Orders that can be cancelled by client
  const canCancel = (status) => ['CREADA', 'EN_PROCESO'].includes(status)

  const handleViewPhoto = async (orderId) => {
    try {
      const { data } = await deliveryAPI.getPhotoByOrder(orderId)
      const photo = data.data?.photo || data.photo
      const contentType = data.data?.content_type || data.content_type || 'image/jpeg'
      if (photo) {
        setPhotoModal(`data:${contentType};base64,${photo}`)
      } else {
        setMessage({ text: 'No se encontró foto para esta orden', type: 'error' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch {
      setMessage({ text: 'No hay evidencia fotográfica disponible', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleCancel = async (orderId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta orden?')) return
    setCancelLoading(orderId)
    try {
      await ordersAPI.cancel(orderId)
      setMessage({ text: 'Orden cancelada exitosamente', type: 'success' })
      fetchOrders()
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Error al cancelar', type: 'error' })
    }
    setCancelLoading(null)
    setTimeout(() => setMessage(null), 3000)
  }

  const getOrderDiscount = (orderId) => {
    try {
      const raw = localStorage.getItem('order-discounts')
      if (!raw) return 0
      const data = JSON.parse(raw)
      return data?.[String(orderId)]?.discountAmount || 0
    } catch {
      return 0
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mis Pedidos</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
          <button onClick={fetchOrders} className="ml-3 underline">Reintentar</button>
        </div>
      )}

      {message && (
        <div className={`px-4 py-3 rounded-lg mb-4 ${message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {message.text}
        </div>
      )}
      {ratingMessage && (
        <div className={`px-4 py-3 rounded-lg mb-4 ${ratingMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {ratingMessage.text}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No tienes pedidos aún.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">Pedido #{order.id}</h3>
                  <p className="text-sm text-gray-500">
                    {order.created_at ? new Date(order.created_at).toLocaleString('es-GT') : ''}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1 mb-3">
                <p><span className="font-medium">Restaurante:</span> {order.restaurantName || `ID ${order.restaurantId}`}</p>
                <p><span className="font-medium">Dirección de entrega:</span> {order.delivery_address || order.deliveryAddress || 'No especificada'}</p>
                {order.notes && <p><span className="font-medium">Notas:</span> {order.notes}</p>}
              </div>
              
              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="border-t pt-3 mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-gray-600">
                          Q{parseFloat(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm text-gray-500">
                  {order.items?.length || 0} item(s)
                </span>
                <div className="flex items-center gap-3">
                  {canPay(order.status) && (
                    <button
                      onClick={() => {
                        const discount = getOrderDiscount(order.id)
                        const finalTotal = Math.max(0, parseFloat(order.total || 0) - discount)
                        navigate(`/payment?orderId=${order.id}&total=${finalTotal}`)
                      }}
                      className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      💰 Pagar
                    </button>
                  )}
                  {order.status === 'ENTREGADO' && (
                    <button
                      onClick={() => handleViewPhoto(order.id)}
                      className="text-sm text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50 transition"
                    >
                      📸 Ver Evidencia
                    </button>
                  )}
                  {order.status === 'ENTREGADO' && (
                    <button
                      onClick={() => handleToggleRating(order)}
                      className="text-sm text-orange-600 border border-orange-200 px-3 py-1 rounded-lg hover:bg-orange-50 transition"
                    >
                      ⭐ Calificar
                    </button>
                  )}
                  {canCancel(order.status) && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={cancelLoading === order.id}
                      className="text-sm text-red-600 hover:text-red-800 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
                    >
                      {cancelLoading === order.id ? 'Cancelando...' : 'Cancelar Orden'}
                    </button>
                  )}
                  {order.status === 'REEMBOLSADO' && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">💰 Reembolsado</span>
                  )}
                  <span className="text-lg font-bold text-orange-600">
                    Q{(parseFloat(order.total || 0) - getOrderDiscount(order.id)).toFixed(2)}
                  </span>
                </div>
              </div>

              {ratingOpen[order.id] && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Calificaciones</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Restaurante</label>
                      <select
                        value={ratingForms[order.id]?.restaurant || 5}
                        onChange={(e) => setRatingForms(prev => ({
                          ...prev,
                          [order.id]: { ...prev[order.id], restaurant: parseInt(e.target.value) }
                        }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      >
                        {[5,4,3,2,1].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Repartidor</label>
                      <select
                        value={ratingForms[order.id]?.courier || 5}
                        onChange={(e) => setRatingForms(prev => ({
                          ...prev,
                          [order.id]: { ...prev[order.id], courier: parseInt(e.target.value) }
                        }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      >
                        {[5,4,3,2,1].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">Productos</label>
                    <div className="space-y-2">
                      {order.items?.map(item => (
                        <div key={item.menuItemExternalId} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{item.name}</span>
                          <select
                            value={ratingForms[order.id]?.items?.[item.menuItemExternalId] || 5}
                            onChange={(e) => setRatingForms(prev => ({
                              ...prev,
                              [order.id]: {
                                ...prev[order.id],
                                items: { ...prev[order.id]?.items, [item.menuItemExternalId]: parseInt(e.target.value) }
                              }
                            }))}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                          >
                            {[5,4,3,2,1].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">Comentario (opcional)</label>
                    <textarea
                      rows="2"
                      value={ratingForms[order.id]?.comment || ''}
                      onChange={(e) => setRatingForms(prev => ({
                        ...prev,
                        [order.id]: { ...prev[order.id], comment: e.target.value }
                      }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => submitRatings(order)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
                    >
                      Enviar calificacion
                    </button>
                    <button
                      onClick={() => setRatingOpen(prev => ({ ...prev, [order.id]: false }))}
                      className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchOrders}
        className="mt-6 bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 transition"
      >
        Actualizar
      </button>

      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50" onClick={() => setPhotoModal(null)}>
          <div className="bg-white rounded-xl p-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">📸 Evidencia de Entrega</h3>
              <button onClick={() => setPhotoModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <img src={photoModal} alt="Evidencia de entrega" className="w-full rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}
