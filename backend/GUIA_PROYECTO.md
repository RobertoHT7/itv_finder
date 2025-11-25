# 📘 GUÍA COMPLETA DEL PROYECTO ITV FINDER

## 📌 RESUMEN EJECUTIVO

**ITV Finder** es una API REST que centraliza datos de estaciones ITV de tres comunidades autónomas españolas (Comunidad Valenciana, Galicia y Cataluña), procesándolos desde diferentes formatos y exponiéndolos a través de endpoints HTTP con búsqueda geolocalizada.

### Tecnologías principales:
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: Supabase (PostgreSQL)
- **Procesamiento**: CSV, JSON, XML parsing
- **Geocodificación**: API Nominatim (OpenStreetMap)

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────┐
│                    FUENTES DE DATOS                      │
├─────────────────────────────────────────────────────────┤
│  CV: JSON  │  GAL: CSV (latin1)  │  CAT: XML            │
└──────┬────────────────┬────────────────────┬────────────┘
       │                │                    │
       ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                     EXTRACTORES                          │
│  extractorCV.ts  │  extractorGAL.ts  │  extractorCAT.ts │
│  (+ geocoding)   │  (+ conversión    │  (+ parsing      │
│                  │   coordenadas)    │   operador)      │
└──────┬────────────────┬────────────────────┬────────────┘
       │                │                    │
       ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE POSTGRESQL                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│   │provincia │  │localidad │  │estacion  │             │
│   │  (12)    │◄─┤  (600+)  │◄─┤  (1000+) │             │
│   └──────────┘  └──────────┘  └──────────┘             │
└──────┬────────────────┬────────────────────┬────────────┘
       │                │                    │
       ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                      WRAPPERS                            │
│   wrapperCV.ts   │   wrapperGAL.ts   │   wrapperCAT.ts │
│   (5 endpoints)  │   (6 endpoints)   │   (6 endpoints) │
└──────┬────────────────┬────────────────────┬────────────┘
       │                │                    │
       ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                    API REST (Express)                    │
│              http://localhost:4000/api/*                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ MODELO DE DATOS

### Estructura de tablas:

```sql
provincia (12 provincias)
├── id (PK)
├── nombre (Valencia, Barcelona, A Coruña...)
└── createdAt

localidad (600+ municipios)
├── id (PK)
├── nombre (Valencia, Vigo, Sabadell...)
├── provinciaId (FK → provincia.id)
└── createdAt

estacion (1000+ estaciones ITV)
├── id (PK)
├── nombre ("ITV de Valencia", "ITV de Vigo"...)
├── direccion
├── codigoPostal
├── telefono
├── latitud / longitud (geocodificadas)
├── tipo (ENUM: "Estacion Fija" | "Estacion Movil" | "Otros")
├── descripcion (info adicional, operador en CAT)
├── localidadId (FK → localidad.id)
└── createdAt
```

### Relaciones:
- **provincia → localidad**: 1:N (una provincia tiene muchos municipios)
- **localidad → estacion**: 1:N (un municipio tiene muchas estaciones)

---

## 📂 ESTRUCTURA DEL CÓDIGO

