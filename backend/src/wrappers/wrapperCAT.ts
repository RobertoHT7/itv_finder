import { Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

/**
 * Obtener todas las estaciones de Cataluña
 */
export const getCATStations = async (req: Request, res: Response) => {
    const { data: provincias, error: errorProvincias } = await supabase
        .from("provincia")
        .select("id")
        .in("nombre", ["Barcelona", "Girona", "Lleida", "Tarragona"]);

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
 * Obtener estaciones de Cataluña por provincia
 */
export const getCATStationsByProvincia = async (req: Request, res: Response) => {
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
 * Obtener estaciones de Cataluña por municipi (municipio)
 */
export const getCATStationsByMunicipi = async (req: Request, res: Response) => {
    const { municipi } = req.params;

    // Obtener ID de la localidad
    const { data: localidadData, error: errorLocalidad } = await supabase
        .from("localidad")
        .select("id")
        .ilike("nombre", municipi);

    if (errorLocalidad) return res.status(500).json({ error: errorLocalidad.message });

    const localidadIds = localidadData?.map(l => l.id) || [];

    if (localidadIds.length === 0) {
        return res.json({ total: 0, municipi, estaciones: [] });
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
    return res.json({ total: data?.length || 0, municipi, estaciones: data });
};

/**
 * Obtener estaciones de Cataluña por operador
 */
export const getCATStationsByOperador = async (req: Request, res: Response) => {
    const { operador } = req.params;

    const { data: provincias, error: errorProvincias } = await supabase
        .from("provincia")
        .select("id")
        .in("nombre", ["Barcelona", "Girona", "Lleida", "Tarragona"]);

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
        .ilike("descripcion", `%(${operador})%`)
        .in("localidadId", localidadIds);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ total: data?.length || 0, operador, estaciones: data });
};

/**
 * Buscar estaciones de Cataluña cercanas a unas coordenadas
 */
export const getCATStationsNearby = async (req: Request, res: Response) => {
    const { lat, lon, radius = 50 } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: "Se requieren parámetros lat y lon" });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const radiusKm = parseFloat(radius as string);

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

    const estacionesCercanas = data
        ?.filter((estacion: any) => {
            const provincia = estacion.localidad?.provincia?.nombre;
            return ["Barcelona", "Girona", "Lleida", "Tarragona"].includes(provincia);
        })
        .map((estacion: any) => {
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
 * Obtener estadísticas de estaciones de Cataluña
 */
export const getCATStats = async (req: Request, res: Response) => {
    const { data: provincias, error: errorProvincias } = await supabase
        .from("provincia")
        .select("id")
        .in("nombre", ["Barcelona", "Girona", "Lleida", "Tarragona"]);

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
            tipo,
            descripcion,
            localidad:localidadId (
                provincia:provinciaId (
                    nombre
                )
            )
        `)
        .in("localidadId", localidadIds);

    if (error) return res.status(500).json({ error: error.message });

    const stats = {
        total: data?.length || 0,
        por_provincia: {} as Record<string, number>,
        por_tipo: {} as Record<string, number>,
        por_operador: {} as Record<string, number>,
    };

    data?.forEach((estacion: any) => {
        const provincia = estacion.localidad?.provincia?.nombre || "Desconocido";
        const tipo = estacion.tipo || "Desconocido";
        
        // Extraer operador de la descripción (está entre paréntesis)
        const operadorMatch = estacion.descripcion?.match(/\(([^)]+)\)/);
        const operador = operadorMatch ? operadorMatch[1] : "Desconocido";

        stats.por_provincia[provincia] = (stats.por_provincia[provincia] || 0) + 1;
        stats.por_tipo[tipo] = (stats.por_tipo[tipo] || 0) + 1;
        stats.por_operador[operador] = (stats.por_operador[operador] || 0) + 1;
    });

    return res.json(stats);
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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
