import React, { useState } from 'react'
import { Database, CheckCircle2 } from 'lucide-react'

export default function DataLoadPage() {
  const [sources, setSources] = useState({
    all: false,
    galicia: false,
    valencia: true,
    catalunya: false
  })

  const handleAllChange = (checked) => {
    setSources({
      all: checked,
      galicia: checked,
      valencia: checked,
      catalunya: checked
    })
  }

  const handleSourceChange = (source, checked) => {
    const newSources = { ...sources, [source]: checked }
    // Check if all individual sources are checked
    const allChecked = newSources.galicia && newSources.valencia && newSources.catalunya
    setSources({ ...newSources, all: allChecked })
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

            <div className="form-actions flex gap-3">
              <button className="btn btn-ghost px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button className="btn btn-primary px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30">
                Cargar
              </button>
              <button className="btn btn-danger px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/30">
                Borrar almacén de datos
              </button>
            </div>

            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
                Resultados de la carga:
              </h3>
              <div className="results-box bg-gray-50 rounded-xl p-6 min-h-[160px] border-2 border-gray-200 font-mono text-sm">
                <p className="text-gray-400 text-center py-8">Esperando ejecución de carga de datos...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}