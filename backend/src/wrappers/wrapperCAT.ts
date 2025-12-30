import { Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

/**
 * Wrapper de Cataluña
 * Simula la fuente original devolviendo XML en el formato nativo de Cataluña
 * Consulta Supabase y transforma los datos al formato original XML
 */
export const getWrapperCAT = async (req: Request, res: Response) => {
    try {
        // 1. Obtener IDs de las provincias de Cataluña
        const { data: provincias, error: errorProvincias } = await supabase
            .from("provincia")
            .select("id")
            .in("nombre", ["Barcelona", "Girona", "Lleida", "Tarragona"]);

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

        // 4. Construir XML en formato original de Cataluña
        const xmlRows = estaciones?.map((est: any) => {
            // Formatear serveis_territorials (ej: "Serveis Territorials de Barcelona")
            const serveisTerritorials = `Serveis Territorials de ${est.localidad?.provincia?.nombre || ""}`;

            return `    <row>
      <denominaci>${escapeXml(est.nombre || "")}</denominaci>
      <municipi>${escapeXml(est.localidad?.nombre || "")}</municipi>
      <serveis_territorials>${escapeXml(serveisTerritorials)}</serveis_territorials>
      <operador>${escapeXml(est.operador || "")}</operador>
      <lat>${est.latitud || 0}</lat>
      <long>${est.longitud || 0}</long>
      <cp>${est.codigo_postal || ""}</cp>
    </row>`;
        }).join("\n") || "";

        // 5. Construir XML completo con estructura original
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <row>
${xmlRows}
  </row>
</response>`;

        // 6. Configurar headers de respuesta para XML
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Content-Disposition", "inline; filename=estaciones_cataluna.xml");

        return res.status(200).send(xml);

    } catch (error) {
        console.error("Error en wrapperCAT:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * Función auxiliar para escapar caracteres especiales en XML
 */
function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
