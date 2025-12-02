import { loadCVData } from "../extractors/extractorCV";
import { loadGALData } from "../extractors/extractorGAL";
import { loadCATData } from "../extractors/extractorCAT";

/**
 * Carga todos los datos de las estaciones ITV
 * desde todas las comunidades autónomas disponibles
 */
export async function cargarTodosLosDatos() {
    console.log("\nIniciando carga completa de datos ITV...");
    console.log("==========================================\n");

    try {
        console.log("Comunidad Valenciana...");
        await loadCVData();
       
        // console.log("\nGalicia...");
        // await loadGALData();

        // console.log("\nCataluna...");
        // await loadCATData();

        console.log("\nProceso ETL completo y datos cargados en Supabase\n");
        return { success: true };
    } catch (error) {
        console.error("\nError en la carga de datos:", error);
        return { success: false, error };
    }
}

export async function cargarCVData() {
    console.log("\nCargando datos de la Comunidad Valenciana...");
    console.log("==========================================\n");
    try {
        await loadCVData();
    } catch (error) {
        console.error("Error cargando datos de la Comunidad Valenciana:", error);
    }
}

export async function cargarGALData() {
    console.log("\nCargando datos de Galicia...");
    console.log("==========================================\n");
    try {
        await loadGALData();
    } catch (error) {
        console.error("Error cargando datos de Galicia:", error);
    }
}

export async function cargarCATData() {
    console.log("\nCargando datos de Cataluña...");
    console.log("==========================================\n");
    try {
        await loadCATData();
    } catch (error) {
        console.error("Error cargando datos de Cataluña:", error);
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