```
backend/
├── src/
│   ├── index.ts                    # Servidor Express + 17 endpoints
│   ├── extractors/                 # ETL desde fuentes de datos
│   │   ├── extractorCV.ts          # JSON Valencia + geocoding Nominatim
│   │   ├── extractorGAL.ts         # CSV Galicia (latin1) + conversión coords
│   │   └── extractorCAT.ts         # XML Cataluña + extracción operador
│   ├── wrappers/                   # Lógica de negocio por comunidad
│   │   ├── wrapperCV.ts            # 5 endpoints CV
│   │   ├── wrapperGAL.ts           # 6 endpoints GAL (con stats)
│   │   └── wrapperCAT.ts           # 6 endpoints CAT (con stats)
│   ├── api/
│   │   ├── carga.ts                # Script carga manual: npm run carga
│   │   ├── limpiar.ts              # Limpieza BD respetando FK
│   │   └── test.ts                 # Test conexión Supabase
│   ├── db/
│   │   └── supabaseClient.ts       # Cliente Supabase singleton
│   ├── utils/
│   │   ├── dbHelpers.ts            # getOrCreateProvincia/Localidad
│   │   └── geocoding.ts            # Wrapper Nominatim + limpieza direcciones
│   └── types/
│       ├── estacion.types.ts       # Tipos TypeScript manuales
│       └── supabase.ts             # Tipos generados desde BD
├── data/                           # Fuentes de datos originales
│   ├── estaciones.json             # CV: Generalitat Valenciana
│   ├── Estacions_ITV.csv           # GAL: Xunta de Galicia
│   └── ITV-CAT.xml                 # CAT: Generalitat de Catalunya
├── types/
│   └── supabase.ts                 # Tipos autogenerados (npx supabase gen)
├── package.json                    # Dependencias + scripts
├── tsconfig.json                   # Configuración TypeScript
└── .env                            # SUPABASE_URL + SUPABASE_KEY
```

---

## 🔄 PROCESO ETL (Extract, Transform, Load)

### 1️⃣ COMUNIDAD VALENCIANA (extractorCV.ts)

**Fuente**: `data/estaciones.json` (JSON oficial Generalitat)

**Proceso**:
```typescript
1. Parsear JSON con estructura:
   {
     "codigoPostal": "46001",
     "direccion": "Calle Ejemplo, 123",
     "municipio": "Valencia",
     "provincia": "Valencia",
     "razonSocial": "ITV EJEMPLO SL",
     "telefono": "961234567"
   }

2. Para cada estación:
   a) getOrCreateProvincia("Valencia") → obtiene/crea ID provincia
   b) getOrCreateLocalidad("Valencia", provinciaId) → obtiene/crea ID municipio
   c) geocodificarDireccion(direccion completa) → llamada Nominatim
      - Limpia dirección (quita "s/n", "parcela", "km X")
      - Primer intento: dirección completa
      - Fallback: solo municipio + provincia
      - Rate limit: 1 petición/segundo (1100ms delay)
   d) Insertar estacion con lat/lon obtenidas

3. Tipo de estación:
   - "Estacion Movil" si municipio está vacío
   - "Estacion Fija" en caso contrario
```

**Particularidades**:
- ✅ Geocodificación automática (único extractor que usa API externa)
- ⚠️ Rate limiting estricto (evitar ban de Nominatim)
- 🔧 Limpieza de direcciones para mejorar resultados

---

### 2️⃣ GALICIA (extractorGAL.ts)

**Fuente**: `data/Estacions_ITV.csv` (CSV Xunta, encoding **latin1**)

**Proceso**:
```typescript
1. Leer CSV con encoding latin1 (caracteres gallegos: ñ, á, ó...)
   fs.createReadStream(csvPath, { encoding: 'latin1' })

2. Para cada fila CSV:
   a) Validar campos obligatorios (nombreOriginal, concello, provincia)
   b) getOrCreateProvincia(provincia normalizada)
   c) getOrCreateLocalidad(concello, provinciaId)
   d) Convertir coordenadas de grados/minutos → decimal:
      
      parseGalicianCoordinates(latGrados, lonGrados):
      Ejemplo: "42º 52' 30''" → 42.875
      
      Formula: grados + (minutos/60) + (segundos/3600)
      Manejo de negativos: detecta W/S en string original
   
   e) Nombre formato: "ITV de ${concello}"

3. Tipo de estación:
   - Extraído del campo "tipoEstacion" del CSV
   - Mapeo a enum: Fija/Movil/Otros
```

**Particularidades**:
- 🌍 Coordenadas ya incluidas en CSV (no geocoding necesario)
- 🔤 Encoding latin1 crítico (caracteres gallegos)
- 🧮 Conversión matemática grados → decimal

---

### 3️⃣ CATALUÑA (extractorCAT.ts)

**Fuente**: `data/ITV-CAT.xml` (XML Generalitat)

