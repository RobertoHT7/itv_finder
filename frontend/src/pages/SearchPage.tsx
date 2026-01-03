import React, { useState, useEffect } from 'react'
import { Search, MapPin, Mail, Building2, Tag, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { getAllEstaciones } from '../services'
import type { EstacionConRelaciones, LoadingState } from '@shared'

export default function SearchPage() {
  // Estado del formulario
  const [formData, setFormData] = useState({
    localidad: '',
    postal: '',
    provincia: '',
    tipo: 'fija'
  })

  // Estado de datos y búsqueda
  const [todasEstaciones, setTodasEstaciones] = useState<EstacionConRelaciones[]>([])
  const [estacionesFiltradas, setEstacionesFiltradas] = useState<EstacionConRelaciones[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)

  // Cargar todas las estaciones al montar el componente
  useEffect(() => {
    cargarEstaciones()
  }, [])

  const cargarEstaciones = async () => {
    setLoadingState('loading')
    setError(null)
    try {
      const response = await getAllEstaciones()
      setTodasEstaciones(response.estaciones)
      setEstacionesFiltradas(response.estaciones)
      setLoadingState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estaciones')
      setLoadingState('error')
    }
  }

  // Filtrar estaciones en cliente
  const handleSearch = () => {
    let filtradas = [...todasEstaciones]

    if (formData.provincia.trim()) {
      filtradas = filtradas.filter(est =>
        est.localidad.provincia.nombre.toLowerCase().includes(formData.provincia.toLowerCase())
      )
    }

    if (formData.localidad.trim()) {
      filtradas = filtradas.filter(est =>
        est.localidad.nombre.toLowerCase().includes(formData.localidad.toLowerCase())
      )
    }

    if (formData.postal.trim()) {
      filtradas = filtradas.filter(est =>
        est.codigo_postal.includes(formData.postal)
      )
    }

    if (formData.tipo) {
      const tipoMap: Record<string, string> = {
        'fija': 'Estacion Fija',
        'movil': 'Estacion Movil'
      }
      filtradas = filtradas.filter(est => est.tipo === tipoMap[formData.tipo])
    }

    setEstacionesFiltradas(filtradas)
  }

  const handleReset = () => {
    setFormData({ localidad: '', postal: '', provincia: '', tipo: 'fija' })
    setEstacionesFiltradas(todasEstaciones)
  }

  return (
    <div className="page page-search min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto card-root">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden card-root">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center gap-3 text-white">
              <Search className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Búsqueda de Estaciones ITV</h2>
                <p className="text-blue-100 text-sm mt-1">Localice la estación más cercana a su ubicación</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="search-layout grid lg:grid-cols-2 gap-8">
              <div className="search-form space-y-6">
                <div className="space-y-4">
                  <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-2 label-with-icon">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>Localidad</span>
                    </span>
                    <input
                      type="text"
                      name="localidad"
                      value={formData.localidad}
                      onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ingrese la localidad"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-2 label-with-icon">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>Cód. Postal</span>
                    </span>
                    <input
                      type="text"
                      name="postal"
                      value={formData.postal}
                      onChange={(e) => setFormData({ ...formData, postal: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ej: 28001"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-2 label-with-icon">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span>Provincia</span>
                    </span>
                    <input
                      type="text"
                      name="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ingrese la provincia"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-2 label-with-icon">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <span>Tipo</span>
                    </span>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
                      defaultValue="fija"
                    >
                      <option value="fija">Estación Fija</option>
                      <option value="movil">Estación Móvil</option>
                    </select>
                  </label>
                </div>

                <div className="form-actions flex gap-3 pt-4">
                  <button
                    onClick={handleReset}
                    className="btn btn-ghost flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={loadingState === 'loading'}
                    className="btn btn-primary flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingState === 'loading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Cargando...
                      </span>
                    ) : (
                      'Buscar'
                    )}
                  </button>
                </div>
              </div>

              <div className="search-preview bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 flex items-center justify-center border-2 border-gray-300 border-dashed">
                <div className="map-placeholder text-center">
                  <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Vista previa del mapa</p>
                  <p className="text-sm text-gray-400 mt-1">Los resultados se mostrarán aquí</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 results-header">
                <CheckCircle2 className="w-5 h-5 text-blue-600 results-icon" />
                <span>Resultados de la búsqueda ({estacionesFiltradas.length})</span>
              </h3>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="results-box bg-gray-50 rounded-xl p-6 min-h-[160px] border-2 border-gray-200" aria-label="resultados">
                {loadingState === 'loading' && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="ml-3 text-gray-600">Cargando estaciones...</p>
                  </div>
                )}

                {loadingState === 'success' && estacionesFiltradas.length === 0 && (
                  <p className="text-gray-400 text-center py-8">
                    No se encontraron estaciones con los criterios especificados
                  </p>
                )}

                {loadingState === 'success' && estacionesFiltradas.length > 0 && (
                  <div className="space-y-4">
                    {estacionesFiltradas.map((estacion) => (
                      <div
                        key={estacion.id}
                        className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-gray-800">{estacion.nombre}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estacion.tipo === 'Estacion Fija'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {estacion.tipo === 'Estacion Fija' ? 'Fija' : 'Móvil'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {estacion.direccion}, {estacion.codigo_postal}
                          </p>
                          <p className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {estacion.localidad.nombre}, {estacion.localidad.provincia.nombre}
                          </p>
                          {estacion.horario && (
                            <p className="text-xs text-gray-500 mt-2">📅 {estacion.horario}</p>
                          )}
                          {estacion.contacto && (
                            <p className="text-xs text-gray-500">📞 {estacion.contacto}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}