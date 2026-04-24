import { useEffect, useState } from 'react'
import { ChartBarIcon, CommandLineIcon, CircleStackIcon } from '@heroicons/react/24/outline'
import { observabilityAPI } from '../services/api'

const cards = [
  {
    key: 'grafana',
    title: 'Grafana',
    icon: ChartBarIcon,
    accent: 'from-cyan-500 to-sky-600',
  },
  {
    key: 'kibana',
    title: 'Kibana',
    icon: CommandLineIcon,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    key: 'prometheus',
    title: 'Prometheus',
    icon: CircleStackIcon,
    accent: 'from-emerald-500 to-teal-600',
  },
]

export default function ObservabilityDashboard() {
  const [links, setLinks] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLinks = async () => {
      try {
        const { data } = await observabilityAPI.getLinks()
        setLinks(data.data || {})
      } catch (err) {
        setError(err.response?.data?.message || 'No se pudieron cargar los accesos.')
      } finally {
        setLoading(false)
      }
    }

    loadLinks()
  }, [])

  const openLink = (url) => {
    if (!url || url.includes('LOADBALANCER_IP')) {
      setError('Configura las IPs públicas de Grafana, Kibana y Prometheus en el proyecto.')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-5xl">
        {error && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(({ key, title, icon: Icon, accent }) => (
            <button
              key={key}
              type="button"
              onClick={() => openLink(links[key])}
              className="group bg-white rounded-[1.75rem] p-8 shadow-lg border border-slate-200 hover:-translate-y-1 hover:shadow-2xl transition min-h-[240px] flex flex-col items-center justify-center text-center"
            >
              <div className={`inline-flex rounded-2xl p-4 bg-gradient-to-br ${accent} text-white shadow-lg`}>
                <Icon className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mt-6">{title}</h2>
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}
