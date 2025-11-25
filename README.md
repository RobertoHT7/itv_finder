# itv_finder
Buscador de estaciones ITV – Proyecto prácticas IEI

## 🚀 Características

- **Backend TypeScript** con tipos generados automáticamente desde Supabase
- **ETL de datos** de estaciones ITV de múltiples comunidades autónomas:
  - Cataluña (XML)
  - Comunidad Valenciana (JSON)
  - Galicia (CSV)
- **Validación de datos** antes de inserción en base de datos
- **Type-safety** completo con TypeScript

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── api/          # Endpoints y scripts de API
│   ├── db/           # Cliente de Supabase
│   ├── extractors/   # Extractores de datos por comunidad
│   ├── types/        # Tipos personalizados
│   └── utils/        # Utilidades y helpers
├── types/
│   └── supabase.ts   # Tipos generados desde Supabase
└── data/             # Archivos de datos fuente
```

## 🛠️ Configuración

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `backend`:

```env
SUPABASE_URL=tu_supabase_url
SUPABASE_KEY=tu_supabase_key
```

### 3. Cargar datos

```bash
npm run carga
```

## 📚 Tipos de Supabase

Este proyecto utiliza tipos generados automáticamente desde la base de datos Supabase. Para más información, consulta [TIPOS_SUPABASE.md](backend/TIPOS_SUPABASE.md).

## 🧪 Pruebas

### Probar conexión y tipos

```bash
npm run test:types
```

### Ejecutar ETL completo

```bash
npm run carga
```

## 📊 Estructura de la Base de Datos

- **provincia**: Provincias de España
- **localidad**: Localidades asociadas a provincias
- **estacion**: Estaciones ITV con información detallada

Cada tabla está completamente tipada con TypeScript para prevenir errores en tiempo de compilación.
