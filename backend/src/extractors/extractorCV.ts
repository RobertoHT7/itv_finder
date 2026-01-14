import fs from "fs";
import path from "path";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad, existeEstacion } from "../utils/dbHelpers";
import { validarYCorregirEstacion, validarYCorregirEstacionSinCoordenadas } from "../utils/validator";
import { validarCoordenadas } from "../utils/validator";
import { geocodificarConSelenium, delay } from "../utils/geocoding";
import { broadcastLog } from "../api/sseLogger";

interface EstacionCV {
    "TIPO ESTACIÓN": string;
    PROVINCIA: string;
    MUNICIPIO: string;
    "C.POSTAL": number | string;
    "DIRECCIÓN": string;
    "Nº ESTACIÓN": number;
    HORARIOS: string;
    CORREO: string;
}

export async function loadCVData(dataFolder: string = "data/entrega2") {
    const filePath = path.join(__dirname, `../../${dataFolder}/estaciones.json`);
    const rawData = fs.readFileSync(filePath, "utf-8");
    const estaciones: EstacionCV[] = JSON.parse(rawData);

    const source = dataFolder.includes("entrega1") ? "ENTREGA 1" :
        dataFolder.includes("entrega2") ? "ENTREGA 2" :
            dataFolder.includes("completo") ? "COMPLETO" : "PRODUCCIÓN";
    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔄 [COMUNIDAD VALENCIANA - ${source}] Procesando ${estaciones.length} estaciones`);
    console.log(`${"=".repeat(80)}\n`);
    broadcastLog(`[COMUNIDAD VALENCIANA - ${source}] Procesando ${estaciones.length} estaciones`, 'info');

    let cargadas = 0;
    let rechazadas = 0;
    let corregidas = 0;
    
    // Set para rastrear estaciones ya procesadas en esta ejecución (nombre + localidad)
    const estacionesProcesadas = new Set<string>();

    for (const est of estaciones) {
        // 🔍 VALIDACIÓN Y CORRECCIÓN DE DATOS (sin coordenadas aún)
        const validacion = validarYCorregirEstacionSinCoordenadas(est, "Comunidad Valenciana");

        if (!validacion.esValido) {
            rechazadas++;
            console.log(`\n🚫 La estación será RECHAZADA por errores críticos\n`);
            broadcastLog(`🚫 Estación rechazada por errores críticos`, 'warning');
            continue;
        }

        console.log(`\n✅ Estación validada, procediendo a la geocodificación e inserción...\n`);
        broadcastLog(`✅ Estación validada, procediendo a la geocodificación e inserción...`, 'info');

        // 🔍 PROCESAMIENTO CON DATOS CORREGIDOS
        const datos = validacion.datosCorregidos;
        const rawTipo = est["TIPO ESTACIÓN"] || "";
        const municipio = datos.MUNICIPIO || datos.PROVINCIA || "Desconocido";
        const codigoPostal = datos["C.POSTAL"];

        const provinciaId = await getOrCreateProvincia(datos.PROVINCIA);
        if (!provinciaId) {
            rechazadas++;
            continue;
        }

        const localidadId = await getOrCreateLocalidad(municipio, provinciaId);
        if (!localidadId) {
            rechazadas++;
            continue;
        }

        let tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Otros";
        if (rawTipo.includes("Fija")) tipoEstacion = "Estacion Fija";
        else if (rawTipo.includes("Móvil") || rawTipo.includes("Movil")) tipoEstacion = "Estacion Movil";
        else tipoEstacion = "Otros";
        
        // Normalizar nombre para comparación
        const normalizar = (str: string) => str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let claveEstacion: string;
        
        // Para estaciones fijas: usar municipio_provincia
        // Para móviles/agrícolas: usar tipo_provincia (permite 1 de cada tipo por provincia)
        if (tipoEstacion === "Estacion Fija") {
            claveEstacion = `${normalizar(municipio)}_${normalizar(datos.PROVINCIA)}`;
        } else if (tipoEstacion === "Estacion Movil") {
            claveEstacion = `movil_${normalizar(datos.PROVINCIA)}`;
        } else {
            claveEstacion = `agricola_${normalizar(datos.PROVINCIA)}`;
        }
        
        // Verificar si ya se procesó en esta ejecución
        if (estacionesProcesadas.has(claveEstacion)) {
            const tipoTexto = tipoEstacion === "Estacion Fija" ? "en " + municipio : 
                            tipoEstacion === "Estacion Movil" ? "Móvil de " + datos.PROVINCIA :
                            "Agrícola de " + datos.PROVINCIA;
            console.log(`⚠️ Estación ${tipoTexto} duplicada en el archivo, omitiendo\n`);
            broadcastLog(`⚠️ Estación ${tipoTexto} duplicada en archivo, omitida`, 'warning');
            rechazadas++;
            continue;
        }
        
        // Marcar como procesada
        estacionesProcesadas.add(claveEstacion);

        let url = "https://sitval.com/centros/";
        if (tipoEstacion === "Estacion Movil") {
            url += "movil";
        } else if (tipoEstacion === "Otros" || rawTipo.includes("Agrícola")) {
            url += "agricola";
        }

        const nombre = tipoEstacion === "Estacion Movil"
            ? `Estación Móvil - ${datos.PROVINCIA}`
            : tipoEstacion === "Otros"
                ? `Estación Agrícola - ${datos.PROVINCIA}`
                : `Estación ITV ${municipio}`;
        const descripcion = tipoEstacion === "Estacion Movil"
            ? `Estación ITV Móvil provincia de ${datos.PROVINCIA} con código: ${est["Nº ESTACIÓN"]}`
            : `Estación ITV ${municipio} con código: ${est["Nº ESTACIÓN"]}`;

        let coordenadas: { lat: number; lon: number } | null = null;
        console.log(`Tipo de estación: ${tipoEstacion}`);
        if (tipoEstacion !== "Estacion Movil" && tipoEstacion !== "Otros") {
            console.log(`📍 Geocodificando: ${municipio}...`);
            broadcastLog(`📍 Geocodificando: ${municipio}...`, 'info');
            coordenadas = await geocodificarConSelenium(
                est["DIRECCIÓN"] || "",
                municipio,
                est.PROVINCIA,
                codigoPostal
            );
        } else {
            console.log(`Estación móvil, se omite geocodificación.`);
            broadcastLog(`Estación móvil, se omite geocodificación.`, 'info');
        }

        await delay(500);

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
            direccion: est["DIRECCIÓN"] || "Sin dirección",
            codigo_postal: codigoPostal,
            latitud: coordenadas?.lat || 0,
            longitud: coordenadas?.lon || 0,
            descripcion: descripcion,
            horario: est.HORARIOS || "No especificado",
            contacto: est.CORREO || "Sin contacto",
            url: url,
            localidadId,
        };

        if (coordenadas) {
            console.log(`✅ Coordenadas obtenidas: ${coordenadas.lat}, ${coordenadas.lon}`);
            broadcastLog(`✅ Coordenadas obtenidas: ${coordenadas.lat}, ${coordenadas.lon}`, 'success');

            // Validar coordenadas después de obtenerlas
            const erroresCoordenadas = validarCoordenadas(coordenadas.lat, coordenadas.lon);

            if (erroresCoordenadas.length > 0) {
                console.warn(`⚠️ Coordenadas fuera de rango:`);
                erroresCoordenadas.forEach(err => {
                    console.warn(`   - ${err.mensaje}`);
                    broadcastLog(`⚠️ ${err.mensaje}`, 'warning');
                });
            }
        } else if (tipoEstacion !== "Estacion Movil") {
            console.warn(`⚠️ No se pudieron obtener coordenadas para ${municipio}`);
            broadcastLog(`⚠️ No se pudieron obtener coordenadas para ${municipio}`, 'warning');
        }

        // Contar correcciones al final
        if (validacion.advertencias.length > 0) {
            corregidas++;
        }

        // Verificar si ya existe la estación antes de intentar insertar
        const yaExiste = await existeEstacion(nombre, localidadId);
        if (yaExiste) {
            console.log(`⚠️ Estación "${nombre}" ya existe en la base de datos, omitiendo inserción\n`);
            broadcastLog(`⚠️ Estación "${nombre}" ya existe, omitida`, 'warning');
            rechazadas++;
            continue;
        }

        // Intentar insertar - Si falla por duplicado, manejar el error
        const { error } = await supabase.from("estacion").insert(estacionData);
        if (error) {
            // Si es un error de duplicado, solo advertir y continuar
            if (error.message.includes('duplicate') || error.code === '23505') {
                console.log(`⚠️ Estación "${nombre}" duplicada detectada durante inserción, omitiendo\n`);
                broadcastLog(`⚠️ Estación "${nombre}" duplicada, omitida`, 'warning');
                rechazadas++;
            } else {
                console.error("❌ Error insertando estación CV:", error.message);
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
    console.log(`📊 RESUMEN COMUNIDAD VALENCIANA - PRUEBA`);
    console.log(`${"=".repeat(80)}`);
    console.log(`✅ Estaciones cargadas: ${cargadas}`);
    console.log(`✏️  Estaciones con correcciones: ${corregidas}`);
    console.log(`❌ Estaciones rechazadas: ${rechazadas}`);
    console.log(`📝 Total procesadas: ${estaciones.length}`);
    console.log(`${"=".repeat(80)}\n`);
    
    broadcastLog(`📊 RESUMEN COMUNIDAD VALENCIANA`, 'info');
    broadcastLog(`✅ Estaciones cargadas: ${cargadas}`, 'success');
    broadcastLog(`✏️ Estaciones con correcciones: ${corregidas}`, 'info');
    broadcastLog(`❌ Estaciones rechazadas: ${rechazadas}`, 'warning');
    broadcastLog(`📝 Total procesadas: ${estaciones.length}`, 'info');
}
