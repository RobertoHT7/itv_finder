import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad, existeEstacion } from "../utils/dbHelpers";
import { validarYCorregirEstacion } from "../utils/validator";
import { broadcastLog } from "../api/sseLogger";
import { getDatosGAL, EstacionGALSource } from "../wrappers/wrapperGAL";

// Función auxiliar para parsear coordenadas mixtas (Decimal y Grados Minutos)
// Esta lógica es específica de la fuente de Galicia, por eso se queda en el Extractor (Transformación)
function parseGalicianCoordinates(coordString: string): { lat: number, lon: number } {
    if (!coordString) return { lat: 0, lon: 0 };

    // Limpieza: remover comillas simples y espacios extras
    const cleanStr = coordString.replace(/'/g, "").trim();
    const parts = cleanStr.split(",").map(s => s.trim());

    if (parts.length !== 2) return { lat: 0, lon: 0 };

    // Caso 1: Formato Grados Minutos (e.g. 42° 8.108')
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

    // Caso 2: Decimal simple (e.g. 42.906076)
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lon)) return { lat: 0, lon: 0 };

    return { lat, lon };
}

export async function loadGALData(dataFolder: string = "data/entrega2") {
    const sourceName = dataFolder.includes("entrega1") ? "ENTREGA 1" :
        dataFolder.includes("entrega2") ? "ENTREGA 2" :
            dataFolder.includes("completo") ? "COMPLETO" : "PRODUCCIÓN";

    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔄 [GALICIA - ${sourceName}] Iniciando proceso ETL...`);
    broadcastLog(`Iniciando carga de Galicia (${sourceName})...`, 'info');

    let estaciones: EstacionGALSource[] = [];

    // 1. EXTRACCIÓN (Llamada al Wrapper)
    try {
        estaciones = await getDatosGAL(dataFolder);
    } catch (error: any) {
        console.error("❌ Error fatal en el wrapper GAL:", error.message);
        broadcastLog(`Error fatal al leer fuente GAL: ${error.message}`, 'error');
        return;
    }

    console.log(`📥 Procesando ${estaciones.length} estaciones obtenidas del wrapper.`);

    // DEBUG: Ver la primera estación completa
    if (estaciones.length > 0) {
        console.log(`[DEBUG GAL] Primera estación del wrapper:`, JSON.stringify(estaciones[0], null, 2));
    }

    let cargadas = 0;
    let rechazadas = 0;
    let corregidas = 0;

    // 2. TRANSFORMACIÓN Y CARGA
    for (const est of estaciones) {
        const nombreOriginal = est["NOME DA ESTACIÓN"];
        const concello = est["CONCELLO"];
        const provincia = est["PROVINCIA"];
        const direccion = est["ENDEREZO"];
        const cp = est["CÓDIGO POSTAL"];
        const coords = est["COORDENADAS GMAPS"];
        const telefono = est["TELÉFONO"];
        const email = est["CORREO ELECTRÓNICO"];
        const web = est["SOLICITUDE DE CITA PREVIA"];
        const horario = est["HORARIO"];

        // DEBUG: Ver qué está llegando del wrapper
        console.log(`[DEBUG GAL] Procesando estación:`, {
            nombre: nombreOriginal,
            concello,
            provincia,
            keys: Object.keys(est)
        });

        // Validar datos obligatorios básicos antes de procesar nada
        if (!nombreOriginal || !concello || !provincia) {
            console.warn("⚠️ Fila incompleta (falta nombre, concello o provincia), saltando...");
            rechazadas++;
            continue;
        }

        // Parseo de coordenadas
        const { lat, lon } = parseGalicianCoordinates(coords || "");

        // Preparar datos para validación
        // Mapeamos a un objeto genérico que entienda el validador
        const datosParaValidar = {
            "NOME DA ESTACIÓN": nombreOriginal,
            CONCELLO: concello,
            PROVINCIA: provincia,
            ENDEREZO: direccion,
            "CÓDIGO POSTAL": cp,
            latitud: lat,
            longitud: lon
        };

        // VALIDAR Y CORREGIR
        const validacion = validarYCorregirEstacion(datosParaValidar, "Galicia");

        if (!validacion.esValido) {
            rechazadas++;
            console.log(`⛔ Estación rechazada por validación: ${nombreOriginal}`);
            broadcastLog(`Estación rechazada: ${nombreOriginal}`, 'error');
            continue;
        }

        if (validacion.advertencias.length > 0) {
            corregidas++;
        }

        // Usar datos corregidos
        const datos = validacion.datosCorregidos;

        // Gestión de Provincia y Localidad en BD
        const provinciaId = await getOrCreateProvincia(datos.PROVINCIA);
        if (!provinciaId) {
            rechazadas++;
            broadcastLog(`Error gestionando provincia: ${datos.PROVINCIA}`, 'error');
            continue;
        }

        const localidadId = await getOrCreateLocalidad(datos.MUNICIPIO || concello, provinciaId);
        if (!localidadId) {
            rechazadas++;
            broadcastLog(`Error gestionando localidad: ${concello}`, 'error');
            continue;
        }

        // Transformación de TIPO 
        let tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Estacion Fija";
        if (nombreOriginal.toLowerCase().includes("móvil") || nombreOriginal.toLowerCase().includes("movil")) {
            tipoEstacion = "Estacion Movil";
        }

        // Transformación de NOMBRE 
        // Limpiar el prefijo "Estación ITV" si ya existe para evitar duplicación
        let nombreLimpio = nombreOriginal.trim();
        if (nombreLimpio.toLowerCase().startsWith("estación itv")) {
            nombreLimpio = nombreLimpio.substring(12).trim(); // Eliminar "Estación ITV"
        } else if (nombreLimpio.toLowerCase().startsWith("estacion itv")) {
            nombreLimpio = nombreLimpio.substring(12).trim(); // Eliminar "Estacion ITV"
        }
        const nombre = `Estación ITV ${nombreLimpio}`;

        // Transformación de CONTACTO 
        const contacto = `Tel: ${telefono || "N/A"} Email: ${email || "N/A"}`;

        // Comprobación de duplicados ANTES de preparar los datos
        const existe = await existeEstacion(nombre, localidadId);

        if (existe) {
            console.log(`⚠️ Estación "${nombre}" ya existe en localidad ${localidadId}, omitiendo.`);
            broadcastLog(`Estación duplicada omitida: ${nombre}`, 'warning');
            rechazadas++;
            continue;
        }

        const estacionData = {
            nombre: nombre,
            tipo: tipoEstacion,
            direccion: direccion || "Sin dirección",
            codigo_postal: String(datos["C.POSTAL"]),
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
            broadcastLog(`Error BD insertando ${nombre}: ${error.message}`, 'error');
            rechazadas++;
        } else {
            cargadas++;
            console.log(`✅ Insertada: ${nombre}`);
        }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 RESUMEN FINAL - GALICIA`);
    console.log(`${"=".repeat(80)}`);
    console.log(`✅ Cargadas: ${cargadas}`);
    console.log(`✏️  Corregidas: ${corregidas}`);
    console.log(`❌ Rechazadas/Omitidas: ${rechazadas}`);
    console.log(`📝 Total procesadas: ${estaciones.length}`);
    console.log(`${"=".repeat(80)}\n`);

    broadcastLog(`Carga Galicia finalizada. Cargadas: ${cargadas}, Rechazadas: ${rechazadas}`, 'success');
}