import { supabase } from "../db/supabaseClient";

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
