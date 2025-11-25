import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import { testConnection } from "./api/test";
import { cvWrapper } from "./wrappers/wrapperCV";
import { galWrapper } from "./wrappers/wrapperGAL";
import { catWrapper } from "./wrappers/wrapperCAT";
//import { globalWrapper } from "./wrappers/globalWrapper";

import { limpiarBaseDeDatos } from "./api/limpiar";
import { cargarTodosLosDatos } from "./api/carga";
import { obtenerEstadisticas } from "./api/estadisticas";
import { iniciarMenu } from "./api/menu";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ROOT */
app.get("/", (req: Request, res: Response) =>
    res.json({
        status: "API ITV Finder running",
        version: "1.0.0",
        endpoints: {
            cv: "/api/cv",
            gal: "/api/gal",
            cat: "/api/cat",
            global: "/api/stations",
            estadisticas: "/api/estadisticas",
            cargar: "/api/carga",
            limpiar: "/api/limpiar",
            test: "/api/test",
        },
    })
);

/* ESTADÍSTICAS */
app.get("/api/estadisticas", async (req, res) => {
    const result = await obtenerEstadisticas();
    res.json(result);
});

/* CARGA Y LIMPIEZA */
app.post("/api/carga", async (req, res) => {
    const result = await cargarTodosLosDatos();
    res.json(result);
});

app.delete("/api/limpiar", async (req, res) => {
    const result = await limpiarBaseDeDatos();
    res.json(result);
});

/* TEST */
app.get("/api/test", testConnection);

/* WRAPPERS */
app.get("/api/cv", (req, res) => cvWrapper.getStations(req, res));
app.get("/api/gal", (req, res) => galWrapper.getStations(req, res));
app.get("/api/cat", (req, res) => catWrapper.getStations(req, res));
//app.get("/api/stations", (req, res) => globalWrapper.getAll(req, res));

/* SERVER */
const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
    console.clear();
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║           ITV FINDER - Backend API           ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(`Servidor activo → http://localhost:${PORT}\n`);

    await iniciarMenu();
});
