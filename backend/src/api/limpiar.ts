import { supabase } from "../db/supabaseClient";
import { broadcastLog } from "./sseLogger";

/**
 * Elimina estaciones duplicadas de la base de datos
 * Se considera duplicado si tienen el mismo nombre y localidad_id
 */
export async function eliminarDuplicados() {
    console.log("🔍 Buscando estaciones duplicadas...");
    broadcastLog("🔍 Buscando estaciones duplicadas...", 'info');
    
    try {
        // Obtener todas las estaciones
        const { data: estaciones, error: errorQuery } = await supabase
            .from("estacion")
            .select("id, nombre, localidad_id, direccion, created_at");

        if (errorQuery) {
            console.error("❌ Error obteniendo estaciones:", errorQuery.message);
            return { success: false, error: errorQuery };
        }

        if (!estaciones || estaciones.length === 0) {
            console.log("ℹ️ No hay estaciones en la base de datos");
            return { success: true, duplicadosEliminados: 0 };
        }

        // Agrupar por nombre + localidad_id para detectar duplicados
        const grupos = new Map<string, typeof estaciones>();
        
        for (const estacion of estaciones) {
            const clave = `${estacion.nombre}_${estacion.localidad_id}`;
            if (!grupos.has(clave)) {
                grupos.set(clave, []);
            }
            grupos.get(clave)!.push(estacion);
        }

        // Identificar grupos duplicados (más de 1 estación con la misma clave)
        let totalDuplicados = 0;
        const idsAEliminar: number[] = [];

        for (const [clave, grupo] of grupos.entries()) {
            if (grupo.length > 1) {
                console.log(`\n⚠️ Encontrados ${grupo.length} duplicados para: ${grupo[0].nombre}`);
                broadcastLog(`⚠️ Encontrados ${grupo.length} duplicados para: ${grupo[0].nombre}`, 'warning');
                
                // Ordenar por fecha de creación y mantener el más antiguo
                grupo.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                
                // Marcar todos excepto el primero para eliminación
                for (let i = 1; i < grupo.length; i++) {
                    idsAEliminar.push(grupo[i].id);
                    totalDuplicados++;
                    console.log(`  ❌ Eliminando duplicado ID: ${grupo[i].id} (${grupo[i].direccion})`);
                }
                
                console.log(`  ✅ Manteniendo: ID ${grupo[0].id} (${grupo[0].direccion})`);
            }
        }

        if (idsAEliminar.length === 0) {
            console.log("\n✅ No se encontraron duplicados");
            broadcastLog("✅ No se encontraron duplicados", 'success');
            return { success: true, duplicadosEliminados: 0 };
        }

        // Eliminar los duplicados
        console.log(`\n🗑️ Eliminando ${idsAEliminar.length} estaciones duplicadas...`);
        broadcastLog(`🗑️ Eliminando ${idsAEliminar.length} estaciones duplicadas...`, 'info');
        
        const { error: errorDelete } = await supabase
            .from("estacion")
            .delete()
            .in("id", idsAEliminar);

        if (errorDelete) {
            console.error("❌ Error eliminando duplicados:", errorDelete.message);
            broadcastLog("❌ Error eliminando duplicados", 'error');
            return { success: false, error: errorDelete };
        }

        console.log(`\n🎉 Se eliminaron ${totalDuplicados} estaciones duplicadas`);
        broadcastLog(`🎉 Se eliminaron ${totalDuplicados} estaciones duplicadas`, 'success');
        
        return { success: true, duplicadosEliminados: totalDuplicados };

    } catch (error) {
        console.error("❌ Error general eliminando duplicados:", error);
        broadcastLog("❌ Error general eliminando duplicados", 'error');
        return { success: false, error };
    }
}

/**
 * Limpia todas las tablas de la base de datos en el orden correcto
 * para respetar las foreign keys
 */
export async function limpiarBaseDeDatos() {
    console.log("🗑️  Iniciando limpieza de base de datos...");
    
    try {
        // 1. Primero eliminar estaciones (tiene FK a localidad)
        const { error: errorEstaciones } = await supabase
            .from("estacion")
            .delete()
            .neq("id", 0); // Truco para eliminar todos sin WHERE

        if (errorEstaciones) {
            console.error("❌ Error eliminando estaciones:", errorEstaciones.message);
        } else {
            console.log("✅ Estaciones eliminadas");
        }

        // 2. Luego eliminar localidades (tiene FK a provincia)
        const { error: errorLocalidades } = await supabase
            .from("localidad")
            .delete()
            .neq("id", 0);

        if (errorLocalidades) {
            console.error("❌ Error eliminando localidades:", errorLocalidades.message);
        } else {
            console.log("✅ Localidades eliminadas");
        }

        // 3. Finalmente eliminar provincias
        const { error: errorProvincias } = await supabase
            .from("provincia")
            .delete()
            .neq("id", 0);

        if (errorProvincias) {
            console.error("❌ Error eliminando provincias:", errorProvincias.message);
        } else {
            console.log("✅ Provincias eliminadas");
        }

        console.log("🎉 Base de datos limpiada correctamente");
        return { success: true };
    } catch (error) {
        console.error("❌ Error general en limpieza:", error);
        return { success: false, error };
    }
}

// Si se ejecuta directamente
if (require.main === module) {
    limpiarBaseDeDatos()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
