import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad, existeEstacion } from "../utils/dbHelpers";
import { validarYCorregirEstacionSinCoordenadas, validarCoordenadas } from "../utils/validator";
import { geocodificarConSelenium, delay } from "../utils/geocoding";
import { SELENIUM_CONFIG } from "../utils/seleniumConfig";
import { broadcastLog } from "../api/sseLogger";
// Importamos el wrapper recién creado
import { getDatosCV, EstacionCVSource } from "../wrappers/wrapperCV";
// Longitud del separador visual entre estaciones
const SEPARATOR_LENGTH = 50;
export async function loadCVData(dataFolder: string = "data/entrega2") {
    // Definir el origen para logs
    const sourceName = dataFolder.includes("entrega1") ? "ENTREGA 1" :
        dataFolder.includes("entrega2") ? "ENTREGA 2" :
            dataFolder.includes("completo") ? "COMPLETO" : "PRODUCCIÓN";

    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔄 [CV - ${sourceName}] Iniciando proceso ETL...`);
    broadcastLog('▶️ Cargando datos de Comunidad Valenciana...', 'info');

    let estaciones: EstacionCVSource[] = [];

    // 1. EXTRACCIÓN (Usando el Wrapper)
    try {
        estaciones = await getDatosCV(dataFolder);
    } catch (error: any) {
        console.error("❌ Error fatal en el wrapper CV:", error.message);
        broadcastLog(`Error fatal al leer fuente CV: ${error.message}`, 'error');
        return;
    }

    console.log(`📥 Procesando ${estaciones.length} estaciones obtenidas del wrapper.`);

    let cargadas = 0;
    let rechazadas = 0;
    let corregidas = 0;

    // 2. TRANSFORMACIÓN Y CARGA
    for (const est of estaciones) {
        // VALIDAR Y CORREGIR DATOS (sin coordenadas aún)
        // Usamos la función específica para CV que no requiere lat/lon iniciales
        const validacion = validarYCorregirEstacionSinCoordenadas(est, "Comunidad Valenciana");

        if (!validacion.esValido) {
            rechazadas++;
            console.log(`⛔ Estación rechazada por errores críticos: ${est["MUNICIPIO"]} (${est["Nº ESTACIÓN"]})`);
            broadcastLog(`Estación rechazada: ${est["MUNICIPIO"] || 'Desconocida'}`, 'error');
            continue;
        }

        // Usar datos corregidos
        const datos = validacion.datosCorregidos;

        // Mapeo de campos corregidos
        const rawTipo = datos["TIPO ESTACIÓN"] || est["TIPO ESTACIÓN"] || "";
        const municipio = datos.MUNICIPIO || datos.PROVINCIA; // Fallback
        let codigoPostal = datos["C.POSTAL"];

        // Gestión de Provincia y Localidad en BD
        const provinciaId = await getOrCreateProvincia(datos.PROVINCIA);
        if (!provinciaId) {
            rechazadas++;
            broadcastLog(`Error gestionando provincia: ${datos.PROVINCIA}`, 'error');
            continue;
        }

        const localidadId = await getOrCreateLocalidad(municipio, provinciaId);
        if (!localidadId) {
            rechazadas++;
            broadcastLog(`Error gestionando localidad: ${municipio}`, 'error');
            continue;
        }

        // Transformación de TIPO 
        let tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Otros";
        if (rawTipo.includes("Fija")) tipoEstacion = "Estacion Fija";
        else if (rawTipo.includes("Móvil") || rawTipo.includes("Movil")) tipoEstacion = "Estacion Movil";
        else tipoEstacion = "Otros";

        // Transformación de NOMBRE y DESCRIPCIÓN
        const nombre = `Estación ITV de ${municipio}`;
        const descripcion = `Estación ITV ${municipio} con código: ${est["Nº ESTACIÓN"]}`;

        // Comprobación de duplicados antes de geocodificar e insertar
        const existe = await existeEstacion(nombre, localidadId);

        if (existe) {
            console.log(`⚠️ Estación "${nombre}" ya existe en localidad ${localidadId}, omitiendo.`);
            broadcastLog(`🔴 Estación duplicada omitida: ${nombre}`, 'warning');
            broadcastLog('='.repeat(SEPARATOR_LENGTH), 'separator');
            rechazadas++;
            continue;
        }

        // 3. GEOCODIFICACIÓN (Selenium)
        // Solo geocodificamos estaciones FIJAS (las móviles y agrícolas/otros no tienen ubicación fija)
        let latitud = 0;
        let longitud = 0;

        if (tipoEstacion === "Estacion Fija") {
            console.log(`📍 Geocodificando con Selenium: ${municipio}...`);
            broadcastLog(`📍 Geocodificando: ${municipio}...`, 'info');

            const coordenadas = await geocodificarConSelenium(
                est["DIRECCIÓN"] || "",
                municipio,
                datos.PROVINCIA,
                String(codigoPostal)
            );

            if (coordenadas) {
                console.log(`✅ Coordenadas obtenidas: ${coordenadas.lat}, ${coordenadas.lon}`);
                broadcastLog(`✅ Coordenadas obtenidas`, 'success');

                // Validar coordenadas después de obtenerlas
                const erroresCoordenadas = validarCoordenadas(coordenadas.lat, coordenadas.lon);

                if (erroresCoordenadas.length > 0) {
                    console.warn(`⚠️ Coordenadas fuera de rango para ${municipio}:`);
                    erroresCoordenadas.forEach(err => console.warn(`   - ${err.mensaje}`));
                    latitud = 0;
                    longitud = 0;
                } else {
                    latitud = coordenadas.lat;
                    longitud = coordenadas.lon;
                }
            } else {
                console.warn(`⚠️ No se pudieron obtener coordenadas para ${municipio}`);
                broadcastLog(`⚠️ No se obtuvieron coordenadas para ${municipio}`, 'warning');
            }

            // Pequeño delay para no saturar Google Maps/Selenium
            await delay(SELENIUM_CONFIG.DELAY_BETWEEN_REQUESTS || 1000);
        } else {
            // Estación móvil o agrícola: no geocodificar
            console.log(`ℹ️ Estación ${tipoEstacion} "${nombre}" - No se geocodifica (sin ubicación fija)`);
            broadcastLog(`ℹ️ Estación ${tipoEstacion} - No requiere geocodificación`, 'info');
            codigoPostal = null;
        }

        // Preparar objeto final para Supabase
        const estacionData = {
            nombre: nombre,
            tipo: tipoEstacion,
            direccion: est["DIRECCIÓN"] || "Sin dirección",
            codigo_postal: String(codigoPostal),
            latitud: latitud,
            longitud: longitud,
            descripcion: descripcion,
            horario: est.HORARIOS || "No especificado",
            contacto: est.CORREO || "Sin contacto",
            url: "https://sitval.com/", // URL genérica para CV
            localidadId,
        };

        const { error } = await supabase.from("estacion").insert(estacionData);
        if (error) {
            console.error("❌ Error insertando estación:", error.message);
            broadcastLog(`❌ Error BD insertando ${nombre}: ${error.message}`, 'error');
            rechazadas++;
        } else {
            cargadas++;
            console.log(`✅ Insertada: ${nombre}`);
            broadcastLog(`⭐ ${nombre} añadida correctamente`, 'success');
        }

        // Separador entre estaciones
        broadcastLog('='.repeat(SEPARATOR_LENGTH), 'separator');

        // Contar correcciones
        if (validacion.advertencias.length > 0) {
            corregidas++;
        }
    }

    // Resumen final
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 RESUMEN FINAL - COMUNIDAD VALENCIANA`);
    console.log(`${"=".repeat(80)}`);
    console.log(`✅ Cargadas: ${cargadas}`);
    console.log(`✏️  Corregidas: ${corregidas}`);
    console.log(`❌ Rechazadas/Omitidas: ${rechazadas}`);
    console.log(`📝 Total procesadas: ${estaciones.length}`);
    console.log(`${"=".repeat(80)}\n`);

    broadcastLog(`🟢 Comunidad Valenciana completada. Cargadas: ${cargadas}✅, Rechazadas: ${rechazadas}❌`, 'success');
}