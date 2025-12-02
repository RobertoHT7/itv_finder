import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { validarYCorregirEstacion } from "../utils/validator";

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
                console.log(`\n${"=".repeat(80)}`);
                console.log(`🔄 [GALICIA - PRUEBA] Procesando ${results.length} estaciones`);
                console.log(`${"=".repeat(80)}\n`);

                let cargadas = 0;
                let rechazadas = 0;
                let corregidas = 0;

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

                    if (!nombreOriginal || !concello || !provincia) {
                        console.warn("⚠️ Fila incompleta (falta nombre, concello o provincia), saltando...\n");
                        rechazadas++;
                        continue;
                    }

                    // Parseo de coordenadas
                    const { lat, lon } = parseGalicianCoordinates(coords || "");

                    // Preparar datos para validación
                    const datosEstacion = {
                        "NOME DA ESTACIÓN": nombreOriginal,
                        CONCELLO: concello,
                        PROVINCIA: provincia,
                        ENDEREZO: direccion,
                        "CÓDIGO POSTAL": cp,
                        "COORDENADAS GMAPS": coords,
                        latitud: lat,
                        longitud: lon
                    };

                    // 🔍 VALIDAR Y CORREGIR DATOS
                    const validacion = validarYCorregirEstacion(datosEstacion, "Galicia");

                    if (!validacion.esValido) {
                        rechazadas++;
                        console.log(`\n🚫 Estación rechazada por errores críticos\n`);
                        continue;
                    }

                    if (validacion.advertencias.length > 0) {
                        corregidas++;
                    }

                    console.log(`\n✅ Estación validada, procediendo al procesamiento e inserción...\n`);

                    // Usar datos corregidos
                    const datos = validacion.datosCorregidos;

                    const provinciaId = await getOrCreateProvincia(datos.PROVINCIA);
                    if (!provinciaId) {
                        rechazadas++;
                        continue;
                    }

                    const localidadId = await getOrCreateLocalidad(datos.MUNICIPIO || concello, provinciaId);
                    if (!localidadId) {
                        rechazadas++;
                        continue;
                    }

                    const nombre = `Estación ITV ${nombreOriginal}`;
                    const contacto = `Tel: ${telefono || "N/A"} Email: ${email || "N/A"}`;

                    let tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Estacion Fija";
                    if (nombreOriginal.toLowerCase().includes("móvil")) tipoEstacion = "Estacion Movil";

                    const estacionData = {
                        nombre: nombre,
                        tipo: tipoEstacion,
                        direccion: direccion || "Sin dirección",
                        codigo_postal: datos["C.POSTAL"],
                        latitud: lat,
                        longitud: lon,
                        descripcion: `Estación ITV de ${concello}`,
                        horario: horario || "No especificado",
                        contacto: contacto,
                        url: web || "https://sycitv.com",
                        localidadId,
                    };

                    const { error } = await supabase.from("estacion").insert(estacionData);
                    if (error) {
                        console.error("❌ Error insertando GAL:", error.message);
                        rechazadas++;
                    } else {
                        console.log(`✅ Estación insertada correctamente en la base de datos\n`);
                        cargadas++;
                    }
                }

                console.log(`\n${"=".repeat(80)}`);
                console.log(`📊 RESUMEN GALICIA - PRUEBA`);
                console.log(`${"=".repeat(80)}`);
                console.log(`✅ Estaciones cargadas: ${cargadas}`);
                console.log(`✏️  Estaciones con correcciones: ${corregidas}`);
                console.log(`❌ Estaciones rechazadas: ${rechazadas}`);
                console.log(`📝 Total procesadas: ${results.length}`);
                console.log(`${"=".repeat(80)}\n`);

                resolve();
            })
            .on("error", reject);
    });
}