**Proceso**:
```typescript
1. Parsear XML con xml2js:
   <estacions>
     <estacio>
       <nom>ITV Barcelona Nord</nom>
       <adreca>Carrer Ejemplo 45</adreca>
       <municipi>Barcelona</municipi>
       <provincia>Barcelona</provincia>
       <coordenades>
         <latitud>41523456</latitud>  <!-- ÷1.000.000 -->
         <longitud>2143210</longitud>
       </coordenades>
       <descripcio>Estación ITV (APPLUS+)</descripcio>
     </estacio>
   </estacions>

2. Para cada <estacio>:
   a) getOrCreateProvincia(provincia)
   b) getOrCreateLocalidad(municipi, provinciaId)
   c) Dividir coordenadas entre 1.000.000:
      latitud: 41523456 → 41.523456
   d) Extraer operador de descripción con regex:
      /\(([^)]+)\)/ → captura texto entre paréntesis
      "Estación ITV (APPLUS+)" → operador = "APPLUS+"
   e) Nombre formato: "ITV de ${municipi}"

3. Tipo de estación:
   - Siempre "Estacion Fija" (no hay móviles en CAT)
```

**Particularidades**:
- 📍 Coordenadas en formato entero (escala 1e6)
- 🏢 Operadores privados extraídos de descripción
- 📝 XML parsing con xml2js

---

## 🌐 API ENDPOINTS (17 ENDPOINTS)

### 🟦 COMUNIDAD VALENCIANA (5 endpoints)

```http
GET /api/cv
Respuesta: { total: 250, estaciones: [...] }
Descripción: Todas las estaciones de Valencia, Castellón y Alicante

GET /api/cv/provincia/:provincia
Ejemplo: /api/cv/provincia/Valencia
Respuesta: { total: 120, provincia: "Valencia", estaciones: [...] }
Descripción: Solo estaciones de la provincia especificada

GET /api/cv/municipio/:municipio
Ejemplo: /api/cv/municipio/Torrent
Respuesta: { total: 2, municipio: "Torrent", estaciones: [...] }
Descripción: Estaciones de un municipio (case-insensitive)

GET /api/cv/tipo/:tipo
Ejemplo: /api/cv/tipo/Estacion%20Fija
Respuesta: { total: 230, tipo: "Estacion Fija", estaciones: [...] }
Descripción: Filtrar por tipo (Estacion Fija/Movil/Otros)

GET /api/cv/nearby?lat=39.4699&lon=-0.3763&radius=20
Respuesta: {
  total: 8,
  coordenadas: { lat: 39.4699, lon: -0.3763 },
  radio_km: 20,
  estaciones: [
    { ...estacion, distancia_km: 2.45 },
    { ...estacion, distancia_km: 5.12 },
    ...
  ]
}
Descripción: Búsqueda por proximidad (Haversine), ordenado por distancia
```

---

### 🟩 GALICIA (6 endpoints)

```http
GET /api/gal
Respuesta: { total: 180, estaciones: [...] }
Descripción: Todas las estaciones de A Coruña, Lugo, Ourense, Pontevedra

GET /api/gal/provincia/:provincia
Ejemplo: /api/gal/provincia/Pontevedra
Respuesta: { total: 45, provincia: "Pontevedra", estaciones: [...] }
Descripción: Solo estaciones de la provincia gallega especificada

GET /api/gal/concello/:concello
Ejemplo: /api/gal/concello/Vigo
Respuesta: { total: 6, concello: "Vigo", estaciones: [...] }
Descripción: Estaciones de un concello (municipio gallego)

GET /api/gal/tipo/:tipo
Ejemplo: /api/gal/tipo/Estacion%20Movil
Respuesta: { total: 12, tipo: "Estacion Movil", estaciones: [...] }
Descripción: Filtrar por tipo en Galicia

GET /api/gal/nearby?lat=42.2314&lon=-8.7124&radius=30
Respuesta: { total: 5, coordenadas: {...}, radio_km: 30, estaciones: [...] }
Descripción: Estaciones cercanas en Galicia

GET /api/gal/stats
Respuesta: {
  total: 180,
  por_provincia: {
    "A Coruña": 52,
    "Lugo": 28,
    "Ourense": 35,
    "Pontevedra": 65
  },
  por_tipo: {
    "Estacion Fija": 168,
    "Estacion Movil": 12
  }
}
Descripción: Estadísticas agregadas de Galicia
```

