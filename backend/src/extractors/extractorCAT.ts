import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad, existeEstacion } from "../utils/dbHelpers";
import { validarYCorregirEstacion } from "../utils/validator";
import { broadcastLog } from "../api/sseLogger";
import { getDatosCAT, EstacionCATSource } from "../wrappers/wrapperCAT";

// Función vital para normalizar coordenadas de CAT (que a veces vienen multiplicadas por 10^n)
function normalizarCoordenada(valor: number, esLatitud: boolean): number {
    if (valor === 0) return 0;

    const rangoLat = { min: 27, max: 44 };
    const rangoLon = { min: -19, max: 5 };
    const rango = esLatitud ? rangoLat : rangoLon;

    const signo = valor < 0 ? -1 : 1;
    const valorAbs = Math.abs(valor);

    const divisores = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000];

    for (const divisor of divisores) {
        const resultado = (valorAbs / divisor) * signo;
        if (resultado >= rango.min && resultado <= rango.max) {
            return resultado;
        }
    }

    // Si no encaja en ningún rango válido de España, asumimos error y devolvemos 0
    return 0;
}

export async function loadCATData(dataFolder: string = "data/entrega2") {
    const sourceName = dataFolder.includes("entrega1") ? "ENTREGA 1" :
        dataFolder.includes("entrega2") ? "ENTREGA 2" :
            dataFolder.includes("completo") ? "COMPLETO" : "PRODUCCIÓN";

    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔄 [CATALUÑA - ${sourceName}] Iniciando proceso ETL...`);
    broadcastLog(`Iniciando carga de Cataluña (${sourceName})...`, 'info');

    let estaciones: EstacionCATSource[] = [];

    // 1. EXTRACCIÓN (Llamada al Wrapper)
    try {
        estaciones = await getDatosCAT(dataFolder);
    } catch (error: any) {
        console.error("❌ Error fatal en el wrapper CAT:", error.message);
        broadcastLog(`Error fatal al leer fuente CAT: ${error.message}`, 'error');
        return;
    }

    console.log(`📥 Procesando ${estaciones.length} estaciones obtenidas del wrapper.`);

    let cargadas = 0;
    let rechazadas = 0;
    let corregidas = 0;

    // 2. TRANSFORMACIÓN Y CARGA
    for (const est of estaciones) {
        const denominacio = est.denominaci;
        const municipi = est.municipi;
        const provinciaRaw = est.serveis_territorials;
        const operador = est.operador;

        // Limpieza específica de CAT: Extraer nombre de provincia limpio
        // Ej: "Serveis Territorials de Tarragona" → "Tarragona"
        let provincia = provinciaRaw;
        if (provinciaRaw && provinciaRaw.includes(" de ")) {
            const partes = provinciaRaw.split(" de ");
            provincia = partes[partes.length - 1].trim();
        }

        if (!municipi || !provincia) {
            console.warn("⚠️ Registro incompleto (falta municipio o provincia), saltando...");
            rechazadas++;
            continue;
        }

        // Normalización de Coordenadas
        const latRaw = parseFloat(est.lat);
        const lonRaw = parseFloat(est.long);
        const latitud = isNaN(latRaw) ? 0 : normalizarCoordenada(latRaw, true);
        const longitud = isNaN(lonRaw) ? 0 : normalizarCoordenada(lonRaw, false);
        const cp = est.cp;

        // Preparar objeto genérico para validación
        const datosParaValidar = {
            denominaci: denominacio,
            municipi: municipi,
            provincia: provincia,
            cp: cp,
            latitud: latitud,
            longitud: longitud
        };

        // VALIDAR Y CORREGIR
        const validacion = validarYCorregirEstacion(datosParaValidar, "Cataluña");

        if (!validacion.esValido) {
            rechazadas++;
            // Solo logueamos errores críticos si quieres depurar, para no ensuciar la consola
            // console.log(`⛔ Rechazada: ${denominacio} (${municipi})`);
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

        const localidadId = await getOrCreateLocalidad(datos.MUNICIPIO || municipi, provinciaId);
        if (!localidadId) {
            rechazadas++;
            broadcastLog(`Error gestionando localidad: ${municipi}`, 'error');
            continue;
        }

        // Transformación de CAMPOS FINALES
        const tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Estacion Fija"; // En CAT casi todas lo son según el XML
        const descripcion = `${denominacio} - ${municipi} (${operador})`;
        const nombre = `ITV de ${municipi}`; // Estandarizamos el nombre

        // Limpieza de contacto (algunos traen URLs en vez de emails)
        let contacto = est.correu_electr_nic;
        if (contacto.startsWith("http")) {
            contacto = "https://www.applusiteuve.com/es-es/contacto-itv-responde/itv-responde/";
        }

        const estacionData = {
            nombre: nombre,
            tipo: tipoEstacion,
            direccion: est.adre_a || "Sin dirección",
            codigo_postal: String(datos["C.POSTAL"]),
            latitud,
            longitud,
            descripcion: descripcion,
            horario: est.horari_de_servei || "No especificado",
            contacto: contacto,
            url: est.web || "https://itv.cat",
            localidadId,
        };

        // Comprobación de duplicados
        const existe = await existeEstacion(nombre, localidadId);

        if (existe) {
            console.log(`⚠️ Estación "${nombre}" ya existe, omitiendo.`);
            broadcastLog(`Estación duplicada omitida: ${nombre}`, 'warning');
            rechazadas++;
        } else {
            const { error } = await supabase.from("estacion").insert(estacionData);
            if (error) {
                console.error("❌ Error insertando CAT:", error.message);
                broadcastLog(`Error BD insertando ${nombre}: ${error.message}`, 'error');
                rechazadas++;
            } else {
                cargadas++;
                console.log(`✅ Insertada: ${nombre}`);
            }
        }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 RESUMEN FINAL - CATALUÑA`);
    console.log(`${"=".repeat(80)}`);
    console.log(`✅ Cargadas: ${cargadas}`);
    console.log(`✏️  Corregidas: ${corregidas}`);
    console.log(`❌ Rechazadas/Omitidas: ${rechazadas}`);
    console.log(`📝 Total procesadas: ${estaciones.length}`);
    console.log(`${"=".repeat(80)}\n`);

    broadcastLog(`Carga Cataluña finalizada. Cargadas: ${cargadas}, Rechazadas: ${rechazadas}`, 'success');
}