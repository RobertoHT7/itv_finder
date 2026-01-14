import fs from "fs";
import path from "path";
import csv from "csv-parser";

// Definimos la interfaz que coincide con las columnas del CSV original
export interface EstacionGALSource {
    "NOME DA ESTACIÓN": string;
    "ENDEREZO": string;
    "CONCELLO": string;
    "CÓDIGO POSTAL": string;
    "PROVINCIA": string;
    "TELÉFONO": string;
    "HORARIO": string;
    "SOLICITUDE DE CITA PREVIA": string;
    "CORREO ELECTRÓNICO": string;
    "COORDENADAS GMAPS": string;
}

/**
 * Wrapper para Galicia.
 * Lee el archivo CSV original (codificación latin1, separador ;) y devuelve los datos crudos.
 */
export async function getDatosGAL(dataFolder: string = "data/entrega2"): Promise<EstacionGALSource[]> {
    const filePath = path.join(__dirname, `../../${dataFolder}/Estacions_ITV.csv`);
    const results: EstacionGALSource[] = [];

    return new Promise((resolve, reject) => {
        console.log(`[Wrapper GAL] Leyendo archivo desde: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            return reject(new Error(`El archivo no existe en la ruta: ${filePath}`));
        }

        // Es CRUCIAL usar encoding 'latin1' (o 'binary'/'iso-8859-1') para este archivo de Galicia
        // de lo contrario, las tildes y ñ se romperán.
        fs.createReadStream(filePath, { encoding: 'latin1' })
            .pipe(csv({ separator: ";" })) // El CSV de Galicia usa punto y coma
            .on("data", (row) => results.push(row))
            .on("end", () => {
                console.log(`[Wrapper GAL] Leídos ${results.length} registros crudos.`);
                resolve(results);
            })
            .on("error", (error) => {
                console.error("[Wrapper GAL] Error leyendo la fuente de datos:", error);
                reject(error);
            });
    });
}