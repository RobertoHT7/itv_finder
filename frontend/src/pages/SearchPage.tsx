import React, { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Mail, Building2, Tag, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getAllEstaciones } from '../services'
import type { EstacionConRelaciones, LoadingState } from '@shared'

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function SearchPage() {
  // Estado del formulario
  const [formData, setFormData] = useState({
    localidad: '',
    postal: '',
    provincia: '',
    tipo: ''
  })

  // Estado de datos y búsqueda
  const [todasEstaciones, setTodasEstaciones] = useState<EstacionConRelaciones[]>([])
  const [estacionesFiltradas, setEstacionesFiltradas] = useState<EstacionConRelaciones[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)

  // Listas para autocompletado
  const [provincias, setProvincias] = useState<string[]>([])
  const [localidades, setLocalidades] = useState<string[]>([])
  const [localidadesFiltradas, setLocalidadesFiltradas] = useState<string[]>([])

  // Referencias para el mapa
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  // Centroides aproximados de provincias españolas (para estaciones móviles)
  const CENTROIDES_PROVINCIAS: Record<string, [number, number]> = {
    // Comunidad Valenciana
    'Valencia': [39.4699, -0.3763],
    'Castellón': [40.0, -0.0333],
    'Alicante': [38.3452, -0.4810],
    // Galicia
    'A Coruña': [43.3623, -8.4115],
    'Lugo': [43.0097, -7.5567],
    'Ourense': [42.3406, -7.8636],
    'Pontevedra': [42.4333, -8.6500],
    // Cataluña
    'Barcelona': [41.3851, 2.1734],
    'Girona': [41.9794, 2.8214],
    'Lleida': [41.6175, 0.6200],
    'Tarragona': [41.1189, 1.2445]
  }

  // Cargar todas las estaciones al montar el componente
  useEffect(() => {
    cargarEstaciones()
  }, [])

  // Inicializar el mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Crear el mapa centrado en España
    const map = L.map(mapContainerRef.current).setView([40.4168, -3.7038], 6)

    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Crear capa para los marcadores
    const markersLayer = L.layerGroup().addTo(map)
    markersLayerRef.current = markersLayer

    mapRef.current = map

    // Cleanup al desmontar
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Actualizar marcadores cuando cambian las estaciones
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || todasEstaciones.length === 0) return

    // Limpiar marcadores existentes
    markersLayerRef.current.clearLayers()

    // Crear iconos personalizados según el tipo y estado (filtrado o no)
    // Iconos principales (filtrados) - colores brillantes
    const iconoFijaDestacada = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    const iconoMovilDestacada = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    // Iconos secundarios (no filtrados) - colores grises/tenues
    const iconoFijaSecundaria = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [20, 33],
      iconAnchor: [10, 33],
      popupAnchor: [0, -28],
      shadowSize: [33, 33]
    })

    const iconoMovilSecundaria = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [20, 33],
      iconAnchor: [10, 33],
      popupAnchor: [0, -28],
      shadowSize: [33, 33]
    })

    // Icono especial para móviles en ubicación aproximada
    const iconoMovilAproximada = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    const iconoMovilAproximadaSecundaria = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [20, 33],
      iconAnchor: [10, 33],
      popupAnchor: [0, -28],
      shadowSize: [33, 33]
    })

    const bounds: L.LatLngBoundsExpression = []
    const estacionesFiltradosIds = new Set(estacionesFiltradas.map(e => e.id))

    // Añadir TODAS las estaciones al mapa
    todasEstaciones.forEach((estacion) => {
      const coordenadas = obtenerCoordenadasEstacion(estacion)
      if (!coordenadas) return

      const estaFiltrada = estacionesFiltradosIds.has(estacion.id)
      const esMovilSinCoordenadas = estacion.tipo === 'Estacion Movil' && (!estacion.latitud || !estacion.longitud)

      // Seleccionar icono según tipo y si está filtrada
      let icon: L.Icon
      if (estaFiltrada) {
        if (esMovilSinCoordenadas) {
          icon = iconoMovilAproximada // Naranja para móviles sin ubicación exacta
        } else if (estacion.tipo === 'Estacion Fija') {
          icon = iconoFijaDestacada
        } else {
          icon = iconoMovilDestacada
        }
        // Solo agregar a bounds las estaciones filtradas
        bounds.push(coordenadas)
      } else {
        if (esMovilSinCoordenadas) {
          icon = iconoMovilAproximadaSecundaria
        } else if (estacion.tipo === 'Estacion Fija') {
          icon = iconoFijaSecundaria
        } else {
          icon = iconoMovilSecundaria
        }
      }

      const marker = L.marker(coordenadas, {
        icon,
        opacity: estaFiltrada ? 1 : 0.75,
        zIndexOffset: estaFiltrada ? 1000 : 0
      })

      // Crear popup con información de la estación
      const ubicacionTexto = esMovilSinCoordenadas
        ? `⚠️ <strong>Ubicación aproximada</strong> - Centro de provincia`
        : `<p><strong>Dirección:</strong> ${estacion.direccion}</p>`

      const popupContent = `
        <div class="popup-estacion">
          <h4 class="font-bold text-base mb-2">${estacion.nombre}</h4>
          <div class="text-sm space-y-1">
            <p><strong>Tipo:</strong> ${estacion.tipo === 'Estacion Fija' ? 'Fija' : 'Móvil'}</p>
            ${ubicacionTexto}
            ${estacion.codigo_postal ? `<p><strong>CP:</strong> ${estacion.codigo_postal}</p>` : ''}
            ${estacion.localidad?.nombre ? `<p><strong>Localidad:</strong> ${estacion.localidad.nombre}</p>` : ''}
            <p><strong>Provincia:</strong> ${estacion.localidad.provincia.nombre}</p>
            ${esMovilSinCoordenadas ? `<p class="text-orange-600 text-xs mt-2">📍 Esta estación móvil opera en toda la provincia</p>` : ''}
            ${estacion.horario ? `<p><strong>Horario:</strong> ${estacion.horario}</p>` : ''}
            ${estacion.contacto ? `<p><strong>Contacto:</strong> ${estacion.contacto}</p>` : ''}
          </div>
        </div>
      `

      marker.bindPopup(popupContent)
      marker.addTo(markersLayerRef.current!)
    })

    // Ajustar el zoom solo a las estaciones filtradas
    if (bounds.length > 0 && bounds.length < todasEstaciones.length) {
      // Si hay filtros aplicados, hacer zoom a las filtradas
      mapRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 13 // Limitar el zoom máximo para no acercarse demasiado
      })
    }
    // Si no hay filtros o todas están filtradas, mantener el zoom actual (no hacer nada)
  }, [estacionesFiltradas, todasEstaciones])

  // Función auxiliar para obtener coordenadas reales de la estación desde la base de datos
  const obtenerCoordenadasEstacion = (estacion: EstacionConRelaciones): [number, number] | null => {
    // Usar las coordenadas reales de la estación desde la base de datos
    if (estacion.latitud && estacion.longitud) {
      return [estacion.latitud, estacion.longitud]
    }

    // Fallback para estaciones móviles sin coordenadas: usar centroide de provincia
    if (estacion.tipo === 'Estacion Movil' && estacion.localidad?.provincia?.nombre) {
      const provincia = estacion.localidad.provincia.nombre
      const centroide = CENTROIDES_PROVINCIAS[provincia]
      if (centroide) {
        return centroide
      }
    }

    // Si no hay coordenadas ni centroide, retornar null
    return null
  }

  const cargarEstaciones = async () => {
    setLoadingState('loading')
    setError(null)
    try {
      const response = await getAllEstaciones()
      setTodasEstaciones(response.estaciones)
      setEstacionesFiltradas(response.estaciones)

      // Extraer provincias únicas
      const provinciasUnicas = Array.from(
        new Set(response.estaciones.map(est => est.localidad.provincia.nombre))
      ).sort()
      setProvincias(provinciasUnicas)

      // Extraer localidades únicas
      const localidadesUnicas = Array.from(
        new Set(response.estaciones.map(est => est.localidad.nombre))
      ).sort()
      setLocalidades(localidadesUnicas)
      setLocalidadesFiltradas(localidadesUnicas)

      setLoadingState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estaciones')
      setLoadingState('error')
    }
  }

  // Filtrar estaciones automáticamente cuando cambian los filtros
  useEffect(() => {
    if (loadingState !== 'success') return

    let filtradas = [...todasEstaciones]

    if (formData.provincia.trim()) {
      filtradas = filtradas.filter(est =>
        est.localidad.provincia.nombre.toLowerCase() === formData.provincia.toLowerCase()
      )
    }

    if (formData.localidad.trim()) {
      filtradas = filtradas.filter(est =>
        est.localidad.nombre.toLowerCase() === formData.localidad.toLowerCase()
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
  }, [formData, todasEstaciones, loadingState])

  // Filtrar localidades según provincia seleccionada
  useEffect(() => {
    if (!formData.provincia) {
      setLocalidadesFiltradas(localidades)
      return
    }

    const localidadesDeProvincia = Array.from(
      new Set(
        todasEstaciones
          .filter(est => est.localidad.provincia.nombre.toLowerCase() === formData.provincia.toLowerCase())
          .map(est => est.localidad.nombre)
      )
    ).sort()

    setLocalidadesFiltradas(localidadesDeProvincia)

    // Si la localidad actual no está en la provincia, limpiarla
    if (formData.localidad && !localidadesDeProvincia.includes(formData.localidad)) {
      setFormData(prev => ({ ...prev, localidad: '' }))
    }
  }, [formData.provincia, todasEstaciones, localidades])

  const handleReset = () => {
    setFormData({ localidad: '', postal: '', provincia: '', tipo: '' })
    setEstacionesFiltradas(todasEstaciones)
    setLocalidadesFiltradas(localidades)
  }

  return (
    <div className="page page-search min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto card-root">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden card-root">
          <div className="flex-row items-center gap-3 text-white">
            <Search className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Búsqueda de Estaciones ITV</h2>
          </div>

          <div className="p-8">
            <div className="search-layout grid lg:grid-cols-2 gap-8">
              <div className="search-form space-y-6">
                <div className="space-y-4">
                  <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-2 label-with-icon">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span>Provincia</span>
                    </span>
                    <input
                      type="text"
                      name="provincia"
                      list="provincias-list"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Seleccione o escriba una provincia"
                    />
                    <datalist id="provincias-list">
                      {provincias.map((prov) => (
                        <option key={prov} value={prov} />
                      ))}
                    </datalist>
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-2 label-with-icon">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>Localidad</span>
                    </span>
                    <input
                      type="text"
                      name="localidad"
                      list="localidades-list"
                      value={formData.localidad}
                      onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Seleccione o escriba una localidad"
                      disabled={!formData.provincia && localidadesFiltradas.length > 50}
                    />
                    <datalist id="localidades-list">
                      {localidadesFiltradas.map((loc) => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                    {!formData.provincia && localidadesFiltradas.length > 50 && (
                      <p className="text-xs text-gray-500 mt-1">Seleccione primero una provincia</p>
                    )}
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
                      maxLength={5}
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
                    >
                      <option value="">Todas</option>
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
                    Limpiar filtros
                  </button>
                </div>
              </div>

              <div className="search-preview bg-white rounded-xl overflow-hidden border-2 border-gray-300 shadow-lg relative">
                <div
                  ref={mapContainerRef}
                  className="w-full h-full min-h-[400px]"
                  style={{ minHeight: '400px' }}
                />

                {/* Leyenda del mapa */}
                {todasEstaciones.length > 0 && (
                  <div className="flex-row bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs z-[1000] border border-gray-200">
                    <div className="font-bold text-gray-700 mb-2">Leyenda:</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600">🟢Estación Fija</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <span className="text-gray-600">🟠Estación Móvil</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel informativo de estaciones móviles filtradas */}
            {loadingState === 'success' && estacionesFiltradas.some(e => e.tipo === 'Estacion Movil' && (!e.latitud || !e.longitud)) && (
              <div className="mt-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border-2 border-orange-200">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">Estaciones Móviles (Ubicación Aproximada)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Las siguientes estaciones móviles no tienen ubicación fija. Se muestran en el centro de su provincia de operación.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {estacionesFiltradas
                    .filter(e => e.tipo === 'Estacion Movil' && (!e.latitud || !e.longitud))
                    .map((estacion) => (
                      <div
                        key={estacion.id}
                        className="bg-white rounded-lg p-4 border-2 border-orange-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-bold text-gray-800">{estacion.nombre}</h5>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 flex-shrink-0">
                            📍 Móvil
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Provincia: <strong>{estacion.localidad.provincia.nombre}</strong>
                          </p>
                          {estacion.horario && (
                            <p className="text-xs text-gray-500 mt-2">📅 {estacion.horario}</p>
                          )}
                          {estacion.contacto && (
                            <p className="text-xs text-gray-500">📞 {estacion.contacto}</p>
                          )}
                          <p className="text-xs text-orange-600 mt-2 italic">
                            Esta estación opera en toda la provincia. Contacte para confirmar ubicación y disponibilidad.
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 results-header">
                <CheckCircle2 className="w-5 h-5 text-blue-600 results-icon" />
                <span>
                  {loadingState === 'success'
                    ? `Resultados (${estacionesFiltradas.length} de ${todasEstaciones.length} estaciones)`
                    : 'Resultados de la búsqueda'
                  }
                </span>
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
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">
                      No se encontraron estaciones con los filtros aplicados
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Intente modificar los criterios de búsqueda o limpiar los filtros
                    </p>
                  </div>
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

      <style>{`
        .popup-estacion {
          min-width: 200px;
        }
        .leaflet-popup-content {
          margin: 8px 12px;
        }
      `}</style>
    </div>
  )
}