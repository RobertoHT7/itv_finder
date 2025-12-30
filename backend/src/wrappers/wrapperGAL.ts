import { Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

/**
 * Wrapper de Galicia
 * Simula la fuente original devolviendo CSV en el formato nativo de Galicia
 * Consulta Supabase y transforma los datos al formato original CSV
 */
export const getWrapperGAL = async (req: Request, res: Response) => {
    try {
        // 1. Obtener IDs de las provincias de Galicia
        const { data: provincias, error: errorProvincias } = await supabase
            .from("provincia")
            .select("id")
            .in("nombre", ["A Coruña", "Lugo", "Ourense", "Pontevedra"]);

        if (errorProvincias) {
            return res.status(500).json({ error: errorProvincias.message });
        }

        const provinciaIds = provincias?.map(p => p.id) || [];

        // 2. Obtener localidades de esas provincias
        const { data: localidades, error: errorLocalidades } = await supabase
            .from("localidad")
            .select("id")
            .in("provinciaId", provinciaIds);

        if (errorLocalidades) {
            return res.status(500).json({ error: errorLocalidades.message });
        }

        const localidadIds = localidades?.map(l => l.id) || [];

        // 3. Obtener estaciones de esas localidades con datos relacionados
        const { data: estaciones, error: errorEstaciones } = await supabase
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

        if (errorEstaciones) {
            return res.status(500).json({ error: errorEstaciones.message });
        }

        // 4. Construir CSV en formato original de Galicia
        // Header con separador ;
        const header = [
            "NOME DA ESTACIÓN",
            "CONCELLO",
            "PROVINCIA",
            "ENDEREZO",
            "CÓDIGO POSTAL",
            "COORDENADAS GMAPS",
            "TELÉFONO",
            "CORREO ELECTRÓNICO",
            "SOLICITUDE DE CITA PREVIA",
            "HORARIO"
        ].join(";");

        // Filas de datos
        const rows = estaciones?.map((est: any) => {
            // Formatear coordenadas en formato decimal (lat, lon)
            const coordenadas = `${est.latitud || 0},${est.longitud || 0}`;

            return [
                est.nombre || "",
                est.localidad?.nombre || "",
                est.localidad?.provincia?.nombre || "",
                est.direccion || "",
                est.codigo_postal || "",
                coordenadas,
                est.telefono || "",
                est.email || "",
                est.web || "",
                est.horario || ""
            ].join(";");
        }) || [];

        // 5. Unir header y rows
        const csv = [header, ...rows].join("\n");

        // 6. Configurar headers de respuesta para CSV
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=estaciones_galicia.csv");

        return res.status(200).send(csv);

    } catch (error) {
        console.error("Error en wrapperGAL:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};