---

### 🟨 CATALUÑA (6 endpoints)

```http
GET /api/cat
Respuesta: { total: 420, estaciones: [...] }
Descripción: Todas las estaciones de Barcelona, Girona, Lleida, Tarragona

GET /api/cat/provincia/:provincia
Ejemplo: /api/cat/provincia/Barcelona
Respuesta: { total: 280, provincia: "Barcelona", estaciones: [...] }
Descripción: Solo estaciones de la provincia catalana especificada

GET /api/cat/municipi/:municipi
Ejemplo: /api/cat/municipi/Sabadell
Respuesta: { total: 4, municipi: "Sabadell", estaciones: [...] }
Descripción: Estaciones de un municipi (municipio catalán)

GET /api/cat/operador/:operador
Ejemplo: /api/cat/operador/APPLUS
Respuesta: { total: 150, operador: "APPLUS", estaciones: [...] }
Descripción: Filtrar por operador privado (único en Cataluña)

GET /api/cat/nearby?lat=41.3874&lon=2.1686&radius=15
Respuesta: { total: 12, coordenadas: {...}, radio_km: 15, estaciones: [...] }
Descripción: Estaciones cercanas en Cataluña

GET /api/cat/stats
Respuesta: {
  total: 420,
  por_provincia: {
    "Barcelona": 280,
    "Girona": 45,
    "Lleida": 32,
    "Tarragona": 63
  },
  por_tipo: {
    "Estacion Fija": 420
  },
  por_operador: {
    "APPLUS+": 150,
    "SGS": 120,
    "ITEVELESA": 80,
    "OTROS": 70
  }
}
Descripción: Estadísticas con desglose por operador (único en CAT)
```

---

### 🔴 UTILIDADES

```http
DELETE /api/limpiar
Respuesta: { message: "Base de datos limpiada correctamente" }
Descripción: Limpia todas las tablas respetando foreign keys (estacion → localidad → provincia)
Uso: Útil antes de recargar datos desde cero
```

---

## 🔧 SCRIPTS NPM

```bash
# DESARROLLO
npm run dev                 # Inicia servidor con nodemon + auto-recarga datos

# CARGA DE DATOS (manual)
npm run carga               # Ejecuta los 3 extractores secuencialmente
npm run load:cv             # Solo Comunidad Valenciana
npm run load:gal            # Solo Galicia
npm run load:cat            # Solo Cataluña

# LIMPIEZA
npm run limpiar             # Limpia toda la BD (script directo)

# COMPILACIÓN
npm run build               # Compila TypeScript → JavaScript (dist/)
npm start                   # Ejecuta versión compilada (producción)
```

---

## 🧠 LÓGICA DE NEGOCIO CLAVE

### 1. **Evitar duplicados en BD**

```typescript
// utils/dbHelpers.ts
export const getOrCreateProvincia = async (nombre: string) => {
    // Buscar provincia existente
    let { data, error } = await supabase
        .from("provincia")
        .select("*")
        .eq("nombre", nombre)
        .single();

    // Si no existe, crear
    if (!data) {
        const { data: newProvincia } = await supabase
            .from("provincia")
            .insert({ nombre })
            .select()
            .single();
        data = newProvincia;
    }

    return data;
};
```

**Ventaja**: Reutiliza IDs existentes, evita duplicados en relaciones FK.

---

### 2. **Geocodificación con fallback**

