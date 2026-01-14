import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";

// Interfaz plana y limpia para el uso interno
export interface EstacionCATSource {
    denominaci: string;
    municipi: string;
    serveis_territorials: string;
    operador: string;
    adre_a: string;
    cp: string;
    lat: string;
    long: string;
    horari_de_servei: string;
    correu_electr_nic: string;
    web: string;
}

/**
 * Wrapper para Cataluña.
 * Lee el archivo XML original y devuelve un JSON limpio y plano.
 */
export async function getDatosCAT(dataFolder: string = "data/entrega2"): Promise<EstacionCATSource[]> {
    const filePath = path.join(__dirname, `../../${dataFolder}/ITV-CAT.xml`);

    console.log(`[Wrapper CAT] Leyendo archivo desde: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`El archivo no existe en la ruta: ${filePath}`);
    }

    try {
        const xmlData = fs.readFileSync(filePath, "utf-8");

        // Parsear el XML a objeto JS
        const result = await parseStringPromise(xmlData);

        // Navegar por la estructura anidada del XML de la Generalitat
        // Estructura típica: response -> row -> row (array de estaciones)
        // Usamos optional chaining (?.) por seguridad
        const rawRows = result?.response?.row?.[0]?.row || [];

        // Mapear y aplanar los datos (xml2js devuelve arrays para los textos)
        const estacionesLimpias: EstacionCATSource[] = rawRows.map((r: any) => ({
            denominaci: r.denominaci?.[0] || "",
            municipi: r.municipi?.[0] || "",
            serveis_territorials: r.serveis_territorials?.[0] || "",
            operador: r.operador?.[0] || "",
            adre_a: r.adre_a?.[0] || "",
            cp: r.cp?.[0] || "",
            lat: r.lat?.[0] || "0",
            long: r.long?.[0] || "0",
            horari_de_servei: r.horari_de_servei?.[0] || "",
            correu_electr_nic: r.correu_electr_nic?.[0] || "",
            // La web a veces viene como atributo url en la etiqueta <web>
            web: r.web?.[0]?.$.url || r.web?.[0] || ""
        }));

        console.log(`[Wrapper CAT] Leídos y procesados ${estacionesLimpias.length} registros.`);
        return estacionesLimpias;

    } catch (error) {
        console.error("[Wrapper CAT] Error parseando XML:", error);
        throw error;
    }
}