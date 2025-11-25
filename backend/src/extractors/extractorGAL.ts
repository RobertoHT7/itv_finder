import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { EstacionInsert, validarDatosEstacion, TipoEstacion } from "../types/estacion.types";

interface EstacionGAL {
    "NOME DA ESTACIÓN": string;
    ENDEREZO: string;
    CONCELLO: string;
    "CÓDIGO POSTAL": string;
    PROVINCIA: string;
    "TELÉFONO": string;
    HORARIO: string;
    "SOLICITUDE DE CITA PREVIA": string;
    "CORREO ELECTRÓNICO": string;
    "COORDENADAS GMAPS": string;
}

// Función auxiliar para parsear coordenadas mixtas (Decimal y Grados Minutos)
function parseGalicianCoordinates(coordString: string): { lat: number, lon: number } {
    if (!coordString) return { lat: 0, lon: 0 };
    
    // Limpieza básica
    const cleanStr = coordString.replace(/'/g, "").trim();
    const parts = cleanStr.split(",").map(s => s.trim());

    if (parts.length !== 2) return { lat: 0, lon: 0 };

    // Caso 1: Formato Grados Minutos (e.g., 43° 18.856)
    if (parts[0].includes("°")) {
        const parseDM = (str: string) => {
            const [d, m] = str.split("°").map(parseFloat);
            const sign = str.includes("-") ? -1 : 1;
            return sign * (Math.abs(d) + (m / 60));
        };
        return { lat: parseDM(parts[0]), lon: parseDM(parts[1]) };
    } 
    
    // Caso 2: Decimal simple (e.g., 42.906076)
    return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
}

export async function loadGALData() {
    const filePath = path.join(__dirname, "../../data/Estacions_ITV.csv");
    const results: any[] = []; // Usamos any temporalmente por problemas de encoding en claves CSV

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
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
                        console.warn("⚠️ Fila incompleta (falta nombre, concello o provincia), saltando...");
                        continue;
                    }

                    const provinciaId = await getOrCreateProvincia(provincia);
                    if (!provinciaId) continue;

                    const localidadId = await getOrCreateLocalidad(concello, provinciaId);
                    if (!localidadId) continue;

                    // Parseo de coordenadas
                    const { lat, lon } = parseGalicianCoordinates(coords || "");

                    // Transformación de NOMBRE (Mapping Page 2)
                    const nombre = `Estación ITV ${nombreOriginal}`;

                    // Transformación de CONTACTO (Mapping Page 3)
                    const contacto = `Tel: ${telefono || "N/A"} Email: ${email || "N/A"}`;

                    // Transformación de TIPO (Mapping Page 2 - Asumimos Fija por defecto según CSV)
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