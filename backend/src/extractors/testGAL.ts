import { loadGALData } from "./extractorGAL";

(async () => {
    try {
        await loadGALData();
        console.log("✅ Carga completada");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
})();
