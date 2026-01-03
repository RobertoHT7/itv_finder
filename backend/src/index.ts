import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

// API de Búsqueda Unificada
import { buscarEstaciones } from "./api/busqueda";

// API de Carga (ETL)
import {
    cargarTodosLosDatos,
    cargarCVData,
    cargarGALData,
    cargarCATData,
    obtenerEstadisticasCarga,
    streamLogs
} from "./api/carga";

// Wrappers (Simulación de Fuentes Originales)
import { getWrapperCV } from "./wrappers/wrapperCV";
import { getWrapperGAL } from "./wrappers/wrapperGAL";
import { getWrapperCAT } from "./wrappers/wrapperCAT";

// Utilidades
import { limpiarBaseDeDatos } from "./api/limpiar";
import { obtenerEstadisticas } from "./api/estadisticas";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => res.json({
    status: "API ITV Finder running",
    version: "2.0",
    endpoints: {
        busqueda: "GET /api/estaciones",
        carga: "POST /api/carga/*",
        logs: "GET /api/carga/logs (SSE)",
        wrappers: "GET /api/wrapper/*",
        admin: "DELETE /api/limpiar, GET /api/estadisticas"
    }
}));

// ==================== API DE BÚSQUEDA UNIFICADA ====================
app.get("/api/estaciones", buscarEstaciones);

// ==================== API DE CARGA (ETL) ====================
app.post("/api/carga/all", cargarTodosLosDatos);
app.post("/api/carga/cv", cargarCVData);
app.post("/api/carga/gal", cargarGALData);
app.post("/api/carga/cat", cargarCATData);
app.get("/api/carga/estadisticas", obtenerEstadisticasCarga);
app.get("/api/carga/logs", streamLogs); // SSE para logs en tiempo real

// ==================== WRAPPERS (SIMULACIÓN DE FUENTES ORIGINALES) ====================
app.get("/api/wrapper/cv", getWrapperCV);
app.get("/api/wrapper/gal", getWrapperGAL);
app.get("/api/wrapper/cat", getWrapperCAT);

// ==================== ADMINISTRACIÓN ====================
app.delete("/api/limpiar", async (req: Request, res: Response) => {
    try {
        const result = await limpiarBaseDeDatos();
        if (result.success) {
            res.status(200).json({ message: "Base de datos limpiada correctamente" });
        } else {
            res.status(500).json({ error: "Error al limpiar base de datos" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al limpiar base de datos" });
    }
});

app.get("/api/estadisticas", async (req: Request, res: Response) => {
    try {
        const result = await obtenerEstadisticas();
        if (result.success) {
            res.status(200).json({ estadisticas: result.data });
        } else {
            res.status(500).json({ error: "Error al obtener estadísticas" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al obtener estadísticas" });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
    console.clear();
    console.log("==============================================");
    console.log("                 ITV FINDER");
    console.log("==============================================\n");
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`URL: http://localhost:${PORT}\n`);
    console.log("API Rest lista para recibir peticiones ✅\n");
});