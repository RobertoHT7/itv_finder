import { supabase } from "../db/supabaseClient";

/**
 * Obtiene estadísticas generales de la base de datos
 */
export async function obtenerEstadisticas() {
    console.log("\nEstadisticas de la Base de Datos");
    console.log("===================================\n");

    try {
        // Contar provincias
        const { count: totalProvincias, error: errorProvincias } = await supabase
            .from("provincia")
            .select("*", { count: "exact", head: true });

        // Contar localidades
        const { count: totalLocalidades, error: errorLocalidades } = await supabase
            .from("localidad")
            .select("*", { count: "exact", head: true });

        // Contar estaciones totales
        const { count: totalEstaciones, error: errorEstaciones } = await supabase
            .from("estacion")
            .select("*", { count: "exact", head: true });

        // Contar por tipo de estación
        const { count: estacionesFijas } = await supabase
            .from("estacion")
            .select("*", { count: "exact", head: true })
            .eq("tipo", "Estacion Fija");

        const { count: estacionesMoviles } = await supabase
            .from("estacion")
            .select("*", { count: "exact", head: true })
            .eq("tipo", "Estacion Movil");

        const { count: estacionesOtros } = await supabase
            .from("estacion")
            .select("*", { count: "exact", head: true })
            .eq("tipo", "Otros");

        if (errorProvincias || errorLocalidades || errorEstaciones) {
            console.error("Error obteniendo estadisticas");
            return {
                success: false,
                data: null
            };
        }

        const stats = {
            provincias: totalProvincias || 0,
            localidades: totalLocalidades || 0,
            estaciones: {
                total: totalEstaciones || 0,
                fijas: estacionesFijas || 0,
                moviles: estacionesMoviles || 0,
                otros: estacionesOtros || 0
            }
        };

        // Mostrar estadísticas
        console.log(`Provincias: ${stats.provincias}`);
        console.log(`Localidades: ${stats.localidades}`);
        console.log(`Estaciones ITV: ${stats.estaciones.total}`);
        console.log(`   - Fijas: ${stats.estaciones.fijas}`);
        console.log(`   - Moviles: ${stats.estaciones.moviles}`);
        console.log(`   - Otros: ${stats.estaciones.otros}`);
        console.log();

        return {
            success: true,
            data: stats
        };
    } catch (error) {
        console.error("Error obteniendo estadisticas:", error);
        return {
            success: false,
            data: null,
            error
        };
    }
}

/**
 * Verifica si la base de datos tiene datos
 */
export async function baseDeDatosVacia(): Promise<boolean> {
    try {
        const { count } = await supabase
            .from("estacion")
            .select("*", { count: "exact", head: true });

        return (count || 0) === 0;
    } catch (error) {
        console.error("Error verificando base de datos:", error);
        return true;
    }
}
