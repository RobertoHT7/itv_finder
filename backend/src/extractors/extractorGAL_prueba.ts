import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { EstacionInsert, validarDatosEstacion } from "../../../shared/types";

// Función auxiliar para parsear coordenadas mixtas (Decimal y Grados Minutos)
function parseGalicianCoordinates(coordString: string): { lat: number, lon: number } {
    if (!coordString) return { lat: 0, lon: 0 };

    const cleanStr = coordString.replace(/'/g, "").trim();
    const parts = cleanStr.split(",").map(s => s.trim());

    if (parts.length !== 2) return { lat: 0, lon: 0 };

    if (parts[0].includes("°")) {
        const parseDM = (str: string) => {
            const negative = str.includes("-");
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

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lon)) return { lat: 0, lon: 0 };

    return { lat, lon };
}

export async function loadGALDataPrueba() {
    const filePath = path.join(__dirname, "../../data_prueba/Estacions_ITV.csv");
    const results: any[] = [];

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath, { encoding: 'utf-8' })
            .pipe(csv({ separator: ";" }))
            .on("data", (row) => results.push(row))
            .on("end", async () => {
                console.log(`🔄 [PRUEBA] Cargando ${results.length} estaciones de Galicia...`);

                for (const est of results) {
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

                    if (!nombreOriginal || !concello || !provincia) {
                        console.warn("⚠️ Fila incompleta (falta nombre, concello o provincia), saltando...");
                        continue;
                    }

                    const provinciaId = await getOrCreateProvincia(provincia);
                    if (!provinciaId) continue;

                    const localidadId = await getOrCreateLocalidad(concello, provinciaId);
                    if (!localidadId) continue;

                    const { lat, lon } = parseGalicianCoordinates(coords || "");
                    const nombre = `Estación ITV ${nombreOriginal}`;
                    const contacto = `Tel: ${telefono || "N/A"} Email: ${email || "N/A"}`;

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

                console.log("✅ [PRUEBA] Datos de Galicia cargados correctamente");
                resolve();
            })
            .on("error", reject);
    });
}
