import { Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

/**
 * Wrapper de Comunidad Valenciana
 * Simula la fuente original devolviendo JSON en el formato nativo de CV
 * Consulta Supabase y transforma los datos al formato original
 */
export const getWrapperCV = async (req: Request, res: Response) => {
    try {
        // 1. Obtener IDs de las provincias de la Comunidad Valenciana
        const { data: provincias, error: errorProvincias } = await supabase
            .from("provincia")
            .select("id")
            .in("nombre", ["Valencia", "Castellón", "Alicante"]);

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

        // 4. Transformar al formato JSON original de CV
        const estacionesCV = estaciones?.map((est: any) => {
            // Determinar tipo de estación en formato original
            let tipoEstacion = "Estación ITV";
            if (est.tipo === "Estacion Fija") {
                tipoEstacion = "Estación Fija";
            } else if (est.tipo === "Estacion Movil") {
                tipoEstacion = "Estación Móvil";
            } else if (est.tipo === "Otros") {
                tipoEstacion = "Estación Agrícola";
            }

            // Extraer número de estación del nombre (si existe)
            const numeroEstacionMatch = est.nombre.match(/\d+/);
            const numeroEstacion = numeroEstacionMatch ? parseInt(numeroEstacionMatch[0]) : 0;

            return {
                "TIPO ESTACIÓN": tipoEstacion,
                "PROVINCIA": est.localidad?.provincia?.nombre || "",
                "MUNICIPIO": est.localidad?.nombre || "",
                "C.POSTAL": parseInt(est.codigo_postal) || 0,
                "DIRECCIÓN": est.direccion || "",
                "Nº ESTACIÓN": numeroEstacion,
                "HORARIOS": est.horario || "",
                "CORREO": est.email || ""
            };
        }) || [];

        // 5. Devolver JSON (Content-Type por defecto de Express es application/json)
        return res.status(200).json(estacionesCV);

    } catch (error) {
        console.error("Error en wrapperCV:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};
