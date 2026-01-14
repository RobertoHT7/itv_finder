import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad, existeEstacion } from "../utils/dbHelpers";
import { validarYCorregirEstacion } from "../utils/validator";
import { broadcastLog } from "../api/sseLogger";

export async function loadGALData(dataFolder: string = "data/entrega2") {
    const filePath = path.join(__dirname, `../../${dataFolder}/Estacions_ITV.csv`);
    const results: any[] = [];

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath, { encoding: 'utf-8' })
            .pipe(csv({ separator: ";" }))
            .on("data", (row) => results.push(row))
            .on("end", async () => {
                const source = dataFolder.includes("entrega1") ? "ENTREGA 1" :
                    dataFolder.includes("entrega2") ? "ENTREGA 2" :
                        dataFolder.includes("completo") ? "COMPLETO" : "PRODUCCIÓN";
                console.log(`\n${"=".repeat(80)}`);
                console.log(`🔄 [GALICIA - ${source}] Procesando ${results.length} estaciones`);
                console.log(`${"=".repeat(80)}\n`);
                broadcastLog(`[GALICIA - ${source}] Procesando ${results.length} estaciones`, 'info');

                let cargadas = 0;
                let rechazadas = 0;
                let corregidas = 0;
                
                // Set para rastrear estaciones ya procesadas en esta ejecución
                const estacionesProcesadas = new Set<string>();

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
                        broadcastLog(`⚠️ Fila incompleta, saltando...`, 'warning');
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
                        broadcastLog(`🚫 Estación rechazada por errores críticos`, 'warning');
                        continue;
                    }

                    if (validacion.advertencias.length > 0) {
                        corregidas++;
                    }

                    console.log(`\n✅ Estación validada, procediendo al procesamiento e inserción...\n`);
                    broadcastLog(`✅ Estación validada, procediendo al procesamiento e inserción...`, 'info');

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

                    const nombre = `${nombreOriginal}`;
                    const contacto = `Tel: ${telefono || "N/A"} Email: ${email || "N/A"}`;

                    let tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Estacion Fija";
                    if (nombreOriginal.toLowerCase().includes("móvil")) tipoEstacion = "Estacion Movil";
                    
                    // Normalizar nombre para comparación
                    const normalizar = (str: string) => str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    let claveEstacion: string;
                    
                    // Para estaciones fijas: usar municipio_provincia
                    // Para móviles: usar tipo_provincia
                    if (tipoEstacion === "Estacion Fija") {
                        claveEstacion = `${normalizar(datos.MUNICIPIO || concello)}_${normalizar(datos.PROVINCIA)}`;
                    } else {
                        claveEstacion = `movil_${normalizar(datos.PROVINCIA)}`;
                    }
                    
                    // Verificar si ya se procesó en esta ejecución
                    if (estacionesProcesadas.has(claveEstacion)) {
                        const tipoTexto = tipoEstacion === "Estacion Fija" ? "en " + (datos.MUNICIPIO || concello) : 
                                        "Móvil de " + datos.PROVINCIA;
                        console.log(`⚠️ Estación ${tipoTexto} duplicada en el archivo, omitiendo\n`);
                        broadcastLog(`⚠️ Estación ${tipoTexto} duplicada en archivo, omitida`, 'warning');
                        rechazadas++;
                        continue;
                    }
                    
                    // Marcar como procesada
                    estacionesProcesadas.add(claveEstacion);

                    // Validación final: asegurar que localidadId es válido
                    if (!localidadId) {
                        console.error("❌ localidadId es null o undefined, saltando estación\n");
                        broadcastLog("❌ Error: localidadId inválido", 'error');
                        rechazadas++;
                        continue;
                    }

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

                    // Verificar si ya existe la estación
                    const yaExiste = await existeEstacion(nombre, localidadId);
                    if (yaExiste) {
                        console.log(`⚠️ Estación "${nombre}" ya existe en la base de datos, omitiendo inserción\n`);
                        broadcastLog(`⚠️ Estación "${nombre}" ya existe, omitida`, 'warning');
                        rechazadas++;
                        continue;
                    }

                    const { error } = await supabase.from("estacion").insert(estacionData);
                    if (error) {
                        // Si es un error de duplicado, solo advertir y continuar
                        if (error.message.includes('duplicate') || error.code === '23505') {
                            console.log(`⚠️ Estación "${nombre}" duplicada detectada durante inserción, omitiendo\n`);
                            broadcastLog(`⚠️ Estación "${nombre}" duplicada, omitida`, 'warning');
                            rechazadas++;
                        } else {
                            console.error("❌ Error insertando GAL:", error.message);
                            broadcastLog(`❌ Error insertando estación: ${error.message}`, 'error');
                            rechazadas++;
                        }
                    } else {
                        console.log(`✅ Estación insertada correctamente en la base de datos\n`);
                        broadcastLog(`✅ Estación insertada correctamente (${cargadas + 1}/${results.length})`, 'success');
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
                
                broadcastLog(`📊 RESUMEN GALICIA`, 'info');
                broadcastLog(`✅ Estaciones cargadas: ${cargadas}`, 'success');
                broadcastLog(`✏️ Estaciones con correcciones: ${corregidas}`, 'info');
                broadcastLog(`❌ Estaciones rechazadas: ${rechazadas}`, 'warning');
                broadcastLog(`📝 Total procesadas: ${results.length}`, 'info');

                resolve();
            })
            .on("error", reject);
    });
}

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
