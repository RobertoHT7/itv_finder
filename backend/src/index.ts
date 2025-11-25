import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./api/test";
import { 
    getCVStations, 
    getCVStationsByProvincia, 
    getCVStationsByMunicipio, 
    getCVStationsByTipo,
    getCVStationsNearby 
} from "./wrappers/wrapperCV";
import { 
    getGALStations, 
    getGALStationsByProvincia, 
    getGALStationsByConcello, 
    getGALStationsByTipo,
    getGALStationsNearby,
    getGALStats 
} from "./wrappers/wrapperGAL";
import { 
    getCATStations, 
    getCATStationsByProvincia, 
    getCATStationsByMunicipi, 
    getCATStationsByOperador,
    getCATStationsNearby,
    getCATStats 
} from "./wrappers/wrapperCAT";
import { loadCVData } from "./extractors/extractorCV";
import { loadGALData } from "./extractors/extractorGAL";
import { loadCATData } from "./extractors/extractorCAT";
import { limpiarBaseDeDatos } from "./api/limpiar";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => res.json({ status: "API ITV Finder running" }));

// ==================== ENDPOINTS COMUNIDAD VALENCIANA ====================
app.get("/api/cv", getCVStations);
app.get("/api/cv/provincia/:provincia", getCVStationsByProvincia);
app.get("/api/cv/municipio/:municipio", getCVStationsByMunicipio);
app.get("/api/cv/tipo/:tipo", getCVStationsByTipo);
app.get("/api/cv/nearby", getCVStationsNearby);

// ==================== ENDPOINTS GALICIA ====================
app.get("/api/gal", getGALStations);
app.get("/api/gal/provincia/:provincia", getGALStationsByProvincia);
app.get("/api/gal/concello/:concello", getGALStationsByConcello);
app.get("/api/gal/tipo/:tipo", getGALStationsByTipo);
app.get("/api/gal/nearby", getGALStationsNearby);
app.get("/api/gal/stats", getGALStats);

// ==================== ENDPOINTS CATALUÑA ====================
app.get("/api/cat", getCATStations);
app.get("/api/cat/provincia/:provincia", getCATStationsByProvincia);
app.get("/api/cat/municipi/:municipi", getCATStationsByMunicipi);
app.get("/api/cat/operador/:operador", getCATStationsByOperador);
app.get("/api/cat/nearby", getCATStationsNearby);
app.get("/api/cat/stats", getCATStats);

// ==================== ENDPOINT LIMPIAR BD ====================
app.delete("/api/limpiar", async (req: Request, res: Response) => {
    try {
        const result = await limpiarBaseDeDatos();
        if (result.success) {
            res.json({ message: "Base de datos limpiada correctamente" });
        } else {
            res.status(500).json({ error: "Error al limpiar base de datos" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al limpiar base de datos" });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    console.log("\n📋 Endpoints disponibles:");
    console.log("   - GET  /api/cv                        (Todas CV)");
    console.log("   - GET  /api/cv/provincia/:provincia   (CV por provincia)");
    console.log("   - GET  /api/cv/municipio/:municipio   (CV por municipio)");
    console.log("   - GET  /api/cv/tipo/:tipo             (CV por tipo)");
    console.log("   - GET  /api/cv/nearby?lat=X&lon=Y     (CV cercanas)");
    console.log("   - GET  /api/gal                       (Todas GAL)");
    console.log("   - GET  /api/gal/provincia/:provincia  (GAL por provincia)");
    console.log("   - GET  /api/gal/concello/:concello    (GAL por concello)");
    console.log("   - GET  /api/gal/tipo/:tipo            (GAL por tipo)");
    console.log("   - GET  /api/gal/nearby?lat=X&lon=Y    (GAL cercanas)");
    console.log("   - GET  /api/gal/stats                 (Estadísticas GAL)");
    console.log("   - GET  /api/cat                       (Todas CAT)");
    console.log("   - GET  /api/cat/provincia/:provincia  (CAT por provincia)");
    console.log("   - GET  /api/cat/municipi/:municipi    (CAT por municipi)");
    console.log("   - GET  /api/cat/operador/:operador    (CAT por operador)");
    console.log("   - GET  /api/cat/nearby?lat=X&lon=Y    (CAT cercanas)");
    console.log("   - GET  /api/cat/stats                 (Estadísticas CAT)");
    console.log("   - DEL  /api/limpiar                   (Limpiar BD)\n");
    
    // Ejecutar carga de datos al iniciar
    (async () => {
        try {
            console.log("🚀 Iniciando carga completa de datos ITV...");
            await loadCVData();
            await loadGALData();
            await loadCATData();
            console.log("✅ Proceso ETL completo y datos cargados en Supabase");
        } catch (error) {
            console.error("❌ Error en la carga de datos:", error);
        }
    })();
});

app.get("/api/cv", getCVStations);