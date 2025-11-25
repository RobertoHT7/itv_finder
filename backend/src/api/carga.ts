import { loadCVData } from "../extractors/extractorCV";
import { loadGALData } from "../extractors/extractorGAL";
import { loadCATData } from "../extractors/extractorCAT";

(async () => {
    console.log("🚀 Iniciando carga completa de datos ITV...");
    await loadCVData();
    await loadGALData();
    await loadCATData();
    console.log("✅ Proceso ETL completo y datos cargados en Supabase");
})();
