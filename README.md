# 🚗 ITV Finder

**Sistema integral de gestión y búsqueda de estaciones de Inspección Técnica de Vehículos (ITV)** en España.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1-lightgrey.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com/)

---

## 📋 Tabla de Contenidos

- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Características Principales](#-características-principales)
- [Arquitectura](#-arquitectura)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Funcionalidades](#-funcionalidades)
- [Documentación](#-documentación)
- [Capturas de Pantalla](#-capturas-de-pantalla)
- [Roadmap](#-roadmap)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 📝 Descripción del Proyecto

**ITV Finder** es una aplicación full-stack que centraliza y expone información sobre estaciones ITV de tres comunidades autónomas españolas:

- 🟢 **Comunidad Valenciana** (Valencia, Castellón, Alicante)
- 🔵 **Galicia** (A Coruña, Lugo, Ourense, Pontevedra)
- 🔴 **Cataluña** (Barcelona, Girona, Lleida, Tarragona)

El sistema procesa datos desde múltiples fuentes (JSON, CSV, XML), los normaliza, valida, geocodifica cuando es necesario y los almacena en una base de datos PostgreSQL para su posterior consulta a través de una API REST y una interfaz web interactiva.

---

## ✨ Características Principales

### 🔍 Búsqueda Avanzada
- Búsqueda por provincia, localidad, tipo de estación o código postal
- Búsqueda por proximidad geográfica (radio en kilómetros)
- Visualización en mapa interactivo con Leaflet
- Filtrado dinámico cliente-side

### 📊 ETL (Extract, Transform, Load)
- Extracción automática desde archivos JSON, CSV (latin1) y XML
- Validación y corrección de datos
- Geocodificación automática con Selenium + Nominatim
- Logs en tiempo real con Server-Sent Events (SSE)
- Carga selectiva por comunidad autónoma

### 🗺️ Visualización
- Mapa interactivo de España con Leaflet
- Marcadores diferenciados por tipo de estación
- Popups informativos con detalles de cada estación
- Zoom automático a zona de resultados

### 🛠️ Administración
- Limpieza completa de base de datos
- Eliminación de duplicados
- Estadísticas en tiempo real
- Sistema de logs estructurado

---

## 🏗 Arquitectura

El proyecto sigue una **arquitectura de tres capas** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌──────────────────┐           ┌──────────────────┐        │
│  │  SearchPage      │           │  DataLoadPage    │        │
│  │  - Búsqueda      │           │  - Carga ETL     │        │
│  │  - Mapa Leaflet  │           │  - Logs SSE      │        │
│  └──────────────────┘           └──────────────────┘        │
└───────────────────┬──────────────────┬──────────────────────┘
                    │                  │
                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│               BACKEND (Express + TypeScript)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   API REST   │  │   Wrappers   │  │  Extractors  │      │
│  │  - Búsqueda  │  │  - Lee CSV   │  │  - Valida    │      │
│  │  - Carga     │  │  - Lee JSON  │  │  - Geocodif. │      │
│  │  - Admin     │  │  - Lee XML   │  │  - Transform │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────┬──────────────────┬──────────────────────┘
                    │                  │
                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│          SUPABASE (PostgreSQL + Storage)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │provincia │◄─┤localidad │◄─┤ estacion │                  │
│  │  (12)    │  │  (600+)  │  │  (1000+) │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

**1. Capa de Extracción (Wrappers)**
- Lee archivos fuente sin procesamiento
- Retorna datos en bruto

**2. Capa de Transformación (Extractors)**
- Valida y corrige datos
- Geocodifica direcciones (CV)
- Transforma formatos
- Inserta en base de datos

**3. Capa de API**
- Expone endpoints REST
- Gestiona búsquedas
- Provee logs en tiempo real

**4. Capa de Presentación (Frontend)**
- Interfaz de usuario
- Visualización en mapa
- Gestión de carga ETL

---

## 🛠 Tecnologías

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.1
- **Lenguaje**: TypeScript 5.9
- **Base de Datos**: PostgreSQL (Supabase)
- **Geocodificación**: Selenium WebDriver + Nominatim
- **Parsing**: xml2js, csv-parser
- **Testing**: ts-node

### Frontend
- **Framework**: React 18.2
- **Lenguaje**: TypeScript 5.1
- **Bundler**: Vite 7.3
- **Routing**: React Router DOM 6.30
- **Mapas**: Leaflet 1.9.4
- **Iconos**: Lucide React
- **Estilos**: TailwindCSS (utility-first)

### Shared
- **Tipos**: TypeScript compartidos entre frontend y backend
- **Validación**: Helpers de tipos personalizados

---

## 📂 Estructura del Proyecto

```
itv_finder/
├── backend/                        # API REST + ETL
│   ├── src/
│   │   ├── index.ts                # Servidor Express
│   │   ├── api/                    # Endpoints
│   │   ├── extractors/             # Transformación + carga
│   │   ├── wrappers/               # Extracción datos
│   │   ├── utils/                  # Utilidades
│   │   └── db/                     # Cliente Supabase
│   ├── data/                       # Archivos fuente
│   │   ├── entrega1/
│   │   ├── entrega2/
│   │   └── completo/
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md                   # Documentación backend
│
├── frontend/                       # Aplicación React
│   ├── src/
│   │   ├── App.tsx                 # Componente raíz
│   │   ├── pages/                  # Páginas
│   │   │   ├── SearchPage.tsx
│   │   │   └── DataLoadPage.tsx
│   │   └── services/               # Servicios API
│   │       ├── apiClient.ts
│   │       ├── estacionesService.ts
│   │       └── cargaService.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md                   # Documentación frontend
│
└── shared/                         # Tipos compartidos
    ├── database.types.ts
    └── types/
        ├── api.types.ts
        ├── database.types.ts
        ├── helpers.ts
        └── index.ts
```

---

## 📦 Instalación

### Prerrequisitos

- **Node.js** >= 18.0.0
- **npm** o **yarn**
- **Cuenta en Supabase** (gratuita)
- **Google Chrome** (para geocodificación con Selenium)

### Clonar el Repositorio

```bash
git clone <repository-url>
cd itv_finder
```

### Instalar Dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## ⚙️ Configuración

### 1. Base de Datos (Supabase)

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el siguiente SQL en el editor SQL de Supabase:

```sql
-- Crear enum tipo estación
CREATE TYPE tipo_estacion AS ENUM ('Estacion Fija', 'Estacion Movil', 'Otros');

-- Tabla provincia
CREATE TABLE provincia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Tabla localidad
CREATE TABLE localidad (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    "provinciaId" UUID REFERENCES provincia(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE(nombre, "provinciaId")
);

-- Tabla estacion
CREATE TABLE estacion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    "codigoPostal" VARCHAR(10),
    telefono VARCHAR(50),
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    tipo tipo_estacion NOT NULL,
    descripcion TEXT,
    "localidadId" UUID REFERENCES localidad(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Índices para optimizar búsquedas
CREATE INDEX idx_estacion_localidad ON estacion("localidadId");
CREATE INDEX idx_estacion_tipo ON estacion(tipo);
CREATE INDEX idx_localidad_provincia ON localidad("provinciaId");
```

### 2. Variables de Entorno

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_clave_anon_publica
PORT=4000
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:4000
```

---

## 🚀 Ejecución

### Desarrollo (Modo Completo)

**Opción 1: Terminales Separadas**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Opción 2: Script Concurrente (si está configurado)**

```bash
# Desde la raíz
npm run dev
```

### Acceso a la Aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000 (JSON con endpoints)

### Primera Ejecución

1. **Inicia el backend** (espera a que esté listo)
2. **Inicia el frontend**
3. **Carga los datos**:
   - Ve a "Carga de datos" en el frontend
   - Selecciona las comunidades deseadas
   - Haz clic en "Cargar Datos"
   - Observa los logs en tiempo real

---

## 🎯 Funcionalidades

### Búsqueda de Estaciones

**Endpoint**: `GET /api/estaciones`

**Filtros disponibles:**
- `provincia`: Nombre de provincia (ej: "Valencia")
- `localidad`: Nombre de localidad (ej: "Vigo")
- `tipo`: Tipo de estación ("Estacion Fija", "Estacion Movil", "Otros")
- `lat`, `lon`, `radio`: Búsqueda por proximidad

**Ejemplos:**

```bash
# Todas las estaciones de Valencia
curl "http://localhost:4000/api/estaciones?provincia=Valencia"

# Estaciones móviles en Galicia
curl "http://localhost:4000/api/estaciones?provincia=A%20Coruña&tipo=Estacion%20Movil"

# Estaciones cercanas a Barcelona (radio 20km)
curl "http://localhost:4000/api/estaciones?lat=41.3874&lon=2.1686&radio=20"
```

### Carga de Datos ETL

**Endpoints:**
- `POST /api/carga/all` - Cargar todas las comunidades
- `POST /api/carga/cv` - Solo Comunidad Valenciana
- `POST /api/carga/gal` - Solo Galicia
- `POST /api/carga/cat` - Solo Cataluña

**Parámetros:**
- `source`: `data/entrega1` | `data/entrega2` | `data/completo`

**Ejemplo:**

```bash
curl -X POST "http://localhost:4000/api/carga/all?source=data/entrega2"
```

### Logs en Tiempo Real

**Endpoint**: `GET /api/carga/logs` (Server-Sent Events)

**Conexión desde JavaScript:**

```javascript
const eventSource = new EventSource('http://localhost:4000/api/carga/logs');

eventSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(log.message, log.type);
};
```

### Administración

```bash
# Limpiar toda la base de datos
curl -X DELETE "http://localhost:4000/api/limpiar"

# Eliminar duplicados
curl -X DELETE "http://localhost:4000/api/duplicados"

# Ver estadísticas
curl "http://localhost:4000/api/estadisticas"
```

---

## 📖 Documentación

Para información detallada sobre cada componente:

- **[Backend README](backend/README.md)** - Arquitectura ETL, endpoints, utilidades
- **[Frontend README](frontend/README.md)** - Componentes, servicios, integración con Leaflet
- **[Shared Types README](shared/types/README.md)** - Tipos compartidos

---

## 📸 Capturas de Pantalla

### Página de Búsqueda
*Formulario de búsqueda con mapa interactivo mostrando estaciones ITV*

### Página de Carga ETL
*Interfaz de carga con logs en tiempo real y estadísticas*

### Mapa con Marcadores
*Visualización de estaciones con marcadores diferenciados*

---

## 🗺️ Roadmap

### ✅ Completado

- [x] Backend API REST con Express
- [x] ETL para 3 comunidades autónomas
- [x] Geocodificación automática
- [x] Frontend React con Vite
- [x] Mapa interactivo con Leaflet
- [x] Logs en tiempo real con SSE
- [x] Búsqueda con múltiples filtros
- [x] Administración (limpieza, duplicados)

### 🚧 En Desarrollo

- [ ] Tests unitarios y de integración
- [ ] CI/CD con GitHub Actions
- [ ] Docker Compose para desarrollo
- [ ] Caché de geocodificación
- [ ] Paginación en resultados

### 🔮 Futuro

- [ ] Más comunidades autónomas
- [ ] Autenticación de usuarios
- [ ] Favoritos y alertas
- [ ] API pública con rate limiting
- [ ] Modo offline con Service Workers
- [ ] Exportación de datos (CSV, PDF)
- [ ] Gráficos y analytics
- [ ] App móvil (React Native)

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. **Fork** el repositorio
2. Crea una **rama** para tu feature (`git checkout -b feature/mi-feature`)
3. **Commit** tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/mi-feature`)
5. Abre un **Pull Request**

### Guías de Contribución

- Usa TypeScript para todo el código nuevo
- Sigue las convenciones de nombres existentes
- Añade tests para nuevas funcionalidades
- Actualiza la documentación si es necesario
- Asegúrate de que `npm run typecheck` pasa sin errores

---

## 🧪 Testing

```bash
# Backend
cd backend
npm run test:types        # Verificar tipos
npm run test:selenium     # Probar Selenium

# Frontend
cd frontend
npm run typecheck         # Verificar tipos
```

---

## 🐛 Solución de Problemas

### Backend no conecta con Supabase

**Solución:**
- Verifica `SUPABASE_URL` y `SUPABASE_KEY` en `.env`
- Comprueba que las tablas están creadas
- Revisa los logs del servidor

### Geocodificación falla

**Solución:**
- Instala/actualiza ChromeDriver: `npm install chromedriver@latest`
- Verifica que Chrome está instalado
- Revisa los delays en `seleniumConfig.ts`

### Frontend no conecta con backend

**Solución:**
- Verifica que el backend está ejecutándose
- Comprueba `VITE_API_URL` en `frontend/.env`
- Revisa la configuración de CORS en el backend

### SSE no funciona

**Solución:**
- Cierra conexiones previas
- Verifica que el navegador soporta SSE
- Comprueba la consola del navegador para errores

---

## 📊 Datos del Proyecto

### Volumen Estimado
- **Provincias**: 12 (3 CV + 4 GAL + 4 CAT + "Desconocido")
- **Localidades**: ~600 municipios
- **Estaciones ITV**: ~1000+
  - Comunidad Valenciana: ~250
  - Galicia: ~180
  - Cataluña: ~420

### Fuentes de Datos
- **CV**: JSON oficial Generalitat Valenciana
- **GAL**: CSV (latin1) Xunta de Galicia
- **CAT**: XML Generalitat de Catalunya

---

## 📄 Licencia

Este proyecto está bajo la **Licencia ISC**.

```
Copyright (c) 2026 ITV Finder Team

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.
```

---

## 👥 Equipo

Desarrollado como proyecto académico para la asignatura de **Integración de Sistemas**.

---

## 📧 Contacto

Para consultas, bugs o sugerencias:

- 🐛 **Issues**: [GitHub Issues](<repo-url>/issues)
- 📧 **Email**: [Contacto]
- 📚 **Wiki**: [Documentación adicional](<repo-url>/wiki)

---

## 🙏 Agradecimientos

- **Generalitat Valenciana**, **Xunta de Galicia** y **Generalitat de Catalunya** por los datos abiertos
- **OpenStreetMap / Nominatim** por el servicio de geocodificación
- **Supabase** por la plataforma de base de datos
- Comunidad de **React**, **TypeScript** y **Leaflet**

---

<div align="center">

**⭐ Si te ha gustado el proyecto, considera darle una estrella ⭐**

**Desarrollado con ❤️ usando TypeScript, React, Express y PostgreSQL**

</div>
