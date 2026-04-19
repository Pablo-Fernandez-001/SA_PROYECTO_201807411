import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { catalogAPI } from '../services/api'
import useAuthStore from '../stores/authStore'

export default function Home() {
  const [restaurants, setRestaurants] = useState([])
  const [ratings, setRatings] = useState({})
  const [foodTypes, setFoodTypes] = useState([])
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [foodTypeFilter, setFoodTypeFilter] = useState('')
  const [promoOnly, setPromoOnly] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimer = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect restaurant users to their dashboard
    if (user?.role === 'RESTAURANTE') {
      navigate('/restaurant-dashboard')
      return
    }
    // Redirect repartidores to their dashboard
    if (user?.role === 'REPARTIDOR') {
      navigate('/repartidor-dashboard')
      return
    }
    
    fetchRestaurants({ silent: false })
  }, [user, navigate])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      fetchRestaurants({ silent: true })
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchText, categoryFilter, foodTypeFilter, promoOnly])

  const fetchRestaurants = async ({ silent }) => {
    try {
      if (!silent) setLoading(true)
      if (silent) setIsSearching(true)
      const res = await catalogAPI.searchCatalog({
        q: searchText || undefined,
        category: categoryFilter || undefined,
        foodType: foodTypeFilter || undefined,
        promotions: promoOnly ? 'true' : undefined
      })
      const list = res.data.data?.restaurants || res.data?.restaurants || []
      setRestaurants(list)
      fetchRatings(list)
      fetchFoodTypes()
    } catch (err) {
      setError('Error al cargar restaurantes: ' + (err.response?.data?.message || err.message))
    } finally {
      if (!silent) setLoading(false)
      if (silent) setIsSearching(false)
    }
  }

  const fetchFoodTypes = async () => {
    try {
      const res = await catalogAPI.getAllMenuItems()
      const items = res.data.data || res.data || []
      const types = Array.from(new Set(items.map(i => i.category).filter(Boolean)))
      setFoodTypes(types)
    } catch {
      setFoodTypes([])
    }
  }

  const fetchRatings = async (list) => {
    try {
      const entries = await Promise.all(list.map(async (r) => {
        try {
          const res = await catalogAPI.getRestaurantRating(r.id)
          const data = res.data.data || res.data
          return [r.id, data?.average || 0]
        } catch {
          return [r.id, 0]
        }
      }))
      setRatings(Object.fromEntries(entries))
    } catch {
      setRatings({})
    }
  }

  // Don't render anything if redirecting
  if (user?.role === 'RESTAURANTE') {
    return null
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          ¡Bienvenido{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-gray-500 mt-2">Elige tu restaurante favorito y haz tu pedido</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar restaurante..."
            className="border border-gray-200 rounded-lg px-3 py-2"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2"
          >
            <option value="">Categorias dinamicas</option>
            <option value="new">Nuevos</option>
            <option value="featured">Destacados</option>
            <option value="top">Mejores puntuados</option>
          </select>
          <select
            value={foodTypeFilter}
            onChange={(e) => setFoodTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2"
          >
            <option value="">Tipo de comida</option>
            {foodTypes.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={promoOnly}
              onChange={(e) => setPromoOnly(e.target.checked)}
            />
            Solo con promociones
          </label>
        </div>
        {isSearching && (
          <p className="text-xs text-gray-400 mt-2">Buscando...</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={fetchRestaurants} className="ml-3 underline">Reintentar</button>
        </div>
      )}

      {restaurants.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No hay restaurantes disponibles aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((r) => (
            <Link
              key={r.id}
              to={`/restaurant/${r.id}`}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
            >
              <div className="h-40 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <span className="text-6xl text-white font-bold">{r.name.charAt(0)}</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-800">{r.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{r.description || 'Restaurante disponible'}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                    {r.category || 'General'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">⭐ {Number(ratings[r.id] || 0).toFixed(1)}</span>
                    <span className={`text-xs font-medium ${r.is_active ? 'text-green-600' : 'text-red-500'}`}>
                      {r.is_active ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
