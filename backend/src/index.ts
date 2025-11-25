import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./api/test";
import { getCVStations } from "./wrappers/wrapperCV";
import { limpiarBaseDeDatos } from "./api/limpiar";
import { cargarTodosLosDatos } from "./api/carga";
import { obtenerEstadisticas } from "./api/estadisticas";
import { iniciarMenu } from "./api/menu";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


// ENDPOINTS DE LA API

app.get("/", (req: Request, res: Response) =>
    res.json({
        status: "API ITV Finder running",
        version: "1.0.0",
        endpoints: {
            estadisticas: "/api/estadisticas",
            cargar: "/api/carga",
            limpiar: "/api/limpiar",
            test: "/api/test"
        }
    })
);

// Endpoint para obtener estadísticas
app.get("/api/estadisticas", async (req: Request, res: Response) => {
    try {
        const result = await obtenerEstadisticas();
        if (result.success) {
            res.json({
                success: true,
                data: result.data
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Error al obtener estadísticas"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Error al obtener estadísticas"
        });
    }
});

// Endpoint para cargar datos
app.post("/api/carga", async (req: Request, res: Response) => {
    try {
        const result = await cargarTodosLosDatos();
        if (result.success) {
            res.json({
                success: true,
                message: "Datos cargados correctamente"
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Error al cargar datos"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Error al cargar datos"
        });
    }
});

// Endpoint para limpiar la base de datos
app.delete("/api/limpiar", async (req: Request, res: Response) => {
    try {
        const result = await limpiarBaseDeDatos();
        if (result.success) {
            res.json({
                success: true,
                message: "Base de datos limpiada correctamente"
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Error al limpiar base de datos"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Error al limpiar base de datos"
        });
    }
});

// Endpoint de prueba de conexión
app.get("/api/test", testConnection);

// Endpoint de Comunidad Valenciana (wrapper)
app.get("/api/cv", getCVStations);


// INICIO DEL SERVIDOR
const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
    console.clear();
    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║         ITV FINDER - Backend Server          ║");
    console.log("╚════════════════════════════════════════════════════╝\n");
    console.log(`✅ Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}\n`);

    // Iniciar el menú interactivo de administración
    await iniciarMenu();
});