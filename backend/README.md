# 🔧 Backend - ITV Finder API

API REST para la gestión y búsqueda de estaciones ITV de tres comunidades autónomas españolas: **Comunidad Valenciana**, **Galicia** y **Cataluña**.

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Tecnologías](#-tecnologías)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Modelo de Datos](#-modelo-de-datos)
- [Endpoints de la API](#-endpoints-de-la-api)
- [Proceso ETL](#-proceso-etl)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#-estructura-del-proyecto)

---

## 📝 Descripción General

Este backend implementa una **arquitectura ETL (Extract, Transform, Load)** que:

1. **Extrae** datos de estaciones ITV desde archivos en diferentes formatos (JSON, CSV, XML)
2. **Transforma** y valida los datos, incluyendo geocodificación cuando es necesario
3. **Carga** los datos en una base de datos PostgreSQL (Supabase)
4. **Expone** una API REST para búsqueda y consulta de estaciones

### Características principales

✅ Procesamiento de múltiples fuentes de datos (JSON, CSV con encoding latin1, XML)  
✅ Geocodificación automática con Selenium y Nominatim para coordenadas faltantes  
✅ Validación y corrección automática de datos  
✅ API de búsqueda unificada con filtros por provincia, localidad, tipo y proximidad  
✅ Sistema de carga modular por comunidad autónoma  
✅ Logs en tiempo real con Server-Sent Events (SSE)  
✅ Gestión de duplicados y limpieza de base de datos  

---

## 🛠 Tecnologías

- **Runtime**: Node.js v18+
- **Framework**: Express.js 5.x
- **Lenguaje**: TypeScript 5.x
- **Base de Datos**: PostgreSQL (Supabase)
- **Geocodificación**: Selenium WebDriver + Nominatim (OpenStreetMap)
- **Parsing**: xml2js, csv-parser
- **Principales dependencias**:
  - `@supabase/supabase-js` - Cliente de Supabase
  - `express` - Framework web
  - `cors` - Middleware CORS
  - `dotenv` - Variables de entorno
  - `selenium-webdriver` - Automatización para geocodificación
  - `xml2js` - Parser XML
  - `csv-parser` - Parser CSV

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                 FUENTES DE DATOS                         │
├─────────────────────────────────────────────────────────┤
│  CV: JSON         GAL: CSV (latin1)      CAT: XML       │
│  estaciones.json  Estacions_ITV.csv      ITV-CAT.xml    │
└──────┬─────────────────┬─────────────────┬──────────────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                    WRAPPERS                              │
│  wrapperCV.ts    wrapperGAL.ts     wrapperCAT.ts        │
│  (Lee JSON)      (Lee CSV)         (Lee XML)            │
└──────┬─────────────────┬─────────────────┬──────────────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                   EXTRACTORES                            │
│  extractorCV.ts   extractorGAL.ts   extractorCAT.ts     │
│  + Geocodificación + Validación    + Transformación     │
└──────┬─────────────────┬─────────────────┬──────────────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL)                       │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│   │provincia │◄─┤localidad │◄─┤ estacion │             │
│   │  (12)    │  │  (600+)  │  │  (1000+) │             │
│   └──────────┘  └──────────┘  └──────────┘             │
└──────┬─────────────────┬─────────────────┬──────────────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                  API REST (Express)                      │
│            http://localhost:4000/api/*                   │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Datos

**Capa de Extracción (Wrappers)**
- Responsabilidad única: Leer archivos fuente
- Sin validaciones complejas ni acceso a BD
- Retorna datos en bruto parseados

**Capa de Transformación (Extractors)**
- Validación y corrección de datos
- Geocodificación (solo CV)
- Transformación de tipos
- Gestión de provincias y localidades
- Inserción en base de datos

**Capa de API**
- Búsqueda unificada con múltiples filtros
- Endpoints de carga (ETL)
- Administración (limpieza, duplicados, estadísticas)
- Logs en tiempo real (SSE)

---

## 📦 Instalación

### Prerrequisitos

- Node.js >= 18.0.0
- npm o yarn
- Cuenta en Supabase
- Google Chrome (para geocodificación con Selenium)

### Pasos

```bash
# Clonar el repositorio (si aplica)
git clone <repo-url>

# Navegar al directorio backend
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de Supabase
```

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del directorio backend:

```env
# Supabase Configuration
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_clave_anon_publica

# Server Configuration
PORT=4000
```

### Base de Datos (Supabase)

La base de datos debe tener las siguientes tablas:

```sql
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

-- Enum para tipo de estación
CREATE TYPE tipo_estacion AS ENUM ('Estacion Fija', 'Estacion Movil', 'Otros');

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

---

## 🗄️ Modelo de Datos

### Relaciones

```
provincia (1) ──── (N) localidad (1) ──── (N) estacion
```

### Tablas

#### `provincia`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| nombre | VARCHAR(100) | Nombre de la provincia (ej: "Valencia") |
| createdAt | TIMESTAMP | Fecha de creación |

#### `localidad`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| nombre | VARCHAR(200) | Nombre de la localidad/municipio |
| provinciaId | UUID | FK → provincia.id |
| createdAt | TIMESTAMP | Fecha de creación |

#### `estacion`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| nombre | VARCHAR(255) | Nombre de la estación |
| direccion | TEXT | Dirección completa |
| codigoPostal | VARCHAR(10) | Código postal |
| telefono | VARCHAR(50) | Teléfono de contacto |
| latitud | DOUBLE | Coordenada geográfica |
| longitud | DOUBLE | Coordenada geográfica |
| tipo | ENUM | "Estacion Fija" \| "Estacion Movil" \| "Otros" |
| descripcion | TEXT | Información adicional (horarios, operador...) |
| localidadId | UUID | FK → localidad.id |
| createdAt | TIMESTAMP | Fecha de creación |

---

## 🌐 Endpoints de la API

### Información General

```http
GET /
```

Devuelve información sobre la API, versión y endpoints disponibles.

---

### 🔍 API de Búsqueda Unificada

#### Buscar estaciones con filtros

```http
GET /api/estaciones
```

**Query Parameters:**

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `provincia` | string | Filtrar por provincia (case-insensitive) | `Valencia` |
| `localidad` | string | Filtrar por localidad (case-insensitive) | `Torrent` |
| `tipo` | string | Tipo de estación | `Estacion Fija` |
| `lat` | number | Latitud (requiere lon y radio) | `39.4699` |
| `lon` | number | Longitud (requiere lat y radio) | `-0.3763` |
| `radio` | number | Radio de búsqueda en km | `20` |

**Ejemplos:**

```bash
# Todas las estaciones de Valencia
GET /api/estaciones?provincia=Valencia

# Estaciones en Vigo
GET /api/estaciones?localidad=Vigo

# Solo estaciones móviles
GET /api/estaciones?tipo=Estacion%20Movil

# Estaciones cercanas a Valencia (radio de 20km)
GET /api/estaciones?lat=39.4699&lon=-0.3763&radio=20

# Combinación de filtros
GET /api/estaciones?provincia=Barcelona&tipo=Estacion%20Fija
```

**Respuesta:**

```json
{
  "total": 15,
  "estaciones": [
    {
      "id": "uuid",
      "nombre": "Estación ITV de Valencia",
      "direccion": "Calle Ejemplo, 123",
      "codigoPostal": "46001",
      "telefono": "961234567",
      "latitud": 39.4699,
      "longitud": -0.3763,
      "tipo": "Estacion Fija",
      "descripcion": "Horario: L-V 8:00-18:00",
      "createdAt": "2026-01-15T10:00:00Z",
      "localidad": {
        "id": "uuid",
        "nombre": "Valencia",
        "provincia": {
          "id": "uuid",
          "nombre": "Valencia"
        }
      },
      "distancia_km": 5.2  // Solo en búsqueda por proximidad
    }
  ]
}
```

---

### 📥 API de Carga (ETL)

#### Cargar todos los datos

```http
POST /api/carga/all?source=data/entrega2
```

Ejecuta el proceso ETL completo para las tres comunidades autónomas.

**Query Parameters:**
- `source`: `data/entrega1` | `data/entrega2` | `data/completo` (por defecto: `data/entrega2`)

**Respuesta:**
```json
{
  "success": true,
  "message": "Carga completa exitosa",
  "source": "data/entrega2"
}
```

#### Cargar datos por comunidad

```http
POST /api/carga/cv?source=data/entrega2
POST /api/carga/gal?source=data/entrega2
POST /api/carga/cat?source=data/entrega2
```

Carga datos de una comunidad específica.

#### Estadísticas de carga

```http
GET /api/carga/estadisticas
```

Devuelve información sobre el último proceso de carga.

#### Logs en tiempo real

```http
GET /api/carga/logs
```

Servidor de eventos (SSE) que transmite logs del proceso ETL en tiempo real.

---

### 📊 Wrappers (Capa de Extracción)

Endpoints que devuelven los datos **en bruto** desde los archivos fuente, sin acceder a la base de datos.

```http
GET /api/wrapper/cv?source=data/entrega2
GET /api/wrapper/gal?source=data/entrega2
GET /api/wrapper/cat?source=data/entrega2
```

**Uso:** Útil para verificar datos fuente o debugging del proceso ETL.

---

### 🛠 Administración

#### Limpiar base de datos

```http
DELETE /api/limpiar
```

Elimina **todos los datos** de las tablas estacion, localidad y provincia (respetando foreign keys).

⚠️ **Precaución:** Esta acción es irreversible.

#### Eliminar duplicados

```http
DELETE /api/duplicados
```

Identifica y elimina estaciones duplicadas basándose en nombre, dirección y localidad.

**Respuesta:**
```json
{
  "message": "Duplicados eliminados correctamente",
  "duplicadosEliminados": 5
}
```

#### Estadísticas generales

```http
GET /api/estadisticas
```

Devuelve estadísticas agregadas de toda la base de datos.

**Respuesta:**
```json
{
  "estadisticas": {
    "totalEstaciones": 1050,
    "totalLocalidades": 620,
    "totalProvincias": 12,
    "porComunidad": {
      "Comunidad Valenciana": 250,
      "Galicia": 180,
      "Cataluña": 420,
      "Otras": 200
    },
    "porTipo": {
      "Estacion Fija": 950,
      "Estacion Movil": 85,
      "Otros": 15
    }
  }
}
```

---

## ⚙️ Proceso ETL

### Comunidad Valenciana (CV)

**Fuente:** `data/{source}/estaciones.json` (JSON)

**Características:**
- ✅ Geocodificación automática con Selenium + Nominatim
- 📍 Limpieza y normalización de direcciones
- ⏱️ Rate limiting para evitar bloqueos de API

**Proceso:**
1. **Extracción**: Lectura del JSON con `wrapperCV`
2. **Validación**: Corrección de campos faltantes o incorrectos
3. **Geocodificación**: Si no hay coordenadas, se obtienen de Nominatim
4. **Transformación**: Mapeo de tipos de estación
5. **Carga**: Inserción en BD con gestión de provincias/localidades

**Particularidades:**
- Estaciones móviles: cuando el municipio está vacío
- Descripción incluye horarios y correo electrónico

---

### Galicia (GAL)

**Fuente:** `data/{source}/Estacions_ITV.csv` (CSV con encoding **latin1**)

**Características:**
- 🌍 Coordenadas ya incluidas en el CSV
- 🔤 Encoding latin1 crítico para caracteres gallegos (ñ, á, ó...)
- 🧮 Conversión de coordenadas de grados/minutos/segundos a decimal

**Proceso:**
1. **Extracción**: Lectura del CSV con encoding latin1
2. **Conversión**: Coordenadas de formato DMS a decimal
3. **Validación**: Verificación de campos obligatorios
4. **Transformación**: Mapeo de campos y tipos
5. **Carga**: Inserción en BD

**Particularidades:**
- No requiere geocodificación
- Manejo especial de caracteres gallegos
- Concello = municipio en gallego

---

### Cataluña (CAT)

**Fuente:** `data/{source}/ITV-CAT.xml` (XML)

**Características:**
- 📍 Coordenadas en formato entero (escala 1e6)
- 🏢 Extracción de operadores privados desde descripción
- 📝 Parsing con xml2js

**Proceso:**
1. **Extracción**: Parsing del XML con xml2js
2. **Transformación**: División de coordenadas (factor 1e6)
3. **Extracción**: Operador desde campo descripción
4. **Validación**: Verificación de datos
5. **Carga**: Inserción en BD

**Particularidades:**
- Todas las estaciones son fijas
- Operadores privados en campo descripción
- Municipi = municipio en catalán

---

## 🚀 Scripts Disponibles

### Desarrollo

```bash
# Iniciar servidor en modo desarrollo (con auto-recarga)
npm run dev
```

### Carga de Datos (Manual)

```bash
# Cargar todos los datos
npm run carga

# Cargar solo Comunidad Valenciana
npm run load:cv

# Cargar solo Galicia
npm run load:gal

# Cargar solo Cataluña
npm run load:cat
```

### Administración

```bash
# Limpiar toda la base de datos
npm run limpiar

# Ver estadísticas
npm run estadisticas
```

### Compilación y Producción

```bash
# Compilar TypeScript a JavaScript
npm run build

# Ejecutar versión compilada (producción)
npm start
```

### Testing

```bash
# Probar tipos de Supabase
npm run test:types

# Probar configuración de Selenium
npm run test:selenium
```

---

## 📂 Estructura del Proyecto

```
backend/
├── src/
│   ├── index.ts                    # Servidor Express (17 endpoints)
│   │
│   ├── api/                        # Lógica de endpoints
│   │   ├── busqueda.ts             # Búsqueda unificada con filtros
│   │   ├── carga.ts                # ETL - Cargar datos desde archivos
│   │   ├── estadisticas.ts         # Estadísticas agregadas
│   │   ├── limpiar.ts              # Limpieza BD y duplicados
│   │   └── sseLogger.ts            # Server-Sent Events para logs
│   │
│   ├── wrappers/                   # Capa de Extracción (solo lectura)
│   │   ├── wrapperCV.ts            # Lee JSON de CV
│   │   ├── wrapperGAL.ts           # Lee CSV de GAL (latin1)
│   │   └── wrapperCAT.ts           # Lee XML de CAT
│   │
│   ├── extractors/                 # Capa de Transformación y Carga
│   │   ├── extractorCV.ts          # CV: Geocodificación + validación
│   │   ├── extractorGAL.ts         # GAL: Conversión coordenadas
│   │   └── extractorCAT.ts         # CAT: Parsing XML + operadores
│   │
│   ├── utils/                      # Utilidades compartidas
│   │   ├── dbHelpers.ts            # getOrCreate (provincia/localidad)
│   │   ├── geocoding.ts            # Selenium + Nominatim
│   │   ├── validator.ts            # Validación y corrección de datos
│   │   └── seleniumConfig.ts       # Configuración ChromeDriver
│   │
│   └── db/
│       └── supabaseClient.ts       # Cliente Supabase singleton
│
├── data/                           # Archivos fuente
│   ├── entrega1/                   # Dataset inicial
│   ├── entrega2/                   # Dataset actualizado
│   └── completo/                   # Dataset completo
│       ├── estaciones.json         # CV
│       ├── Estacions_ITV.csv       # GAL
│       └── ITV-CAT.xml             # CAT
│
├── .env                            # Variables de entorno (no en git)
├── package.json                    # Dependencias y scripts
├── tsconfig.json                   # Configuración TypeScript
└── README.md                       # Esta documentación
```

---

## 🔧 Utilidades Clave

### dbHelpers.ts

```typescript
// Gestiona provincias evitando duplicados
getOrCreateProvincia(nombre: string): Promise<string | null>

// Gestiona localidades evitando duplicados
getOrCreateLocalidad(nombre: string, provinciaId: string): Promise<string | null>

// Verifica si una estación ya existe
existeEstacion(nombre: string, direccion: string, localidadId: string): Promise<boolean>
```

### validator.ts

```typescript
// Valida y corrige estaciones de CV (sin coordenadas iniciales)
validarYCorregirEstacionSinCoordenadas(datos: any, comunidad: string)

// Valida coordenadas geográficas
validarCoordenadas(lat: number, lon: number): boolean
```

### geocoding.ts

```typescript
// Geocodificación con Selenium (más robusto que fetch directo)
geocodificarConSelenium(query: string): Promise<{lat: number, lon: number} | null>

// Delay para rate limiting
delay(ms: number): Promise<void>
```

---

## 🧠 Problemas Resueltos

### 1. Geocodificación fallida
**Problema:** Direcciones con "s/n", "parcela", "km" fallaban en Nominatim.  
**Solución:** Limpieza de direcciones + fallback a solo municipio/provincia.

### 2. Encoding CSV Galicia
**Problema:** Caracteres gallegos (ñ, á, ó) se mostraban como �.  
**Solución:** `fs.createReadStream(csvPath, { encoding: 'latin1' })`

### 3. Coordenadas Galicia incorrectas
**Problema:** CSV con formato grados/minutos/segundos.  
**Solución:** Función de conversión matemática DMS → decimal.

### 4. Duplicados en base de datos
**Problema:** Múltiples ejecuciones creaban duplicados.  
**Solución:** Funciones `getOrCreate` y verificación antes de insertar.

### 5. Rate limiting de Nominatim
**Problema:** Bloqueo por demasiadas peticiones.  
**Solución:** Delays configurables y uso de Selenium como intermediario.

---

