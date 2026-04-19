import { useState, useEffect, useRef } from 'react'
import useAuthStore from '../stores/authStore'
import { deliveryAPI } from '../services/api'
import { useSocketReload } from '../hooks/useSocket'

const STATUS_COLORS = {
  ASIGNADO: 'bg-blue-100 text-blue-800',
  EN_CAMINO: 'bg-yellow-100 text-yellow-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  FALLIDO: 'bg-orange-100 text-orange-800',
  CREADA: 'bg-gray-100 text-gray-800',
  EN_PROCESO: 'bg-blue-100 text-blue-800',
  FINALIZADA: 'bg-purple-100 text-purple-800',
}

const STATUS_LABELS = {
  ASIGNADO: 'Asignado',
  EN_CAMINO: 'En Camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  FALLIDO: 'Fallido',
  CREADA: 'Creada',
  EN_PROCESO: 'En Proceso',
  FINALIZADA: 'Lista para Recoger',
}

export default function RepartidorDashboard() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('available')    // 'available' | 'active' | 'history'
  const [availableOrders, setAvailableOrders] = useState([])
  const [myDeliveries, setMyDeliveries] = useState([])
  const [allDeliveries, setAllDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)

  // Photo upload states
  const [photoModal, setPhotoModal] = useState(null) // delivery object or null
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoBase64, setPhotoBase64] = useState(null)
  const fileInputRef = useRef(null)

  // Fail delivery states
  const [failModal, setFailModal] = useState(null) // delivery object or null
  const [failReason, setFailReason] = useState('')

  useEffect(() => {
    loadData()
  }, [tab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'available') {
        const { data } = await deliveryAPI.getAvailableOrders()
        console.log('Available orders:', data)
        setAvailableOrders(data.data || data || [])
      } else if (tab === 'active') {
        const { data } = await deliveryAPI.getActiveByCourier(user.id)
        setMyDeliveries(data.data || data || [])
      } else {
        const { data } = await deliveryAPI.getByCourier(user.id)
        setAllDeliveries(data.data || data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  // Real-time updates
  useSocketReload(['order:statusChanged', 'order:created', 'delivery:updated'], loadData)

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleAcceptOrder = async (order) => {
    setActionLoading(order.id)
    try {
      await deliveryAPI.acceptOrder({
        order_external_id: order.id,
        delivery_address: order.deliveryAddress || order.delivery_address || ''
      })
      showMessage(`¡Orden ${order.orderNumber || order.order_number} aceptada! En camino.`)
      loadData()
    } catch (error) {
      showMessage(error.response?.data?.error || 'Error al aceptar la orden', 'error')
    }
    setActionLoading(null)
  }

  const openPhotoModal = (delivery) => {
    setPhotoModal(delivery)
    setPhotoPreview(null)
    setPhotoBase64(null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      showMessage('La imagen no debe superar 10MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1] // remove data:image/...;base64,
      setPhotoBase64(base64)
      setPhotoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleCompleteDelivery = async () => {
    if (!photoModal) return
    if (!photoBase64) {
      showMessage('Debes adjuntar una foto como evidencia de entrega', 'error')
      return
    }
    setActionLoading(photoModal.id)
    try {
      await deliveryAPI.complete(photoModal.id, { photo: photoBase64 })
      showMessage('¡Entrega completada con evidencia fotográfica!')
      setPhotoModal(null)
      setPhotoPreview(null)
      setPhotoBase64(null)
      loadData()
    } catch (error) {
      showMessage(error.response?.data?.error || 'Error al completar entrega', 'error')
    }
    setActionLoading(null)
  }

  const openFailModal = (delivery) => {
    setFailModal(delivery)
    setFailReason('')
  }

  const handleFailDelivery = async () => {
    if (!failModal || !failReason.trim()) {
      showMessage('Debes indicar el motivo del fallo', 'error')
      return
    }
    setActionLoading(failModal.id)
    try {
      await deliveryAPI.fail(failModal.id, { reason: failReason })
      showMessage('Entrega reportada como fallida')
      setFailModal(null)
      setFailReason('')
      loadData()
    } catch (error) {
      showMessage(error.response?.data?.error || 'Error al reportar fallo', 'error')
    }
    setActionLoading(null)
  }

  const handleCancelDelivery = async (delivery) => {
    if (!window.confirm('¿Estás seguro de cancelar esta entrega?')) return
    setActionLoading(delivery.id)
    try {
      await deliveryAPI.cancel(delivery.id)
      showMessage('Entrega cancelada')
      loadData()
    } catch (error) {
      showMessage(error.response?.data?.error || 'Error al cancelar entrega', 'error')
    }
    setActionLoading(null)
  }

  const activeCount = tab === 'active' ? myDeliveries.length : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Repartidor</h1>
            <p className="text-gray-500 mt-1">Bienvenido, {user?.name}. Gestiona tus entregas aquí.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">ID Repartidor</p>
            <p className="text-lg font-semibold text-orange-600">#{user?.id}</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl shadow-sm p-2">
        <button
          onClick={() => setTab('available')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${tab === 'available' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          🍕 Órdenes Disponibles
        </button>
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${tab === 'active' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          🚗 Mis Entregas Activas
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${tab === 'history' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          📋 Historial
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-3 text-gray-500">Cargando...</p>
        </div>
      ) : (
        <>
          {/* Available Orders */}
          {tab === 'available' && (
            <div className="space-y-4">
              {availableOrders.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-gray-500 text-lg">No hay órdenes disponibles en este momento</p>
                  <p className="text-gray-400 text-sm mt-1">Las órdenes listas para recoger aparecerán aquí</p>
                  <button onClick={loadData} className="mt-4 text-orange-600 hover:underline">Refrescar</button>
                </div>
              ) : (
                availableOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{order.orderNumber || order.order_number}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </div>
                        <p className="text-gray-600">🏪 {order.restaurantName || order.restaurant_name || 'Restaurante'}</p>
                        {(order.deliveryAddress || order.delivery_address) && (
                          <p className="text-gray-500 text-sm mt-1">📍 {order.deliveryAddress || order.delivery_address}</p>
                        )}
                        <p className="text-orange-600 font-semibold mt-2">Q{Number(order.total).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => handleAcceptOrder(order)}
                        disabled={actionLoading === order.id}
                        className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
                      >
                        {actionLoading === order.id ? 'Aceptando...' : '✅ Aceptar Orden'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Active Deliveries */}
          {tab === 'active' && (
            <div className="space-y-4">
              {myDeliveries.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <p className="text-4xl mb-3">🏠</p>
                  <p className="text-gray-500 text-lg">No tienes entregas activas</p>
                  <p className="text-gray-400 text-sm mt-1">Acepta una orden disponible para comenzar</p>
                </div>
              ) : (
                myDeliveries.map(delivery => (
                  <div key={delivery.id} className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">Entrega #{delivery.id}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[delivery.status]}`}>
                            {STATUS_LABELS[delivery.status] || delivery.status}
                          </span>
                        </div>
                        <p className="text-gray-600">📦 Orden #{delivery.orderExternalId || delivery.order_external_id}</p>
                        {delivery.deliveryAddress && (
                          <p className="text-gray-500 text-sm mt-1">📍 {delivery.deliveryAddress}</p>
                        )}
                        {delivery.startedAt && (
                          <p className="text-gray-400 text-xs mt-1">Iniciada: {new Date(delivery.startedAt).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {delivery.status === 'EN_CAMINO' && (
                          <>
                            <button
                              onClick={() => openPhotoModal(delivery)}
                              disabled={actionLoading === delivery.id}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                            >
                              {actionLoading === delivery.id ? '...' : '📸 Completar Entrega'}
                            </button>
                            <button
                              onClick={() => openFailModal(delivery)}
                              disabled={actionLoading === delivery.id}
                              className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-200 disabled:opacity-50 transition"
                            >
                              ⚠️ Reportar Fallo
                            </button>
                          </>
                        )}
                        {['ASIGNADO', 'EN_CAMINO'].includes(delivery.status) && (
                          <button
                            onClick={() => handleCancelDelivery(delivery)}
                            disabled={actionLoading === delivery.id}
                            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 disabled:opacity-50 transition"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* History */}
          {tab === 'history' && (
            <div className="space-y-4">
              {allDeliveries.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-500 text-lg">No tienes entregas en tu historial</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entregado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allDeliveries.map(d => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">#{d.id}</td>
                          <td className="px-4 py-3 text-sm">#{d.orderExternalId || d.order_external_id}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[d.status]}`}>
                              {STATUS_LABELS[d.status] || d.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {d.startedAt ? new Date(d.startedAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {d.durationMinutes ? `${d.durationMinutes} min` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {/* Photo Upload Modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">📸 Evidencia de Entrega</h3>
              <button onClick={() => setPhotoModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Entrega #{photoModal.id} — Toma o selecciona una foto como prueba de entrega</p>
            
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <>
                    <p className="text-4xl mb-2">📷</p>
                    <p className="text-gray-500">Click para tomar foto o seleccionar imagen</p>
                    <p className="text-xs text-gray-400 mt-1">Máximo 10MB — JPG, PNG, WEBP</p>
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPhotoModal(null)}
                className="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteDelivery}
                disabled={!photoBase64 || actionLoading === photoModal.id}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
              >
                {actionLoading === photoModal.id ? 'Enviando...' : '✅ Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fail Delivery Modal */}
      {failModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">⚠️ Reportar Entrega Fallida</h3>
              <button onClick={() => setFailModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Entrega #{failModal.id} — Indica el motivo por el cual no se pudo completar</p>
            
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Ej: Dirección incorrecta, cliente no disponible, zona peligrosa..."
              rows={3}
              className="w-full border-2 rounded-lg px-4 py-3 mb-4 focus:border-orange-500 focus:ring-0 outline-none resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setFailModal(null)}
                className="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleFailDelivery}
                disabled={!failReason.trim() || actionLoading === failModal.id}
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition font-medium"
              >
                {actionLoading === failModal.id ? 'Enviando...' : '⚠️ Reportar Fallo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
