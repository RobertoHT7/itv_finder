import React, { useState } from 'react'
import { Search, MapPin, Mail, Building2, Tag, CheckCircle2 } from 'lucide-react'

export default function SearchPage() {
  const [formData, setFormData] = useState({
    localidad: '',
    postal: '',
    provincia: '',
    tipo: 'fija'
  })

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
                      onChange={(e) => setFormData({...formData, localidad: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, postal: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, provincia: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
                      defaultValue="fija"
                    >
                      <option value="fija">Estación Fija</option>
                      <option value="movil">Estación Móvil</option>
                    </select>
                  </label>
                </div>

                <div className="form-actions flex gap-3 pt-4">
                  <button className="btn btn-ghost flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button className="btn btn-primary flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30">
                    Buscar
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
                <span>Resultados de la búsqueda</span>
              </h3>
              <div className="results-box bg-gray-50 rounded-xl p-6 min-h-[160px] border-2 border-gray-200" aria-label="resultados">
                <p className="text-gray-400 text-center py-8">No hay resultados para mostrar. Realice una búsqueda para ver los resultados.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}