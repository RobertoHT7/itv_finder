import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { validarDatosEstacion, type EstacionInsert, type TipoEstacion } from "../../../shared/types";

// Función auxiliar para parsear coordenadas mixtas (Decimal y Grados Minutos)
function parseGalicianCoordinates(coordString: string): { lat: number, lon: number } {
    if (!coordString) return { lat: 0, lon: 0 };

    // Limpieza: remover comillas simples y espacios extras
    const cleanStr = coordString.replace(/'/g, "").trim();
    const parts = cleanStr.split(",").map(s => s.trim());

    if (parts.length !== 2) return { lat: 0, lon: 0 };

    // Caso 1: Formato Grados Minutos
    if (parts[0].includes("°")) {
        const parseDM = (str: string) => {
            // Extraer el signo
            const negative = str.includes("-");
            // Eliminar el signo para el parsing
            const cleanNum = str.replace("-", "").trim();
            const [grados, minutos] = cleanNum.split("°").map(s => s.trim());
            const g = parseFloat(grados);
            const m = parseFloat(minutos);

            if (isNaN(g) || isNaN(m)) return 0;

            const decimal = g + (m / 60);
            return negative ? -decimal : decimal;
        };
        return { lat: parseDM(parts[0]), lon: parseDM(parts[1]) };
    }

    // Caso 2: Decimal simple (e.g., 42.906076)
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lon)) return { lat: 0, lon: 0 };

    return { lat, lon };
}

export async function loadGALData() {
    const filePath = path.join(__dirname, "../../data/Estacions_ITV.csv");
    const results: any[] = [];

    return new Promise<void>((resolve, reject) => {
        // Leer con codificación latin1 (ISO-8859-1) en lugar de UTF-8
        fs.createReadStream(filePath, { encoding: 'latin1' })
            // Aseguramos que el separador sea ;
            .pipe(csv({ separator: ";" }))
            .on("data", (row) => results.push(row))
            .on("end", async () => {
                console.log(`🔄 Cargando ${results.length} estaciones de Galicia...`);

                for (const est of results) {
                    // Mapeo de claves con posibles caracteres extraños por encoding
                    const nombreOriginal = est["NOME DA ESTACIÓN"] || est["NOME DA ESTACIN"];
                    const concello = est["CONCELLO"];
                    const provincia = est["PROVINCIA"];
                    const direccion = est["ENDEREZO"];
                    const cp = est["CÓDIGO POSTAL"] || est["CDIGO POSTAL"];
                    const coords = est["COORDENADAS GMAPS"];
                    const telefono = est["TELÉFONO"] || est["TELFONO"];
                    const email = est["CORREO ELECTRÓNICO"] || est["CORREO ELECTRNICO"];
                    const web = est["SOLICITUDE DE CITA PREVIA"];
                    const horario = est["HORARIO"];

                    // Validar datos obligatorios
                    if (!nombreOriginal || !concello || !provincia) {
                        console.warn("Fila incompleta (falta nombre, concello o provincia), saltando...");
                        continue;
                    }

                    const provinciaId = await getOrCreateProvincia(provincia);
                    if (!provinciaId) continue;

                    const localidadId = await getOrCreateLocalidad(concello, provinciaId);
                    if (!localidadId) continue;

                    // Parseo de coordenadas
                    const { lat, lon } = parseGalicianCoordinates(coords || "");

                    // Transformación de NOMBRE 
                    const nombre = `Estación ITV ${nombreOriginal}`;

                    // Transformación de CONTACTO 
                    const contacto = `Tel: ${telefono || "N/A"} Email: ${email || "N/A"}`;

                    // Transformación de TIPO 
                    let tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Estacion Fija";
                    if (nombreOriginal.toLowerCase().includes("móvil")) tipoEstacion = "Estacion Movil";

                    const estacionData: EstacionInsert = {
                        nombre: nombre,
                        tipo: tipoEstacion,
                        direccion: direccion || "Sin dirección",
                        codigo_postal: cp || "00000",
                        latitud: lat,
                        longitud: lon,
                        descripcion: `Estación ITV de ${concello}`,
                        horario: horario || "No especificado",
                        contacto: contacto,
                        url: web || "https://sycitv.com",
                        localidadId,
                    };

                    const errores = validarDatosEstacion(estacionData);
                    if (errores.length > 0) {
                        console.error(`❌ Datos inválidos para ${concello}:`, errores);
                        continue;
                    }

                    const { error } = await supabase.from("estacion").insert(estacionData);
                    if (error) console.error("❌ Error insertando GAL:", error.message);
                }

                console.log("✅ Datos de Galicia cargados correctamente");
                resolve();
            })
            .on("error", reject);
    });
}