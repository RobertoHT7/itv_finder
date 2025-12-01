import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

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
import { cargarTodosLosDatos } from "./api/carga";
import { obtenerEstadisticas } from "./api/estadisticas";
import { iniciarMenu } from "./api/menu";

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

// ==================== ENDPOINTS ADMINISTRACIÓN ====================
app.get("/api/estadisticas", async (req: Request, res: Response) => {
    try {
        const result = await obtenerEstadisticas();
        if (result.success) {
            res.json({ estadisticas: result.data });
        } else {
            res.status(500).json({ error: "Error al obtener estadísticas" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al obtener estadísticas" });
    }
});

app.post("/api/carga", async (req: Request, res: Response) => {
    try {
        const result = await cargarTodosLosDatos();
        if (result.success) {
            res.json({ message: "Datos cargados correctamente" });
        } else {
            res.status(500).json({ error: "Error al cargar datos" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al cargar datos" });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
    console.clear();
    console.log("==============================================");
    console.log("                 ITV FINDER");
    console.log("==============================================\n");
    console.log(`Servidor ejecutandose en el puerto ${PORT}`);
    console.log(`URL: http://localhost:${PORT}\n`);

    // Iniciar menú interactivo
    await iniciarMenu();
});