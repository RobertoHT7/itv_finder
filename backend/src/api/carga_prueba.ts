import { loadCVDataPrueba } from "../extractors/extractorCV_prueba";
import { loadGALDataPrueba } from "../extractors/extractorGAL_prueba";
import { loadCATDataPrueba } from "../extractors/extractorCAT_prueba";

(async () => {
    console.log("🧪 Iniciando carga de PRUEBA de datos ITV...");
    console.log("📂 Leyendo archivos desde data_prueba/");
    console.log("================================================\n");
    
    try {
        await loadCVDataPrueba();
        await loadGALDataPrueba();
        await loadCATDataPrueba();
        console.log("\n================================================");
        console.log("✅ Proceso ETL de PRUEBA completo y datos cargados en Supabase");
    } catch (error) {
        console.error("❌ Error en el proceso de carga de prueba:", error);
        process.exit(1);
    }
})();
