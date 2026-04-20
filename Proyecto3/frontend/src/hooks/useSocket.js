import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

function resolveSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || '/api'

  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return apiUrl.replace(/\/api\/?$/, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

const SOCKET_URL = resolveSocketUrl()

let sharedSocket = null

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    })
  }
  return sharedSocket
}

/**
 * Hook to listen for real-time order/delivery events.
 * 
 * Usage:
 *   useSocket('order:statusChanged', (data) => { ... reload ... })
 *   useSocket('order:created', (data) => { ... reload ... })
 *   useSocket('delivery:updated', (data) => { ... reload ... })
 */
export function useSocket(event, callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const socket = getSocket()

    const handler = (data) => {
      callbackRef.current(data)
    }

    socket.on(event, handler)

    return () => {
      socket.off(event, handler)
    }
  }, [event])
}

/**
 * Hook to listen for multiple events at once — all trigger the same reload.
 * 
 * Usage:
 *   useSocketReload(['order:statusChanged', 'order:created'], loadData)
 */
export function useSocketReload(events, reloadFn) {
  const reloadRef = useRef(reloadFn)
  reloadRef.current = reloadFn

  useEffect(() => {
    const socket = getSocket()

    const handler = () => {
      reloadRef.current()
    }

    events.forEach(event => socket.on(event, handler))

    return () => {
      events.forEach(event => socket.off(event, handler))
    }
  }, [events.join(',')])
}

export default getSocket
