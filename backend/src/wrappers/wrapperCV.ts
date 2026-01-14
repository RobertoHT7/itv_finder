import fs from "fs";
import path from "path";

// Interfaz que define la estructura exacta del archivo estaciones.json original
export interface EstacionCVSource {
    "TIPO ESTACIÓN": string;
    PROVINCIA: string;
    MUNICIPIO: string;
    "C.POSTAL": number | string;
    "DIRECCIÓN": string;
    "Nº ESTACIÓN": number;
    HORARIOS: string;
    CORREO: string;
}

/**
 * Wrapper para la Comunidad Valenciana.
 * Lee el archivo JSON original y devuelve los datos estructurados.
 * No realiza validaciones complejas ni inserciones en BD.
 */
export async function getDatosCV(dataFolder: string = "data/entrega2"): Promise<EstacionCVSource[]> {
    return new Promise((resolve, reject) => {
        try {
            // Construimos la ruta al fichero. Ajusta los '..' según tu estructura de carpetas real.
            // Asumiendo que este archivo está en backend/src/wrappers/
            const filePath = path.join(__dirname, `../../${dataFolder}/estaciones.json`);

            console.log(`[Wrapper CV] Leyendo archivo desde: ${filePath}`);

            if (!fs.existsSync(filePath)) {
                throw new Error(`El archivo no existe en la ruta: ${filePath}`);
            }

            const rawData = fs.readFileSync(filePath, "utf-8");
            const estaciones: EstacionCVSource[] = JSON.parse(rawData);

            console.log(`[Wrapper CV] Leídos ${estaciones.length} registros crudos.`);
            resolve(estaciones);
        } catch (error) {
            console.error("[Wrapper CV] Error leyendo la fuente de datos:", error);
            reject(error);
        }
    });
}