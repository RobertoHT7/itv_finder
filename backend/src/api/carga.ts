import { Request, Response } from "express";
import { loadCVData } from "../extractors/extractorCV";
import { loadGALData } from "../extractors/extractorGAL";
import { loadCATData } from "../extractors/extractorCAT";
import { supabase } from "../db/supabaseClient";

/**
 * POST /api/carga/all
 * Carga todos los datos de las estaciones ITV desde todas las comunidades
 * Query params opcionales: source=data|data_prueba (por defecto: data)
 */
export const cargarTodosLosDatos = async (req: Request, res: Response) => {
    try {
        const source = (req.query.source as string) || "data";

        if (source !== "data" && source !== "data_prueba") {
            return res.status(400).json({
                error: "Parámetro 'source' inválido. Valores permitidos: 'data' o 'data_prueba'"
            });
        }

        console.log(`\n🔄 Iniciando carga completa desde: ${source}`);
        console.log("==========================================\n");

        await loadCVData(source);
        await loadGALData(source);
        await loadCATData(source);

        console.log("\n✅ Proceso ETL completo\n");

        return res.status(201).json({
            success: true,
            message: "Carga completa exitosa",
            source: source
        });

    } catch (error) {
        console.error("❌ Error en carga completa:", error);
        return res.status(500).json({
            success: false,
            error: "Error interno al cargar datos"
        });
    }
};

/**
 * POST /api/carga/cv
 * Carga datos de la Comunidad Valenciana
 * Query params opcionales: source=data|data_prueba
 */
export const cargarCVData = async (req: Request, res: Response) => {
    try {
        const source = (req.query.source as string) || "data";

        if (source !== "data" && source !== "data_prueba") {
            return res.status(400).json({
                error: "Parámetro 'source' inválido. Valores permitidos: 'data' o 'data_prueba'"
            });
        }

        console.log(`\n🔄 Cargando Comunidad Valenciana desde: ${source}\n`);
        await loadCVData(source);
        console.log("✅ Carga CV completada\n");

        return res.status(201).json({
            success: true,
            message: "Datos de Comunidad Valenciana cargados exitosamente",
            source: source
        });

    } catch (error) {
        console.error("❌ Error cargando CV:", error);
        return res.status(500).json({
            success: false,
            error: "Error al cargar datos de Comunidad Valenciana"
        });
    }
};

/**
 * POST /api/carga/gal
 * Carga datos de Galicia
 * Query params opcionales: source=data|data_prueba
 */
export const cargarGALData = async (req: Request, res: Response) => {
    try {
        const source = (req.query.source as string) || "data";

        if (source !== "data" && source !== "data_prueba") {
            return res.status(400).json({
                error: "Parámetro 'source' inválido. Valores permitidos: 'data' o 'data_prueba'"
            });
        }

        console.log(`\n🔄 Cargando Galicia desde: ${source}\n`);
        await loadGALData(source);
        console.log("✅ Carga GAL completada\n");

        return res.status(201).json({
            success: true,
            message: "Datos de Galicia cargados exitosamente",
            source: source
        });

    } catch (error) {
        console.error("❌ Error cargando GAL:", error);
        return res.status(500).json({
            success: false,
            error: "Error al cargar datos de Galicia"
        });
    }
};

/**
 * POST /api/carga/cat
 * Carga datos de Cataluña
 * Query params opcionales: source=data|data_prueba
 */
export const cargarCATData = async (req: Request, res: Response) => {
    try {
        const source = (req.query.source as string) || "data";

        if (source !== "data" && source !== "data_prueba") {
            return res.status(400).json({
                error: "Parámetro 'source' inválido. Valores permitidos: 'data' o 'data_prueba'"
            });
        }

        console.log(`\n🔄 Cargando Cataluña desde: ${source}\n`);
        await loadCATData(source);
        console.log("✅ Carga CAT completada\n");

        return res.status(201).json({
            success: true,
            message: "Datos de Cataluña cargados exitosamente",
            source: source
        });

    } catch (error) {
        console.error("❌ Error cargando CAT:", error);
        return res.status(500).json({
            success: false,
            error: "Error al cargar datos de Cataluña"
        });
    }
};

/**
 * GET /api/carga/estadisticas
 * Devuelve estadísticas de cuántas estaciones hay cargadas por comunidad
 */
export const obtenerEstadisticasCarga = async (req: Request, res: Response) => {
    try {
        // Obtener todas las provincias con sus estaciones
        const { data: provincias, error } = await supabase
            .from("provincia")
            .select(`
                id,
                nombre,
                localidad (
                    id,
                    estacion (id)
                )
            `);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Agrupar por comunidad autónoma
        const stats = {
            comunidad_valenciana: 0,
            galicia: 0,
            cataluna: 0,
            total: 0
        };

        provincias?.forEach((prov: any) => {
            const numEstaciones = prov.localidad?.reduce(
                (acc: number, loc: any) => acc + (loc.estacion?.length || 0),
                0
            ) || 0;

            // Clasificar por comunidad
            if (["Valencia", "Castellón", "Alicante"].includes(prov.nombre)) {
                stats.comunidad_valenciana += numEstaciones;
            } else if (["A Coruña", "Lugo", "Ourense", "Pontevedra"].includes(prov.nombre)) {
                stats.galicia += numEstaciones;
            } else if (["Barcelona", "Girona", "Lleida", "Tarragona"].includes(prov.nombre)) {
                stats.cataluna += numEstaciones;
            }

            stats.total += numEstaciones;
        });

        return res.status(200).json({
            estadisticas: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error obteniendo estadísticas:", error);
        return res.status(500).json({
            error: "Error al obtener estadísticas"
        });
    }
};
