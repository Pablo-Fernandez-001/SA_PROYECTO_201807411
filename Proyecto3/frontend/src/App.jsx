import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './stores/authStore'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import RestaurantMenu from './pages/RestaurantMenu'
import MyOrders from './pages/MyOrders'
import AdminPanel from './pages/AdminPanel'
import AdminDashboard from './pages/AdminDashboard'
import ClientDashboard from './pages/ClientDashboard'
import RestaurantDashboard from './pages/RestaurantDashboard'
import RepartidorDashboard from './pages/RepartidorDashboard'
import PaymentPage from './pages/PaymentPage'

// Protected Route wrapper
function ProtectedRoute({ children, roles }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />
  return children
}

export default function App() {
  const { validateSession } = useAuthStore()

  useEffect(() => {
    validateSession()
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/restaurant/:id" element={<ProtectedRoute><RestaurantMenu /></ProtectedRoute>} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute roles={['CLIENTE', 'ADMIN']}><PaymentPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPanel /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute roles={['CLIENTE']}><ClientDashboard /></ProtectedRoute>} />
            <Route path="/restaurant-dashboard" element={<ProtectedRoute roles={['RESTAURANTE']}><RestaurantDashboard /></ProtectedRoute>} />
            <Route path="/repartidor-dashboard" element={<ProtectedRoute roles={['REPARTIDOR']}><RepartidorDashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
