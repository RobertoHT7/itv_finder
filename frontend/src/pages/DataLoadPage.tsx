import React, { useState, useEffect, useRef } from 'react'
import { Database, CheckCircle2, Loader2, AlertCircle, Trash2, BarChart3 } from 'lucide-react'
import {
  cargarTodasLasEstaciones,
  cargarEstacionesCV,
  cargarEstacionesGAL,
  cargarEstacionesCAT,
  limpiarBaseDatos,
  obtenerEstadisticas,
  connectToLogs
} from '../services'
import type { LogMessage, LoadingState, EstadisticasCarga } from '@shared'

export default function DataLoadPage() {
  const [sources, setSources] = useState({
    all: false,
    galicia: false,
    valencia: true,
    catalunya: false
  })

  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [logs, setLogs] = useState<LogMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [estadisticas, setEstadisticas] = useState<EstadisticasCarga | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const disconnectSSE = useRef<(() => void) | null>(null)

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Cargar estadísticas al montar
  useEffect(() => {
    cargarEstadisticas()
  }, [])

  // Limpiar conexión SSE al desmontar
  useEffect(() => {
    return () => {
      if (disconnectSSE.current) {
        disconnectSSE.current()
      }
    }
  }, [])

  const cargarEstadisticas = async () => {
    try {
      const response = await obtenerEstadisticas()
      setEstadisticas(response.estadisticas)
    } catch (err) {
      console.error('Error cargando estadísticas:', err)
    }
  }

  const agregarLog = (log: LogMessage) => {
    setLogs(prev => [...prev, log])
  }

  const iniciarSSE = () => {
    // Si ya hay una conexión, cerrarla primero
    if (disconnectSSE.current) {
      disconnectSSE.current()
    }

    // Conectar a logs en tiempo real
    disconnectSSE.current = connectToLogs(
      (log) => agregarLog(log),
      (error) => {
        console.error('Error en SSE:', error)
        // No agregar mensaje de error, solo registrar en consola
      }
    )

    console.log('[Frontend] Conexión SSE establecida')
  }

  const handleAllChange = (checked: boolean) => {
    setSources({
      all: checked,
      galicia: checked,
      valencia: checked,
      catalunya: checked
    })
  }

  const handleSourceChange = (source: string, checked: boolean) => {
    const newSources = { ...sources, [source]: checked }
    // Check if all individual sources are checked
    const allChecked = newSources.galicia && newSources.valencia && newSources.catalunya
    setSources({ ...newSources, all: allChecked })
  }

  const handleCargar = async () => {
    setLoadingState('loading')
    setError(null)
    setLogs([])

    console.log('[Frontend] Iniciando proceso de carga')

    // Iniciar conexión SSE antes de cargar
    iniciarSSE()

    // Delay más largo para asegurar que SSE se conecte
    console.log('[Frontend] Esperando 1 segundo para establecer SSE...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('[Frontend] Delay completado, iniciando carga de datos')

    try {
      if (sources.all) {
        console.log('[Frontend] Llamando a cargarTodasLasEstaciones()')
        await cargarTodasLasEstaciones()
      } else {
        if (sources.valencia) {
          console.log('[Frontend] Llamando a cargarEstacionesCV()')
          await cargarEstacionesCV()
        }
        if (sources.galicia) {
          console.log('[Frontend] Llamando a cargarEstacionesGAL()')
          await cargarEstacionesGAL()
        }
        if (sources.catalunya) {
          console.log('[Frontend] Llamando a cargarEstacionesCAT()')
          await cargarEstacionesCAT()
        }
      }

      console.log('[Frontend] Carga completada exitosamente')
      setLoadingState('success')

      // Actualizar estadísticas
      await cargarEstadisticas()

    } catch (err) {
      console.error('[Frontend] Error durante la carga:', err)
      setLoadingState('error')
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      agregarLog({ message: `❌ Error: ${errorMsg}`, timestamp: Date.now() })
    } finally {
      // Desconectar SSE después de que termine todo
      console.log('[Frontend] Esperando 3 segundos antes de cerrar SSE...')
      setTimeout(() => {
        if (disconnectSSE.current) {
          disconnectSSE.current()
          disconnectSSE.current = null
        }
      }, 3000)
    }
  }

  const handleLimpiar = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar todos los datos?')) {
      return
    }

    setLoadingState('loading')
    setError(null)
    setLogs([])

    try {
      agregarLog({ message: '🗑️ Limpiando base de datos...', timestamp: Date.now() })
      await limpiarBaseDatos()
      agregarLog({ message: '✅ Base de datos limpiada correctamente', timestamp: Date.now() })
      setLoadingState('success')

      // Actualizar estadísticas
      await cargarEstadisticas()
    } catch (err) {
      setLoadingState('error')
      const errorMsg = err instanceof Error ? err.message : 'Error al limpiar'
      setError(errorMsg)
      agregarLog({ message: `❌ Error: ${errorMsg}`, timestamp: Date.now() })
    }
  }

  return (
    <div className="page page-load min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto card-root">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden card-root">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6">
            <div className="flex items-center gap-3 text-white">
              <Database className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Carga del almacén de datos</h2>
                <p className="text-purple-100 text-sm mt-1">Gestión y actualización de información de estaciones ITV</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Seleccione fuente:</h3>

              <div className="space-y-3">
                <label className="check-item flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sources.all}
                    onChange={(e) => handleAllChange(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-gray-700">Seleccionar todas</span>
                </label>

                <label className="check-item flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sources.galicia}
                    onChange={(e) => handleSourceChange('galicia', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Galicia</span>
                </label>

                <label className="check-item flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-blue-300 hover:border-blue-400 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sources.valencia}
                    onChange={(e) => handleSourceChange('valencia', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-medium">Comunitat Valenciana</span>
                </label>

                <label className="check-item flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sources.catalunya}
                    onChange={(e) => handleSourceChange('catalunya', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Catalunya</span>
                </label>
              </div>
            </div>

            {estadisticas && (
              <div className="mt-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-100">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Estadísticas actuales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">C. Valenciana</p>
                    <p className="text-2xl font-bold text-blue-600">{estadisticas.comunidad_valenciana}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Galicia</p>
                    <p className="text-2xl font-bold text-blue-600">{estadisticas.galicia}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Catalunya</p>
                    <p className="text-2xl font-bold text-blue-600">{estadisticas.cataluna}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-purple-600">{estadisticas.total}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="form-actions flex gap-3">
              <button
                onClick={handleCargar}
                disabled={loadingState === 'loading' || (!sources.all && !sources.galicia && !sources.valencia && !sources.catalunya)}
                className="btn btn-primary flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingState === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cargando...
                  </span>
                ) : (
                  'Cargar'
                )}
              </button>
              <button
                onClick={handleLimpiar}
                disabled={loadingState === 'loading'}
                className="btn btn-danger px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Borrar almacén
              </button>
            </div>

            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
                Logs en tiempo real:
              </h3>
              <div className="results-box bg-gray-900 rounded-xl p-6 min-h-[320px] max-h-[480px] overflow-y-auto border-2 border-gray-700 font-mono text-sm">
                {logs.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Esperando ejecución de carga de datos...</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-2 rounded ${log.message.includes('✅') || log.message.includes('✓') ? 'bg-green-900/20 text-green-400' :
                          log.message.includes('❌') ? 'bg-red-900/20 text-red-400' :
                            log.message.includes('🚀') || log.message.includes('📦') ? 'bg-blue-900/20 text-blue-400' :
                              'text-gray-300'
                          }`}
                      >
                        <span className="text-gray-500 text-xs flex-shrink-0">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </span>
                        <span className="flex-1">{log.message}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
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