```typescript
// utils/geocoding.ts
export const geocodificarDireccion = async (
    direccion: string,
    municipio: string,
    provincia: string
) => {
    // Intento 1: Dirección completa limpia
    const direccionLimpia = limpiarDireccion(direccion);
    let resultado = await buscarNominatim(direccionLimpia, municipio, provincia);

    // Intento 2: Solo municipio + provincia
    if (!resultado.lat || !resultado.lon) {
        resultado = await buscarNominatim("", municipio, provincia);
    }

    return resultado;
};

function limpiarDireccion(dir: string): string {
    return dir
        .replace(/s\/n/gi, "")           // Elimina "s/n" (sin número)
        .replace(/parcela\s+\d+/gi, "")  // Elimina "parcela 123"
        .replace(/km\s+\d+/gi, "")       // Elimina "km 45"
        .trim();
}
```

**Razón**: Direcciones muy específicas (con parcela/km) fallan en Nominatim, fallback garantiza coordenadas.

---

### 3. **Filtrado por comunidad autónoma**

```typescript
// wrappers/wrapperCV.ts (ejemplo)
export const getCVStations = async (req, res) => {
    // Paso 1: Obtener IDs de provincias CV
    const { data: provincias } = await supabase
        .from("provincia")
        .select("id")
        .in("nombre", ["Valencia", "Castellón", "Alicante"]);

    const provinciaIds = provincias?.map(p => p.id) || [];

    // Paso 2: Obtener IDs de localidades de esas provincias
    const { data: localidades } = await supabase
        .from("localidad")
        .select("id")
        .in("provinciaId", provinciaIds);

    const localidadIds = localidades?.map(l => l.id) || [];

    // Paso 3: Filtrar estaciones por esas localidades
    const { data } = await supabase
        .from("estacion")
        .select(`*, localidad(...), provincia(...)`)
        .in("localidadId", localidadIds);

    return res.json({ total: data?.length, estaciones: data });
};
```

**Problema resuelto**: Supabase no permite filtros `.eq("localidad.provincia.nombre", "Valencia")` en campos anidados.  
**Solución**: Filtrado en 3 pasos (provincia → localidad → estacion).

---

### 4. **Búsqueda por proximidad (Haversine)**

```typescript
function calculateDistance(lat1, lon1, lat2, lon2): number {
    const R = 6371; // Radio Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
}
```

**Uso**: Endpoint `/nearby` calcula distancia desde punto usuario a cada estación, filtra por radio, ordena por proximidad.

---

## ⚠️ PROBLEMAS RESUELTOS DURANTE DESARROLLO

### 1. **Extractores no ejecutándose al iniciar**
- **Problema**: Backend arrancaba pero no cargaba datos.
- **Solución**: IIFE async en `app.listen()` para ejecutar `loadCVData()`, `loadGALData()`, `loadCATData()`.

### 2. **Error "Cannot read toLowerCase of undefined" en extractorGAL**
- **Problema**: CSV con filas sin campos obligatorios.
- **Solución**: Validación `if (!nombreOriginal || !concello) continue;`

### 3. **Enum en BD mostraba "estacion_fija" en lugar de "Estacion Fija"**
- **Problema**: Enum PostgreSQL generado con snake_case.
- **Solución**: Migración SQL manual + regeneración tipos con `npx supabase gen types`.

### 4. **Geocoding devolvía 0,0 para muchas direcciones CV**
- **Problema**: Direcciones con "s/n", "parcela 45", "km 12" fallaban en Nominatim.
- **Solución**: Función `limpiarDireccion()` + fallback a solo municipio.

### 5. **CSV Galicia mostraba caracteres raros (ñ → �)**
- **Problema**: Encoding UTF-8 por defecto no lee caracteres gallegos.
- **Solución**: `fs.createReadStream(csvPath, { encoding: 'latin1' })`

### 6. **Coordenadas Galicia incorrectas (valores > 180)**
- **Problema**: CSV tenía coordenadas en formato grados/minutos/segundos.
- **Solución**: Función `parseGalicianCoordinates()` para conversión matemática.

### 7. **TypeScript error: string no asignable a enum literal**
- **Problema**: `req.params.tipo` es `string`, pero `.eq()` espera tipo literal.
- **Solución**: Casting `tipo as any` en wrappers.

### 8. **Endpoint CV/provincia devolvía todas las comunidades**
- **Problema**: Filtro `.eq("localidad.provincia.nombre", provincia)` no funciona en Supabase.
- **Solución**: Filtrado en 3 pasos (provincia ID → localidad IDs → estaciones).

