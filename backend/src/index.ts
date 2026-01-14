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

// Wrappers (Capa de Extracción - Solo lectura de archivos)
import { getDatosCV } from "./wrappers/wrapperCV";
import { getDatosGAL } from "./wrappers/wrapperGAL";
import { getDatosCAT } from "./wrappers/wrapperCAT";

// Utilidades
import { limpiarBaseDeDatos, eliminarDuplicados } from "./api/limpiar";
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
        carga: "POST /api/carga/* (all|cv|gal|cat)",
        logs: "GET /api/carga/logs (SSE)",
        wrappers: "GET /api/wrapper/* (cv|gal|cat) - Capa de Extracción ETL",
        admin: "DELETE /api/limpiar, DELETE /api/duplicados, GET /api/estadisticas"
    },
    arquitectura: "ETL por capas: Fuente → Wrapper → JSON → Extractor → BD"
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

// ==================== WRAPPERS (CAPA DE EXTRACCIÓN ETL) ====================
// Los wrappers solo leen archivos fuente (CSV, XML, JSON) y devuelven JSON limpio
// No realizan validación ni acceden a la BD - Solo parsing y lectura
app.get("/api/wrapper/cv", async (req: Request, res: Response) => {
    try {
        const source = (req.query.source as string) || "data/entrega2";
        const datos = await getDatosCV(source);
        res.status(200).json(datos);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos de CV" });
    }
});

app.get("/api/wrapper/gal", async (req: Request, res: Response) => {
    try {
        const source = (req.query.source as string) || "data/entrega2";
        const datos = await getDatosGAL(source);
        res.status(200).json(datos);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos de GAL" });
    }
});

app.get("/api/wrapper/cat", async (req: Request, res: Response) => {
    try {
        const source = (req.query.source as string) || "data/entrega2";
        const datos = await getDatosCAT(source);
        res.status(200).json(datos);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos de CAT" });
    }
});

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

app.delete("/api/duplicados", async (req: Request, res: Response) => {
    try {
        const result = await eliminarDuplicados();
        if (result.success) {
            res.status(200).json({
                message: "Duplicados eliminados correctamente",
                duplicadosEliminados: result.duplicadosEliminados
            });
        } else {
            res.status(500).json({ error: "Error al eliminar duplicados" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar duplicados" });
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