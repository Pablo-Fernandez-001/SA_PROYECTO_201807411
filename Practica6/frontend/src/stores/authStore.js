import { create } from 'zustand'
import { authAPI } from '../services/api'

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.login({ email, password })
      const user = data.data.user
      const token = data.data.token
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false })
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Error al iniciar sesión'
      set({ error: message, loading: false })
      return { success: false, message }
    }
  },

  register: async (name, email, password, role) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.register({ name, email, password, role })
      const user = data.data.user
      const token = data.data.token
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false })
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Error al registrarse'
      set({ error: message, loading: false })
      return { success: false, message }
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  // Validate existing token (persist session on refresh)
  validateSession: async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const { data } = await authAPI.validate(token)
      if (data.data?.valid !== false && data.data?.user) {
        const user = data.data.user
        localStorage.setItem('user', JSON.stringify(user))
        set({ user, token })
      } else {
        get().logout()
      }
    } catch {
      // Token invalid — clear session
      get().logout()
    }
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
