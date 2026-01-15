# 🎨 Frontend - ITV Finder

Aplicación web moderna desarrollada con React y TypeScript para la búsqueda y gestión de estaciones ITV en España.

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Tecnologías](#-tecnologías)
- [Características](#-características)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Páginas y Componentes](#-páginas-y-componentes)
- [Servicios](#-servicios)
- [Scripts Disponibles](#-scripts-disponibles)
- [Uso de la Aplicación](#-uso-de-la-aplicación)

---

## 📝 Descripción General

**ITV Finder Frontend** es una interfaz de usuario intuitiva y moderna que permite:

- 🔍 **Buscar estaciones ITV** por localidad, provincia, tipo o código postal
- 🗺️ **Visualizar estaciones en un mapa interactivo** con Leaflet
- 📥 **Cargar datos ETL** desde el backend con logs en tiempo real
- 📊 **Ver estadísticas** del estado de la base de datos
- 🎯 **Filtrar y explorar** de forma dinámica las estaciones disponibles

La aplicación se conecta a la API REST del backend para obtener y gestionar los datos.

---

## 🛠 Tecnologías

- **Framework**: React 18.2
- **Lenguaje**: TypeScript 5.1
- **Bundler**: Vite 7.3
- **Enrutamiento**: React Router DOM 6.30
- **Mapas**: Leaflet 1.9.4
- **Iconos**: Lucide React
- **Estilos**: TailwindCSS (mediante clases utilitarias)
- **API Client**: Fetch API nativa

---

## ✨ Características

### Página de Búsqueda
- 🔍 Formulario de búsqueda con múltiples filtros
- 🗺️ Mapa interactivo con Leaflet
- 📍 Marcadores diferenciados por tipo de estación
  - 🟢 Verde: Estaciones Fijas
  - 🟡 Amarillo: Estaciones Móviles
- 📋 Lista de resultados con información detallada
- 🎯 Zoom automático a la zona de resultados
- 📱 Diseño responsive

### Página de Carga de Datos
- 📥 Carga de datos por comunidad autónoma o completa
- 📡 Logs en tiempo real con Server-Sent Events (SSE)
- 🎨 Logs coloreados por tipo (info, success, error, warning)
- 📊 Estadísticas en tiempo real de la base de datos
- 🗑️ Limpieza de base de datos
- ⚙️ Selector de fuente de datos (entrega1, entrega2, completo)

### UI/UX
- 🎨 Diseño moderno con gradientes y sombras
- ⚡ Transiciones suaves
- 🔔 Estados de carga y mensajes de error claros
- 📊 Indicadores visuales (iconos, colores)
- 🧭 Navegación clara entre páginas

---

## 📦 Instalación

### Prerrequisitos

- Node.js >= 18.0.0
- npm o yarn
- Backend en ejecución (ver [README del backend](../backend/README.md))

### Pasos

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con la URL de tu backend

# Iniciar en modo desarrollo
npm run dev
```

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del directorio frontend:

```env
# URL del backend
VITE_API_URL=http://localhost:4000
```

### Configuración de Vite

El archivo [vite.config.ts](vite.config.ts) incluye:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared/types', import.meta.url))
    }
  }
})
```

**Características:**
- Alias `@shared` para importar tipos compartidos
- Puerto por defecto: 5173
- Plugin de React con Fast Refresh

---

## 📂 Estructura del Proyecto

```
frontend/
├── src/
│   ├── App.tsx                     # Componente raíz con enrutamiento
│   ├── main.tsx                    # Punto de entrada de React
│   ├── styles.css                  # Estilos globales
│   │
│   ├── pages/                      # Páginas de la aplicación
│   │   ├── SearchPage.tsx          # Página de búsqueda + mapa
│   │   └── DataLoadPage.tsx        # Página de carga ETL
│   │
│   └── services/                   # Lógica de comunicación con API
│       ├── index.ts                # Exportaciones centralizadas
│       ├── apiClient.ts            # Cliente HTTP base
│       ├── estacionesService.ts    # Servicio de búsqueda
│       └── cargaService.ts         # Servicio de carga ETL
│
├── index.html                      # Template HTML
├── package.json                    # Dependencias y scripts
├── tsconfig.json                   # Configuración TypeScript
├── vite.config.ts                  # Configuración Vite
├── .env                            # Variables de entorno (no en git)
└── README.md                       # Esta documentación
```

---

## 🧩 Páginas y Componentes

### App.tsx

Componente raíz que proporciona:
- **Header** con título y navegación
- **Enrutamiento** con React Router
- **Footer** con información adicional

```tsx
<Routes>
  <Route path="/" element={<SearchPage />} />
  <Route path="/carga" element={<DataLoadPage />} />
</Routes>
```

### SearchPage.tsx

**Responsabilidades:**
- Renderizar formulario de búsqueda
- Gestionar estado de filtros
- Integrar mapa de Leaflet
- Mostrar resultados filtrados
- Manejar marcadores en el mapa

**Estado principal:**
```typescript
const [formData, setFormData] = useState({
  localidad: '',
  postal: '',
  provincia: '',
  tipo: 'fija'
})

const [todasEstaciones, setTodasEstaciones] = useState<EstacionConRelaciones[]>([])
const [estacionesFiltradas, setEstacionesFiltradas] = useState<EstacionConRelaciones[]>([])
```

**Funcionalidades:**
- Filtrado cliente-side por múltiples criterios
- Zoom automático a resultados
- Popups informativos en marcadores
- Iconos diferenciados por tipo de estación

### DataLoadPage.tsx

**Responsabilidades:**
- Gestionar carga de datos ETL
- Conectar con SSE para logs en tiempo real
- Mostrar estadísticas de la BD
- Proporcionar controles de administración

**Estado principal:**
```typescript
const [sources, setSources] = useState({
  all: false,
  galicia: false,
  valencia: true,
  catalunya: false
})

const [logs, setLogs] = useState<LogMessage[]>([])
const [estadisticas, setEstadisticas] = useState<EstadisticasCarga | null>(null)
```

**Funcionalidades:**
- Selección de comunidades a cargar
- Logs coloreados y con scroll automático
- Estadísticas en tiempo real
- Limpieza de base de datos
- Gestión de conexiones SSE

---

## 🔌 Servicios

### apiClient.ts

Cliente HTTP base configurado para comunicarse con el backend.

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => { /* ... */ },
  post: async <T>(endpoint: string, data?: any): Promise<T> => { /* ... */ },
  delete: async <T>(endpoint: string): Promise<T> => { /* ... */ }
}
```

### estacionesService.ts

Servicio para búsqueda de estaciones.

```typescript
// Obtener todas las estaciones
export const getAllEstaciones = async (): Promise<{
  total: number
  estaciones: EstacionConRelaciones[]
}>

// Buscar con filtros
export const buscarEstaciones = async (params: {
  provincia?: string
  localidad?: string
  tipo?: string
  lat?: number
  lon?: number
  radio?: number
}): Promise<{...}>
```

### cargaService.ts

Servicio para operaciones ETL y administración.

```typescript
// Cargar todas las comunidades
export const cargarTodasLasEstaciones = async (source?: string): Promise<void>

// Cargar por comunidad
export const cargarEstacionesCV = async (source?: string): Promise<void>
export const cargarEstacionesGAL = async (source?: string): Promise<void>
export const cargarEstacionesCAT = async (source?: string): Promise<void>

// Administración
export const limpiarBaseDatos = async (): Promise<void>
export const obtenerEstadisticas = async (): Promise<{...}>

// SSE - Logs en tiempo real
export const connectToLogs = (
  onLog: (log: LogMessage) => void,
  onError?: (error: Error) => void
): (() => void)
```

---

## 🚀 Scripts Disponibles

### Desarrollo

```bash
# Iniciar servidor de desarrollo (Hot Module Replacement)
npm run dev

# La aplicación estará disponible en http://localhost:5173
```

### Producción

```bash
# Compilar para producción
npm run build

# Vista previa de build de producción
npm run preview
```

### Verificación

```bash
# Verificar tipos TypeScript sin compilar
npm run typecheck
```

---

## 💡 Uso de la Aplicación

### Búsqueda de Estaciones

1. **Accede a la página principal** (`/`)
2. **Rellena los filtros** que desees:
   - Localidad (ej: "Valencia", "Vigo")
   - Código Postal (ej: "46001")
   - Provincia (ej: "Barcelona")
   - Tipo de estación (Fija, Móvil, Otros)
3. **Haz clic en "Buscar"**
4. **Visualiza los resultados**:
   - En el mapa con marcadores interactivos
   - En la lista debajo del mapa con información detallada
5. **Haz clic en un marcador** para ver el popup con información

### Carga de Datos

1. **Accede a la página de carga** (`/carga`)
2. **Selecciona las comunidades** a cargar:
   - ✅ Todas
   - 🟢 Comunidad Valenciana
   - 🔵 Galicia
   - 🔴 Cataluña
3. **Selecciona la fuente de datos** (opcional):
   - `data/entrega1`
   - `data/entrega2` (por defecto)
   - `data/completo`
4. **Haz clic en "Cargar Datos"**
5. **Observa los logs en tiempo real**:
   - 📘 Azul: Información
   - ✅ Verde: Éxito
   - ⚠️ Amarillo: Advertencia
   - ❌ Rojo: Error
6. **Consulta las estadísticas** actualizadas automáticamente

### Limpieza de Base de Datos

1. En la página de carga (`/carga`)
2. Haz clic en el botón **"Limpiar Base de Datos"** (⚠️ rojo)
3. Confirma la acción
4. Se eliminarán **todos los datos** de la base de datos

---

## 🗺️ Integración con Leaflet

### Configuración Básica

```typescript
// Inicializar mapa
const map = L.map(mapContainerRef.current).setView([40.4168, -3.7038], 6)

// Añadir capa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map)
```

### Iconos Personalizados

```typescript
// Icono para estaciones fijas (verde)
const iconoFija = L.icon({
  iconUrl: 'marker-icon-2x-green.png',
  shadowUrl: 'marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
})

// Icono para estaciones móviles (amarillo)
const iconoMovil = L.icon({
  iconUrl: 'marker-icon-2x-yellow.png',
  // ...
})
```

### Añadir Marcadores

```typescript
estacionesFiltradas.forEach((estacion) => {
  if (estacion.latitud && estacion.longitud) {
    const marker = L.marker(
      [estacion.latitud, estacion.longitud],
      { icon: estacion.tipo === 'Estacion Fija' ? iconoFija : iconoMovil }
    )

    marker.bindPopup(`
      <div>
        <h3><strong>${estacion.nombre}</strong></h3>
        <p>${estacion.direccion}</p>
        <p><strong>Tipo:</strong> ${estacion.tipo}</p>
      </div>
    `)

    markersLayer.addLayer(marker)
  }
})
```

### Zoom Automático

```typescript
// Ajustar vista a todos los marcadores
if (bounds.isValid()) {
  mapRef.current.fitBounds(bounds, { padding: [50, 50] })
}
```

---

## 📡 Server-Sent Events (SSE)

### Implementación

```typescript
export const connectToLogs = (
  onLog: (log: LogMessage) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const eventSource = new EventSource(`${API_BASE_URL}/api/carga/logs`)

  eventSource.onmessage = (event) => {
    try {
      const log: LogMessage = JSON.parse(event.data)
      onLog(log)
    } catch (error) {
      console.error('Error parseando log:', error)
    }
  }

  eventSource.onerror = (error) => {
    console.error('Error en EventSource:', error)
    if (onError) onError(error as Error)
  }

  // Función de limpieza
  return () => {
    eventSource.close()
  }
}
```

### Uso en Componente

```typescript
useEffect(() => {
  const disconnect = connectToLogs(
    (log) => setLogs(prev => [...prev, log]),
    (error) => console.error('SSE error:', error)
  )

  // Limpieza al desmontar
  return () => disconnect()
}, [])
```

---

## 🎨 Diseño y Estilos

### Sistema de Colores

- **Primario**: Azul (`blue-600`) - Búsqueda
- **Secundario**: Púrpura (`purple-600`) - Carga de datos
- **Success**: Verde (`green-500`)
- **Warning**: Amarillo (`yellow-500`)
- **Error**: Rojo (`red-500`)

### Componentes Reutilizables

**Botones:**
```tsx
className="px-6 py-3 bg-blue-600 text-white rounded-lg 
           hover:bg-blue-700 transition-all shadow-lg 
           hover:shadow-xl disabled:opacity-50"
```

**Tarjetas:**
```tsx
className="bg-white rounded-xl shadow-lg p-6 
           hover:shadow-xl transition-all"
```

**Inputs:**
```tsx
className="w-full px-4 py-3 border-2 border-gray-300 
           rounded-lg focus:outline-none focus:border-blue-500 
           transition-all"
```

---

## 🔗 Integración con Backend

### Configuración de CORS

El backend debe permitir peticiones desde el frontend:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: 'http://localhost:5173'
}))
```

### Endpoints Utilizados

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/api/estaciones` | GET | Búsqueda con filtros |
| `/api/carga/all` | POST | Carga completa |
| `/api/carga/cv` | POST | Carga CV |
| `/api/carga/gal` | POST | Carga GAL |
| `/api/carga/cat` | POST | Carga CAT |
| `/api/carga/estadisticas` | GET | Estadísticas |
| `/api/carga/logs` | GET | SSE logs |
| `/api/limpiar` | DELETE | Limpiar BD |

---

## 🐛 Solución de Problemas

### El mapa no se muestra

**Problema:** Mapa en blanco o sin tiles.  
**Solución:**
- Verifica la conexión a internet
- Comprueba que las URLs de OpenStreetMap son accesibles
- Revisa la consola del navegador para errores

### Los marcadores no aparecen

**Problema:** Iconos por defecto no se cargan.  
**Solución:**
- Usa los iconos de CDN incluidos en el código
- Verifica que `L.Icon.Default.mergeOptions()` se ejecuta

### SSE no conecta

**Problema:** Logs no aparecen en tiempo real.  
**Solución:**
- Verifica que el backend está ejecutándose
- Comprueba CORS en el backend
- Revisa la consola del navegador
- Asegúrate de que no hay conexiones SSE previas sin cerrar

### Error 404 en API

**Problema:** Peticiones fallan con 404.  
**Solución:**
- Verifica que `VITE_API_URL` en `.env` es correcto
- Asegúrate de que el backend está ejecutándose
- Comprueba que los endpoints coinciden con los del backend

---

## 📚 Recursos Adicionales

- [Documentación de React](https://react.dev/)
- [Documentación de TypeScript](https://www.typescriptlang.org/)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de Leaflet](https://leafletjs.com/)
- [Documentación de React Router](https://reactrouter.com/)
- [Lucide Icons](https://lucide.dev/)

---

## 🤝 Contribuir

Si deseas contribuir al proyecto:

1. Realiza un fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

---

## 📄 Licencia

Este proyecto está bajo licencia ISC.

---

**Desarrollado con ❤️ usando React, TypeScript y Vite**
