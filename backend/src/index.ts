import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./api/test";
import { getCVStations } from "./wrappers/wrapperCV";
import { loadCVData } from "./extractors/extractorCV";
import { loadGALData } from "./extractors/extractorGAL";
import { loadCATData } from "./extractors/extractorCAT";
import { limpiarBaseDeDatos } from "./api/limpiar";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => res.json({ status: "API ITV Finder running" }));

// Endpoint para limpiar la base de datos
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