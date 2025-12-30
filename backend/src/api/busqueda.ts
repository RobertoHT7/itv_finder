import { Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

/**
 * API de Búsqueda Unificada
 * Endpoint principal para consultar estaciones ITV de todas las comunidades
 * Devuelve siempre JSON estandarizado
 */
export const buscarEstaciones = async (req: Request, res: Response) => {
    try {
        const { provincia, localidad, tipo, lat, lon, radio } = req.query;

        // Validación de parámetros para búsqueda por proximidad
        if ((lat || lon || radio) && !(lat && lon && radio)) {
            return res.status(400).json({
                error: "Para búsqueda por proximidad se requieren los parámetros: lat, lon y radio"
            });
        }

        // Construir query base
        let query = supabase
            .from("estacion")
            .select(`
                *,
                localidad:localidadId (
                    id,
                    nombre,
                    provincia:provinciaId (
                        id,
                        nombre
                    )
                )
            `);

        // Aplicar filtros según parámetros recibidos

        // Filtro por tipo de estación
        if (tipo) {
            const tipoValido = tipo as "Estacion Fija" | "Estacion Movil" | "Otros";
            query = query.eq("tipo", tipoValido);
        }

        // Obtener datos base
        const { data: estaciones, error: errorEstaciones } = await query;

        if (errorEstaciones) {
            return res.status(500).json({ error: errorEstaciones.message });
        }

        let estacionesFiltradas = estaciones || [];

        // Filtro por provincia (case-insensitive)
        if (provincia) {
            const provinciaBuscar = (provincia as string).toLowerCase().trim();
            estacionesFiltradas = estacionesFiltradas.filter((est: any) =>
                est.localidad?.provincia?.nombre.toLowerCase().includes(provinciaBuscar)
            );
        }

        // Filtro por localidad (case-insensitive)
        if (localidad) {
            const localidadBuscar = (localidad as string).toLowerCase().trim();
            estacionesFiltradas = estacionesFiltradas.filter((est: any) =>
                est.localidad?.nombre.toLowerCase().includes(localidadBuscar)
            );
        }

        // Filtro por proximidad (búsqueda cercana)
        if (lat && lon && radio) {
            const latNum = parseFloat(lat as string);
            const lonNum = parseFloat(lon as string);
            const radioKm = parseFloat(radio as string);

            if (isNaN(latNum) || isNaN(lonNum) || isNaN(radioKm)) {
                return res.status(400).json({
                    error: "Los parámetros lat, lon y radio deben ser números válidos"
                });
            }

            // Filtrar por distancia usando la fórmula de Haversine
            estacionesFiltradas = estacionesFiltradas.filter((est: any) => {
                const distancia = calcularDistancia(
                    latNum,
                    lonNum,
                    est.latitud,
                    est.longitud
                );
                return distancia <= radioKm;
            });

            // Ordenar por distancia (más cercanas primero)
            estacionesFiltradas.sort((a: any, b: any) => {
                const distA = calcularDistancia(latNum, lonNum, a.latitud, a.longitud);
                const distB = calcularDistancia(latNum, lonNum, b.latitud, b.longitud);
                return distA - distB;
            });

            // Añadir campo de distancia a cada estación
            estacionesFiltradas = estacionesFiltradas.map((est: any) => ({
                ...est,
                distancia_km: parseFloat(
                    calcularDistancia(latNum, lonNum, est.latitud, est.longitud).toFixed(2)
                )
            }));
        }

        // Devolver resultado en formato JSON estandarizado
        return res.status(200).json({
            total: estacionesFiltradas.length,
            estaciones: estacionesFiltradas
        });

    } catch (error) {
        console.error("Error en búsqueda de estaciones:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * Retorna la distancia en kilómetros
 */
function calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c;

    return distancia;
}

/**
 * Convierte grados a radianes
 */
function toRad(grados: number): number {
    return grados * (Math.PI / 180);
}
