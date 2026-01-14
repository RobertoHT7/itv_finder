import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad, existeEstacion } from "../utils/dbHelpers";
import { validarYCorregirEstacion } from "../utils/validator";
import { broadcastLog } from "../api/sseLogger";

// Función para normalizar coordenadas al rango correcto de España
function normalizarCoordenada(valor: number, esLatitud: boolean): number {
    if (valor === 0) return 0;

    // Rangos válidos para España
    const rangoLat = { min: 27, max: 44 };
    const rangoLon = { min: -19, max: 5 };

    const rango = esLatitud ? rangoLat : rangoLon;

    // Mantener el signo original
    const signo = valor < 0 ? -1 : 1;
    const valorAbs = Math.abs(valor);

    // Probar diferentes divisores hasta encontrar uno que esté en el rango
    const divisores = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000];

    for (const divisor of divisores) {
        const resultado = (valorAbs / divisor) * signo;
        if (resultado >= rango.min && resultado <= rango.max) {
            return resultado;
        }
    }

    // Si ningún divisor funciona, devolver 0 (coordenada inválida)
    console.warn(`⚠️ No se pudo normalizar coordenada ${valor} (${esLatitud ? 'lat' : 'lon'})`);
    return 0;
}

export async function loadCATData(dataFolder: string = "data/entrega2") {
    const filePath = path.join(__dirname, `../../${dataFolder}/ITV-CAT.xml`);
    const xml = fs.readFileSync(filePath, "utf-8");
    const json = await parseStringPromise(xml);

    const estaciones = json.response?.row?.[0]?.row || [];

    const source = dataFolder.includes("entrega1") ? "ENTREGA 1" :
        dataFolder.includes("entrega2") ? "ENTREGA 2" :
            dataFolder.includes("completo") ? "COMPLETO" : "PRODUCCIÓN";
    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔄 [CATALUÑA - ${source}] Procesando ${estaciones.length} estaciones`);
    console.log(`${"=".repeat(80)}\n`);
    broadcastLog(`[CATALUÑA - ${source}] Procesando ${estaciones.length} estaciones`, 'info');

    let cargadas = 0;
    let rechazadas = 0;
    let corregidas = 0;
    
    // Set para rastrear estaciones ya procesadas en esta ejecución
    const estacionesProcesadas = new Set<string>();

    for (const est of estaciones) {
        const denominacio = est.denominaci?.[0];
        const municipi = est.municipi?.[0];
        const provinciaRaw = est.serveis_territorials?.[0];
        const operador = est.operador?.[0];

        // Extraer nombre de provincia limpio (ej: "Serveis Territorials de Tarragona" → "Tarragona")
        let provincia = provinciaRaw;
        if (provinciaRaw && provinciaRaw.includes(" de ")) {
            const partes = provinciaRaw.split(" de ");
            provincia = partes[partes.length - 1].trim();
        }

        if (!municipi || !provincia) {
            console.warn("⚠️ Punto incompleto en XML, saltando...\n");
            broadcastLog(`⚠️ Punto incompleto en XML, saltando...`, 'warning');
            rechazadas++;
            continue;
        }

        const latRaw = est.lat?.[0] ? parseFloat(est.lat[0]) : 0;
        const lonRaw = est.long?.[0] ? parseFloat(est.long[0]) : 0;
        const latitud = normalizarCoordenada(latRaw, true);
        const longitud = normalizarCoordenada(lonRaw, false);
        const cp = est.cp?.[0] || "";

        // Preparar datos para validación
        const datosEstacion = {
            denominaci: denominacio,
            municipi: municipi,
            provincia: provincia,
            cp: cp,
            latitud: latitud,
            longitud: longitud
        };

        // 🔍 VALIDAR Y CORREGIR DATOS
        const validacion = validarYCorregirEstacion(datosEstacion, "Cataluña");

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

        const localidadId = await getOrCreateLocalidad(datos.MUNICIPIO || municipi, provinciaId);
        if (!localidadId) {
            rechazadas++;
            continue;
        }

        const tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Estacion Fija";
        
        // Normalizar nombre para comparación (solo estaciones fijas en Cataluña)
        const normalizar = (str: string) => str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const claveEstacion = `${normalizar(datos.MUNICIPIO)}_${normalizar(datos.PROVINCIA)}`;
        
        // Verificar si ya se procesó en esta ejecución
        if (estacionesProcesadas.has(claveEstacion)) {
            console.log(`⚠️ Estación en "${datos.MUNICIPIO}" duplicada en el archivo, omitiendo\n`);
            broadcastLog(`⚠️ Estación en "${datos.MUNICIPIO}" duplicada en archivo, omitida`, 'warning');
            rechazadas++;
            continue;
        }
        
        // Marcar como procesada
        estacionesProcesadas.add(claveEstacion);

        const descripcion = `${denominacio} - ${municipi} (${operador})`;
        const nombre = `ITV de ${municipi}`;

        let contacto = est.correu_electr_nic?.[0] || "Sin contacto";
        if (contacto.startsWith("https") || contacto.startsWith("http")) {
            contacto = "https://www.applusiteuve.com/es-es/contacto-itv-responde/itv-responde/";
        }

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
            direccion: est.adre_a?.[0] || "Sin dirección",
            codigo_postal: datos["C.POSTAL"],
            latitud,
            longitud,
            descripcion: descripcion,
            horario: est.horari_de_servei?.[0] || "No especificado",
            contacto: contacto,
            url: est.web?.[0]?.$.url || est.web?.[0] || "https://itv.cat",
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
                console.error("❌ Error insertando CAT:", error.message);
                broadcastLog(`❌ Error insertando estación: ${error.message}`, 'error');
                rechazadas++;
            }
        } else {
            console.log(`✅ Estación insertada correctamente en la base de datos\n`);
            broadcastLog(`✅ Estación insertada correctamente (${cargadas + 1}/${estaciones.length})`, 'success');
            cargadas++;
        }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 RESUMEN CATALUÑA - PRUEBA`);
    console.log(`${"=".repeat(80)}`);
    console.log(`✅ Estaciones cargadas: ${cargadas}`);
    console.log(`✏️  Estaciones con correcciones: ${corregidas}`);
    console.log(`❌ Estaciones rechazadas: ${rechazadas}`);
    console.log(`📝 Total procesadas: ${estaciones.length}`);
    console.log(`${"=".repeat(80)}\n`);
    console.log(`${"=".repeat(80)}\n`);
    
    broadcastLog(`📊 RESUMEN CATALUÑA`, 'info');
    broadcastLog(`✅ Estaciones cargadas: ${cargadas}`, 'success');
    broadcastLog(`✏️ Estaciones con correcciones: ${corregidas}`, 'info');
    broadcastLog(`❌ Estaciones rechazadas: ${rechazadas}`, 'warning');
    broadcastLog(`📝 Total procesadas: ${estaciones.length}`, 'info');
}
