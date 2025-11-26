import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { Search, Database } from 'lucide-react'
import SearchPage from './pages/SearchPage'
import DataLoadPage from './pages/DataLoadPage'

export default function App() {
  return (
    <div className="app-root min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <header className="app-header bg-white shadow-lg border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="header-inner flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent m-0">
                Buscador de Estaciones ITV
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                Sistema integral de gestión y búsqueda de estaciones de inspección técnica
              </p>
            </div>

            <nav className="top-nav flex gap-2 bg-gray-100 p-2 rounded-xl">
              <NavLink
                to="/"
                end
                className={({isActive}) => 
                  `nav-link flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    isActive 
                      ? 'active bg-white text-blue-600 shadow-md' 
                      : 'text-gray-600 hover:bg-white/50'
                  }`
                }
              >
                <Search className="w-5 h-5" />
                Buscador
              </NavLink>
              <NavLink
                to="/carga"
                className={({isActive}) => 
                  `nav-link flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    isActive 
                      ? 'active bg-white text-purple-600 shadow-md' 
                      : 'text-gray-600 hover:bg-white/50'
                  }`
                }
              >
                <Database className="w-5 h-5" />
                Carga de datos
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/carga" element={<DataLoadPage />} />
        </Routes>
      </main>

      <footer className="bg-white border-t-2 border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          {/* Footer content removed as requested */}
        </div>
      </footer>
    </div>
  )
}