---

## 📊 DATOS DEL PROYECTO

### Volumen estimado:
- **12 provincias**: 3 CV + 4 GAL + 4 CAT + 1 "Desconocido"
- **600+ localidades**: municipios únicos
- **1000+ estaciones ITV**: total agregado

### Distribución:
- **Comunidad Valenciana**: ~250 estaciones (con geocoding)
- **Galicia**: ~180 estaciones (coordenadas nativas)
- **Cataluña**: ~420 estaciones (mayor densidad)

---

## 🚀 FLUJO DE EJECUCIÓN COMPLETO

```
1. Usuario ejecuta: npm run dev

2. Servidor Express arranca:
   ├── Carga variables entorno (.env)
   ├── Configura middlewares (CORS, JSON)
   ├── Define 17 rutas GET/DELETE
   └── Escucha en puerto 4000

3. Al iniciar, ejecuta ETL automático:
   ├── loadCVData()
   │   ├── Lee data/estaciones.json
   │   ├── Para cada estación:
   │   │   ├── Crea/obtiene provincia
   │   │   ├── Crea/obtiene localidad
   │   │   ├── Geocodifica dirección (Nominatim)
   │   │   └── Inserta estacion con lat/lon
   │   └── ✅ 250 estaciones CV cargadas
   │
   ├── loadGALData()
   │   ├── Lee data/Estacions_ITV.csv (latin1)
   │   ├── Para cada fila:
   │   │   ├── Crea/obtiene provincia
   │   │   ├── Crea/obtiene localidad
   │   │   ├── Convierte coords grados→decimal
   │   │   └── Inserta estacion
   │   └── ✅ 180 estaciones GAL cargadas
   │
   └── loadCATData()
       ├── Lee data/ITV-CAT.xml
       ├── Para cada <estacio>:
       │   ├── Crea/obtiene provincia
       │   ├── Crea/obtiene localidad
       │   ├── Divide coords ÷1e6
       │   ├── Extrae operador de descripción
       │   └── Inserta estacion
       └── ✅ 420 estaciones CAT cargadas

4. API lista para recibir peticiones:
   GET /api/cv                     → wrapperCV.getCVStations()
   GET /api/cv/provincia/Valencia  → wrapperCV.getCVStationsByProvincia()
   GET /api/gal/stats              → wrapperGAL.getGALStats()
   ...

5. Cliente hace petición:
   GET http://localhost:4000/api/cv/nearby?lat=39.47&lon=-0.37&radius=10

6. Wrapper procesa:
   ├── Valida parámetros lat/lon
   ├── Consulta Supabase (todas estaciones con coords)
   ├── Calcula distancia Haversine a cada estación
   ├── Filtra por radio 10km
   ├── Ordena por distancia ascendente
   └── Devuelve JSON con estaciones + distancia_km

7. Respuesta cliente:
   {
     "total": 5,
     "coordenadas": { "lat": 39.47, "lon": -0.37 },
     "radio_km": 10,
     "estaciones": [
       {
         "nombre": "ITV Valencia Centro",
         "direccion": "Calle X, 10",
         "latitud": 39.4692,
         "longitud": -0.3763,
         "distancia_km": 0.85,
         "localidad": { "nombre": "Valencia", "provincia": { "nombre": "Valencia" } }
       },
       ...
     ]
   }
```

---

## 🔐 CONFIGURACIÓN NECESARIA

### `.env` (variables de entorno)

```env
SUPABASE_URL=https://zoyeihablxfaxdpgneqr.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=4000
```

### Supabase (configuración base de datos)

