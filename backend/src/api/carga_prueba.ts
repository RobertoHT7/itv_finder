import { loadCVDataPrueba } from "../extractors/extractorCV_prueba";
import { loadGALDataPrueba } from "../extractors/extractorGAL_prueba";
import { loadCATDataPrueba } from "../extractors/extractorCAT_prueba";

export async function cargarTodosLosDatosPrueba() {
    console.log("\nIniciando carga completa de datos ITV...");
    console.log("==========================================\n");

    try {
        console.log("Comunidad Valenciana...");
        await loadCVDataPrueba();

        console.log("\nGalicia...");
        await loadGALDataPrueba();

        console.log("\nCataluna...");
        await loadCATDataPrueba();

        console.log("\nProceso ETL completo y datos cargados en Supabase\n");
        return { success: true };
    } catch (error) {
        console.error("\nError en la carga de datos:", error);
        return { success: false, error };
    }
}

export async function cargarCVDataPrueba() {
    console.log("\nCargando datos de la Comunidad Valenciana...");
    console.log("==========================================\n");
    try {
        await loadCVDataPrueba();
    } catch (error) {
        console.error("Error cargando datos de la Comunidad Valenciana:", error);
    }
}

export async function cargarGALDataPrueba() {
    console.log("\nCargando datos de Galicia...");
    console.log("==========================================\n");
    try {
        await loadGALDataPrueba();
    } catch (error) {
        console.error("Error cargando datos de Galicia:", error);
    }
}

export async function cargarCATDataPrueba() {
    console.log("\nCargando datos de Cataluña...");
    console.log("==========================================\n");
    try {
        await loadCATDataPrueba();
    } catch (error) {
        console.error("Error cargando datos de Cataluña:", error);
    }
}
