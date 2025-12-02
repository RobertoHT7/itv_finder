import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { validarYCorregirEstacion } from "../utils/validator";

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
                console.log(`\n🔄 Cargando ${results.length} estaciones de Galicia...`);
                
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

                    // Validar datos obligatorios básicos
                    if (!nombreOriginal || !concello || !provincia) {
                        console.warn("⚠️ Fila incompleta (falta nombre, concello o provincia), saltando...\n");
                        rechazadas++;
                        continue;
                    }

                    // Preparar datos para validación
                    const datosEstacion = {
                        "NOME DA ESTACIÓN": nombreOriginal,
                        CONCELLO: concello,
                        PROVINCIA: provincia,
                        ENDEREZO: direccion,
                        "CÓDIGO POSTAL": cp,
                        "COORDENADAS GMAPS": coords,
                        latitud: 0,
                        longitud: 0
                    };

                    // VALIDAR Y CORREGIR DATOS
                    const validacion = validarYCorregirEstacion(datosEstacion, "Galicia");
                    
                    if (!validacion.esValido) {
                        rechazadas++;
                        console.log(`⛔ Estación rechazada por errores críticos\n`);
                        continue;
                    }

                    if (validacion.advertencias.length > 0) {
                        corregidas++;
                    }

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

                    // Parseo de coordenadas
                    const { lat, lon } = parseGalicianCoordinates(coords || "");

                    // Transformación de NOMBRE 
                    const nombre = `Estación ITV ${nombreOriginal}`;

                    // Transformación de CONTACTO 
                    const contacto = `Tel: ${telefono || "N/A"} Email: ${email || "N/A"}`;

                    // Transformación de TIPO 
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
                        cargadas++;
                    }
                }

                console.log("\n" + "=".repeat(70));
                console.log("📊 RESUMEN DE CARGA - GALICIA");
                console.log("=".repeat(70));
                console.log(`✅ Estaciones cargadas: ${cargadas}`);
                console.log(`✏️  Estaciones con correcciones: ${corregidas}`);
                console.log(`❌ Estaciones rechazadas: ${rechazadas}`);
                console.log(`📝 Total procesadas: ${results.length}`);
                console.log("=".repeat(70) + "\n");
                resolve();
            })
            .on("error", reject);
    });
}