```sql
-- Crear enum tipo estación
CREATE TYPE tipo_estacion AS ENUM ('Estacion Fija', 'Estacion Movil', 'Otros');

-- Tabla provincia
CREATE TABLE provincia (
    id BIGSERIAL PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Tabla localidad
CREATE TABLE localidad (
    id BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    "provinciaId" BIGINT REFERENCES provincia(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Tabla estacion
CREATE TABLE estacion (
    id BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    direccion TEXT,
    "codigoPostal" TEXT,
    telefono TEXT,
    latitud DOUBLE PRECISION DEFAULT 0,
    longitud DOUBLE PRECISION DEFAULT 0,
    tipo tipo_estacion DEFAULT 'Estacion Fija',
    descripcion TEXT,
    "localidadId" BIGINT REFERENCES localidad(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Índices para optimizar búsquedas
CREATE INDEX idx_estacion_localidad ON estacion("localidadId");
CREATE INDEX idx_localidad_provincia ON localidad("provinciaId");
CREATE INDEX idx_estacion_tipo ON estacion(tipo);
```

---

## 🧪 CÓMO TESTEAR LA API

### 1. **Browser** (GET simple)
```
http://localhost:4000/api/cv
http://localhost:4000/api/gal/provincia/Pontevedra
http://localhost:4000/api/cat/stats
```

### 2. **PowerShell** (todas las operaciones)
```powershell
# GET todas CV
Invoke-RestMethod -Uri "http://localhost:4000/api/cv" -Method GET

# GET por provincia
Invoke-RestMethod -Uri "http://localhost:4000/api/cv/provincia/Valencia" -Method GET

# GET búsqueda cercanas
Invoke-RestMethod -Uri "http://localhost:4000/api/cv/nearby?lat=39.47&lon=-0.37&radius=20" -Method GET

# DELETE limpiar BD
Invoke-RestMethod -Uri "http://localhost:4000/api/limpiar" -Method DELETE
```

### 3. **cURL** (multiplataforma)
```bash
# GET estaciones Galicia
curl http://localhost:4000/api/gal

# GET por operador Cataluña
curl http://localhost:4000/api/cat/operador/APPLUS

# DELETE limpiar
curl -X DELETE http://localhost:4000/api/limpiar
```

---

## 📚 DEPENDENCIAS PRINCIPALES

```json
{
  "@supabase/supabase-js": "Cliente oficial Supabase",
  "express": "Framework servidor HTTP",
  "csv-parser": "Parseo CSV Galicia",
  "xml2js": "Parseo XML Cataluña",
  "node-fetch": "HTTP client para Nominatim",
  "dotenv": "Variables entorno",
  "cors": "CORS para frontend",
  "typescript": "Tipado estático",
  "ts-node": "Ejecución TypeScript directa",
  "nodemon": "Auto-reload desarrollo"
}
```

---

## 🎯 CARACTERÍSTICAS TÉCNICAS DESTACABLES

### ✅ **Type Safety completo**
- Tipos generados automáticamente desde Supabase: `npx supabase gen types`
- Interfaces TypeScript para todas las entidades
- IntelliSense en IDE para tipos BD

### ✅ **Arquitectura modular**
- Separación clara: extractors → DB → wrappers → API
- Cada comunidad autónoma tiene su propio módulo
- Reutilización código con `dbHelpers.ts`

### ✅ **Rate limiting inteligente**
- 1 petición/segundo a Nominatim (evita ban IP)
- Implementado con `setTimeout()` en geocoding

### ✅ **Manejo robusto de errores**
- Try-catch en todos los extractors
- Validación de campos obligatorios
- Respuestas HTTP coherentes (404, 500, 200)

### ✅ **Optimización queries BD**
- Índices en FK (localidadId, provinciaId)
- Filtrado en 3 pasos para evitar queries anidadas ineficientes
- Select específicos (no `SELECT *` innecesario)

### ✅ **Limpieza de datos**
- Normalización provincias (ñ, acentos)
- Limpieza direcciones para geocoding
- Validación coordenadas (rango -180/180)

---

## 🔮 POSIBLES MEJORAS FUTURAS

1. **Caching**: Redis para endpoints frecuentes (stats, listados completos)
2. **Paginación**: Limitar resultados grandes (>100 estaciones)
3. **Autenticación**: API keys para producción
4. **Más fuentes**: Andalucía, Madrid, País Vasco
5. **Frontend**: React app con mapa interactivo Leaflet
6. **WebSockets**: Notificaciones en tiempo real de nuevas estaciones
7. **Tests**: Jest + Supertest para endpoints
8. **Docker**: Containerización para despliegue

