import { useEffect, useState } from 'react'
import { ChartBarIcon, CommandLineIcon, CircleStackIcon } from '@heroicons/react/24/outline'
import { observabilityAPI } from '../services/api'

const cards = [
  {
    key: 'grafana',
    title: 'Grafana',
    description: 'Panel de métricas, SLI y salud operativa de DeliverEats.',
    icon: ChartBarIcon,
    accent: 'from-cyan-500 to-sky-600',
  },
  {
    key: 'kibana',
    title: 'Kibana',
    description: 'Exploración de logs, errores, volumen y troubleshooting.',
    icon: CommandLineIcon,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    key: 'prometheus',
    title: 'Prometheus',
    description: 'Consulta de métricas crudas, targets y reglas de alerta.',
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
        setError(err.response?.data?.message || 'No se pudieron cargar los accesos de observabilidad.')
      } finally {
        setLoading(false)
      }
    }

    loadLinks()
  }, [])

  const openLink = (url) => {
    if (!url || url.includes('LOADBALANCER_IP')) {
      setError('Aún faltan las IP públicas de LoadBalancer. Actualiza GRAFANA_URL, KIBANA_URL y PROMETHEUS_URL en la configuración del proyecto.')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <section className="rounded-[2rem] bg-slate-950 text-white p-8 md:p-10 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(249,115,22,0.18),_transparent_30%)]" />
        <div className="relative">
          <p className="text-cyan-300 text-sm font-semibold tracking-[0.22em] uppercase">Observability Access</p>
          <h1 className="text-4xl md:text-5xl font-black mt-3">Panel Graph</h1>
          <p className="text-slate-300 mt-4 max-w-2xl text-lg">
            Acceso centralizado a las herramientas operativas del proyecto DeliverEats.
          </p>
        </div>
      </section>

      {error && (
        <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(({ key, title, description, icon: Icon, accent }) => (
            <button
              key={key}
              type="button"
              onClick={() => openLink(links[key])}
              className="group text-left bg-white rounded-[1.75rem] p-6 shadow-lg border border-slate-200 hover:-translate-y-1 hover:shadow-2xl transition"
            >
              <div className={`inline-flex rounded-2xl p-3 bg-gradient-to-br ${accent} text-white shadow-lg`}>
                <Icon className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-5">{title}</h2>
              <p className="text-slate-600 mt-3 leading-6">{description}</p>
              <span className="inline-flex items-center mt-6 text-sm font-semibold text-slate-900 group-hover:text-cyan-600 transition">
                Abrir en nueva pestaña
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
