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
 * Lee el archivo CSV original (codificación UTF-8, separador ;) y devuelve los datos crudos.
 */
export async function getDatosGAL(dataFolder: string = "data/entrega2"): Promise<EstacionGALSource[]> {
    const filePath = path.join(__dirname, `../../${dataFolder}/Estacions_ITV.csv`);
    const results: EstacionGALSource[] = [];

    return new Promise((resolve, reject) => {
        console.log(`[Wrapper GAL] Leyendo archivo desde: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            return reject(new Error(`El archivo no existe en la ruta: ${filePath}`));
        }

        // Usar encoding UTF-8 para leer correctamente los caracteres gallegos
        fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(csv({ separator: ";" })) // El CSV de Galicia usa punto y coma
            .on("data", (row) => {
                // Limpiar las claves del objeto (por si tienen espacios o BOM)
                const cleanRow: any = {};
                for (const [key, value] of Object.entries(row)) {
                    const cleanKey = key.trim().replace(/^\uFEFF/, ''); // Eliminar BOM si existe
                    cleanRow[cleanKey] = typeof value === 'string' ? value.trim() : value;
                }

                // DEBUG: Ver las claves que genera el parser (solo primera fila)
                if (results.length === 0) {
                    console.log(`[Wrapper GAL DEBUG] Claves generadas:`, Object.keys(cleanRow));
                    console.log(`[Wrapper GAL DEBUG] Primera fila:`, cleanRow);
                }
                results.push(cleanRow);
            })
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