---

## 📞 PREGUNTAS FRECUENTES PARA LA PRESENTACIÓN

### **P: ¿Por qué usar Supabase en lugar de PostgreSQL local?**
**R**: Supabase ofrece:
- BD PostgreSQL gestionada en la nube (sin configurar servidor)
- Cliente JavaScript oficial con TypeScript
- Generación automática de tipos desde schema
- API REST autogenerada (aunque usamos custom)
- Panel web para visualizar datos

### **P: ¿Por qué tres extractors separados?**
**R**: Cada comunidad usa formato diferente:
- CV: JSON con estructura plana, requiere geocoding
- GAL: CSV con encoding latino, coordenadas en grados
- CAT: XML con coordenadas escaladas, operadores privados

Separar lógica facilita mantenimiento y permite ejecutarlos individualmente.

### **P: ¿Cómo se manejan las relaciones entre tablas?**
**R**: Cascade deletes automático:
```
DELETE provincia → DELETE localidad → DELETE estacion
```
Función `limpiarBaseDeDatos()` elimina en orden inverso para respetar FK.

### **P: ¿Por qué Haversine en lugar de PostGIS?**
**R**: 
- Haversine suficiente para búsquedas <100km (error <0.5%)
- No requiere extensión PostGIS en Supabase
- Implementación simple en TypeScript
- Mejora futura: migrar a PostGIS si escala

### **P: ¿Cómo se garantiza la calidad del geocoding?**
**R**:
- Limpieza direcciones (quitar "s/n", parcelas)
- Fallback a municipio si dirección completa falla
- Rate limiting para evitar ban
- Validación coordenadas en rango válido

### **P: ¿Qué pasa si hay duplicados en BD?**
**R**: `getOrCreateProvincia/Localidad` busca antes de insertar:
```typescript
const existente = await supabase.from("provincia").select().eq("nombre", X);
if (!existente) { /* insertar */ }
```
Evita duplicados en todas las cargas.

---

## ✅ CHECKLIST DEMO EN VIVO

1. ✅ `npm run dev` → mostrar logs carga datos
2. ✅ Browser: `http://localhost:4000/api/cv` → JSON completo
3. ✅ Browser: `http://localhost:4000/api/cv/provincia/Valencia` → filtrado
4. ✅ Browser: `http://localhost:4000/api/gal/stats` → estadísticas
5. ✅ Supabase dashboard → mostrar tablas con datos
6. ✅ PowerShell: `Invoke-RestMethod /api/cv/nearby?lat=39.47&lon=-0.37&radius=10`
7. ✅ Explicar código: `extractorCV.ts` (geocoding)
8. ✅ Explicar código: `wrapperGAL.ts` (filtrado 3 pasos)
9. ✅ Mostrar tipos: `types/supabase.ts` (autogenerado)
10. ✅ `npm run limpiar` → DELETE → reiniciar → recarga automática

---

## 📝 RESUMEN PARA RESPUESTA RÁPIDA

**¿Qué hace el proyecto?**
API REST que unifica datos ITV de 3 comunidades españolas (CV, GAL, CAT) desde 3 formatos diferentes (JSON, CSV, XML), geocodifica direcciones, y expone 17 endpoints con búsqueda por provincia, municipio, tipo y proximidad geográfica.

**Stack tecnológico:**
Node.js + Express + TypeScript + Supabase (PostgreSQL) + Nominatim API

**Valor diferencial:**
- Geocodificación automática con fallback inteligente
- Soporte multi-formato (JSON/CSV/XML)
- Búsqueda geolocalizada con Haversine
- Type safety completo con tipos autogenerados
- Arquitectura modular y escalable

**Líneas de código:** ~2500 líneas TypeScript

**Tiempo desarrollo:** ~3 semanas (diseño BD, ETL, API, debugging)

---

🎉 **¡Buena suerte en tu presentación!** 🎉
