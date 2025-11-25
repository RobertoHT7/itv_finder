import { Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

/**
 * Obtener todas las estaciones de la Comunidad Valenciana
 */
export const getCVStations = async (req: Request, res: Response) => {
    const { data: provincias, error: errorProvincias } = await supabase
        .from("provincia")
        .select("id")
        .in("nombre", ["Valencia", "Castellón", "Alicante"]);

    if (errorProvincias) return res.status(500).json({ error: errorProvincias.message });

    const provinciaIds = provincias?.map(p => p.id) || [];

    const { data: localidades, error: errorLocalidades } = await supabase
        .from("localidad")
        .select("id")
        .in("provinciaId", provinciaIds);

    if (errorLocalidades) return res.status(500).json({ error: errorLocalidades.message });

    const localidadIds = localidades?.map(l => l.id) || [];

    const { data, error } = await supabase
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
        `)
        .in("localidadId", localidadIds);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ total: data?.length || 0, estaciones: data });
};

/**
 * Obtener estaciones de CV por provincia
 */
export const getCVStationsByProvincia = async (req: Request, res: Response) => {
    const { provincia } = req.params;

    // Obtener ID de la provincia
    const { data: provinciaData, error: errorProvincia } = await supabase
        .from("provincia")
        .select("id")
        .eq("nombre", provincia)
        .single();

    if (errorProvincia || !provinciaData) {
        return res.status(404).json({ error: `Provincia ${provincia} no encontrada` });
    }

    // Obtener localidades de esa provincia
    const { data: localidades, error: errorLocalidades } = await supabase
        .from("localidad")
        .select("id")
        .eq("provinciaId", provinciaData.id);

    if (errorLocalidades) return res.status(500).json({ error: errorLocalidades.message });

    const localidadIds = localidades?.map(l => l.id) || [];

    // Obtener estaciones de esas localidades
    const { data, error } = await supabase
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
        `)
        .in("localidadId", localidadIds);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ total: data?.length || 0, provincia, estaciones: data });
};

/**
 * Obtener estaciones de CV por municipio
 */
export const getCVStationsByMunicipio = async (req: Request, res: Response) => {
    const { municipio } = req.params;

    // Obtener ID de la localidad
    const { data: localidadData, error: errorLocalidad } = await supabase
        .from("localidad")
        .select("id")
        .ilike("nombre", municipio);

    if (errorLocalidad) return res.status(500).json({ error: errorLocalidad.message });

    const localidadIds = localidadData?.map(l => l.id) || [];

    if (localidadIds.length === 0) {
        return res.json({ total: 0, municipio, estaciones: [] });
    }

    // Obtener estaciones de esa localidad
    const { data, error } = await supabase
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
        `)
        .in("localidadId", localidadIds);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ total: data?.length || 0, municipio, estaciones: data });
};

/**
 * Obtener estaciones de CV por tipo
 */
export const getCVStationsByTipo = async (req: Request, res: Response) => {
    const { tipo } = req.params;

    const { data: provincias, error: errorProvincias } = await supabase
        .from("provincia")
        .select("id")
        .in("nombre", ["Valencia", "Castellón", "Alicante"]);

    if (errorProvincias) return res.status(500).json({ error: errorProvincias.message });

    const provinciaIds = provincias?.map(p => p.id) || [];

    const { data: localidades, error: errorLocalidades } = await supabase
        .from("localidad")
        .select("id")
        .in("provinciaId", provinciaIds);

    if (errorLocalidades) return res.status(500).json({ error: errorLocalidades.message });

    const localidadIds = localidades?.map(l => l.id) || [];

    const { data, error } = await supabase
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
        `)
        .eq("tipo", tipo as any)
        .in("localidadId", localidadIds);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ total: data?.length || 0, tipo, estaciones: data });
};

/**
 * Buscar estaciones de CV cercanas a unas coordenadas
 */
export const getCVStationsNearby = async (req: Request, res: Response) => {
    const { lat, lon, radius = 50 } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: "Se requieren parámetros lat y lon" });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const radiusKm = parseFloat(radius as string);

    // Obtener todas las estaciones de CV con coordenadas
    const { data, error } = await supabase
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
        `)
        .neq("latitud", 0)
        .neq("longitud", 0);

    if (error) return res.status(500).json({ error: error.message });

    // Calcular distancia y filtrar
    const estacionesCercanas = data
        ?.map((estacion: any) => {
            const distance = calculateDistance(
                latitude,
                longitude,
                estacion.latitud,
                estacion.longitud
            );
            return { ...estacion, distancia_km: Math.round(distance * 100) / 100 };
        })
        .filter((estacion: any) => estacion.distancia_km <= radiusKm)
        .sort((a: any, b: any) => a.distancia_km - b.distancia_km);

    return res.json({
        total: estacionesCercanas?.length || 0,
        coordenadas: { lat: latitude, lon: longitude },
        radio_km: radiusKm,
        estaciones: estacionesCercanas,
    });
};

/**
 * Calcular distancia entre dos puntos usando fórmula de Haversine
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}
