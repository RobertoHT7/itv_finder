import { loadCVData } from "../extractors/extractorCV";
import { loadGALData } from "../extractors/extractorGAL";
import { loadCATData } from "../extractors/extractorCAT";

/**
 * Carga todos los datos de las estaciones ITV
 * desde todas las comunidades autónomas disponibles
 */
export async function cargarTodosLosDatos() {
    console.log("\n🚀 Iniciando carga completa de datos ITV...");
    console.log("═══════════════════════════════════════════\n");

    try {
        console.log("📍 Comunidad Valenciana...");
        await loadCVData();

        console.log("\n📍 Galicia...");
        await loadGALData();

        console.log("\n📍 Cataluña...");
        await loadCATData();

        console.log("\n✅ Proceso ETL completo y datos cargados en Supabase\n");
        return { success: true };
    } catch (error) {
        console.error("\n❌ Error en la carga de datos:", error);
        return { success: false, error };
    }
}

// Si se ejecuta directamente desde la línea de comandos
if (require.main === module) {
    cargarTodosLosDatos()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
