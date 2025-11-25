# Guía de Uso de Tipos de Supabase

## Introducción

Este proyecto utiliza tipos generados automáticamente por Supabase para garantizar la seguridad de tipos al interactuar con la base de datos. Esto previene errores en tiempo de ejecución y mejora la experiencia de desarrollo con autocompletado.

## Tipos Principales

### 1. Database
El tipo principal que describe toda la estructura de la base de datos.

```typescript
import { Database } from "../types/supabase";
```

### 2. Tables
Tipo para acceder a las filas de una tabla específica.

```typescript
import { Tables } from "../types/supabase";

type Estacion = Tables<"estacion">;
type Provincia = Tables<"provincia">;
type Localidad = Tables<"localidad">;
```

### 3. TablesInsert
Tipo para insertar datos en una tabla (algunos campos pueden ser opcionales como IDs autogenerados).

```typescript
import { TablesInsert } from "../types/supabase";

const nuevaEstacion: TablesInsert<"estacion"> = {
    nombre: "ITV Madrid Centro",
    tipo: "estacion_fija",
    direccion: "Calle Mayor 1",
    // ... otros campos requeridos
};
```

### 4. TablesUpdate
Tipo para actualizar datos en una tabla (todos los campos son opcionales).

```typescript
import { TablesUpdate } from "../types/supabase";

const actualizacion: TablesUpdate<"estacion"> = {
    horario: "De lunes a viernes de 8h a 20h"
};
```

### 5. Enums
Tipo para los enumerados definidos en la base de datos.

```typescript
import { Enums } from "../types/supabase";

type TipoEstacion = Enums<"TipoEstacion">; // "estacion_fija" | "estacion_movil" | "otros"
```

## Cliente de Supabase Tipado

El cliente de Supabase se configura con los tipos generados:

```typescript
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
```

Esto proporciona autocompletado y verificación de tipos en todas las operaciones:

```typescript
// ✅ Correcto - TypeScript verifica que los campos existan y sean del tipo correcto
const { data, error } = await supabase
    .from("estacion")
    .select("nombre, direccion, localidadId")
    .eq("tipo", "estacion_fija");

// ❌ Error - TypeScript detectará que "nombre_invalido" no existe
const { data, error } = await supabase
    .from("estacion")
    .select("nombre_invalido");
```

## Helpers de Tipos Personalizados

Se han creado tipos y funciones auxiliares en `src/types/estacion.types.ts`:

### EstacionInsert
Alias conveniente para el tipo de inserción de estaciones.

```typescript
import { EstacionInsert } from "../types/estacion.types";

const estacion: EstacionInsert = {
    // TypeScript te ayudará con el autocompletado
};
```

### validarDatosEstacion()
Función que valida los datos antes de insertarlos en la base de datos.

```typescript
import { validarDatosEstacion } from "../types/estacion.types";

const errores = validarDatosEstacion(estacionData);
if (errores.length > 0) {
    console.error("Datos inválidos:", errores);
    return;
}
```

### normalizarTipoEstacion()
Función que normaliza diferentes formatos de tipo de estación al enum correcto.

```typescript
import { normalizarTipoEstacion } from "../types/estacion.types";

const tipo = normalizarTipoEstacion("Estación Fija"); // "estacion_fija"
const tipo2 = normalizarTipoEstacion("movil");        // "estacion_movil"
```

## Regenerar Tipos

Si cambias el esquema de la base de datos en Supabase, regenera los tipos:

```bash
# Instalar el CLI de Supabase (si no lo tienes)
npm install -g supabase

# Iniciar sesión
supabase login

# Generar tipos
supabase gen types typescript --project-id <tu-project-id> > types/supabase.ts
```

O desde el dashboard de Supabase:
1. Ve a Settings > API
2. Busca la sección "Type Generation"
3. Copia el comando específico para tu proyecto

## Mejores Prácticas

1. **Siempre usa los tipos generados** en lugar de `any` o tipos manuales.

2. **Valida los datos** antes de insertarlos usando `validarDatosEstacion()`.

3. **Usa los enums** en lugar de strings literales:
   ```typescript
   // ✅ Correcto
   tipo: "estacion_fija" as TipoEstacion
   
   // ❌ Evitar
   tipo: "estacion_fija" as any
   ```

4. **Maneja errores** de forma apropiada:
   ```typescript
   const { data, error } = await supabase.from("estacion").insert(estacionData);
   if (error) {
       console.error("Error insertando estación:", error.message);
       return null;
   }
   ```

5. **Aprovecha el autocompletado** de tu IDE - los tipos te mostrarán todos los campos disponibles.

## Estructura de la Base de Datos

### Tabla: provincia
- `id`: number (autogenerado)
- `nombre`: string

### Tabla: localidad
- `id`: number (autogenerado)
- `nombre`: string
- `provinciaId`: number (FK a provincia)

### Tabla: estacion
- `id`: number (autogenerado)
- `nombre`: string
- `tipo`: TipoEstacion enum
- `tipo_estacion`: TipoEstacion enum (nullable)
- `direccion`: string
- `codigo_postal`: string
- `latitud`: number
- `longitud`: number
- `descripcion`: string
- `horario`: string
- `contacto`: string
- `url`: string
- `localidadId`: number (FK a localidad)

### Enum: TipoEstacion
- `estacion_fija`
- `estacion_movil`
- `otros`

## Ejemplo Completo

```typescript
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { 
    EstacionInsert, 
    validarDatosEstacion, 
    normalizarTipoEstacion 
} from "../types/estacion.types";

async function insertarEstacion() {
    // 1. Obtener o crear provincia y localidad
    const provinciaId = await getOrCreateProvincia("Madrid");
    if (!provinciaId) return;

    const localidadId = await getOrCreateLocalidad("Madrid", provinciaId);
    if (!localidadId) return;

    // 2. Crear datos de la estación con tipos seguros
    const estacionData: EstacionInsert = {
        nombre: "ITV Madrid Centro",
        tipo: normalizarTipoEstacion("Estación Fija"),
        tipo_estacion: normalizarTipoEstacion("Estación Fija"),
        direccion: "Calle Mayor 1",
        codigo_postal: "28001",
        latitud: 40.4168,
        longitud: -3.7038,
        descripcion: "Estación ITV en el centro de Madrid",
        horario: "Lunes a Viernes 8:00-20:00",
        contacto: "info@itvmadrid.com",
        url: "https://itvmadrid.com",
        localidadId,
    };

    // 3. Validar datos
    const errores = validarDatosEstacion(estacionData);
    if (errores.length > 0) {
        console.error("Datos inválidos:", errores);
        return;
    }

    // 4. Insertar en la base de datos
    const { data, error } = await supabase
        .from("estacion")
        .insert(estacionData)
        .select()
        .single();

    if (error) {
        console.error("Error insertando estación:", error.message);
        return;
    }

    console.log("✅ Estación insertada:", data);
}
```
