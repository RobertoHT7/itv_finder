import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { EstacionInsert, validarDatosEstacion } from "../../../shared/types";
import { validarEstacionCompleta, validarCoordenadas } from "../utils/validator";

export async function loadCATDataPrueba() {
    const filePath = path.join(__dirname, "../../data_prueba/ITV-CAT.xml");
    const xml = fs.readFileSync(filePath, "utf-8");
    const json = await parseStringPromise(xml);

    const estaciones = json.response?.row?.[0]?.row || [];

    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔄 [CATALUÑA - PRUEBA] Procesando ${estaciones.length} estaciones`);
    console.log(`${"=".repeat(80)}\n`);

    let estacionesValidas = 0;
    let estacionesInvalidas = 0;

    for (const est of estaciones) {
        // 🔍 PASO 1: VALIDACIÓN PREVIA DE DATOS CRUDOS
        const resultadoValidacion = validarEstacionCompleta(est, "Cataluña");

        if (!resultadoValidacion.esValido) {
            estacionesInvalidas++;
            console.log(`\n🚫 La estación será RECHAZADA y NO se insertará en la base de datos\n`);
            continue;
        }

        console.log(`\n✅ Estación válida, procediendo al procesamiento e inserción...\n`);

        // 🔍 PASO 2: PROCESAMIENTO DE DATOS VALIDADOS
        const denominacio = est.denominaci?.[0];
        const municipi = est.municipi?.[0];
        const provincia = est.serveis_territorials?.[0];
        const operador = est.operador?.[0];

        if (!municipi || !provincia) continue;

        const provinciaId = await getOrCreateProvincia(provincia);
        if (!provinciaId) continue;

        const localidadId = await getOrCreateLocalidad(municipi, provinciaId);
        if (!localidadId) continue;

        const tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Estacion Fija";

        const latitud = est.lat?.[0] ? parseFloat(est.lat[0]) / 1e6 : 0;
        const longitud = est.long?.[0] ? parseFloat(est.long[0]) / 1e6 : 0;

        // Validar coordenadas parseadas
        const erroresCoordenadas = validarCoordenadas(latitud, longitud);
        if (erroresCoordenadas.length > 0) {
            console.log(`\n⚠️  ADVERTENCIAS DE COORDENADAS:`);
            erroresCoordenadas.forEach(err => {
                console.log(`   - ${err.campo}: ${err.mensaje}`);
            });
        }

        const descripcion = `${denominacio} - ${municipi} (${operador})`;
        const nombre = `ITV de ${municipi}`;

        let contacto = est.correu_electr_nic?.[0] || "Sin contacto";
        if (contacto.startsWith("https") || contacto.startsWith("http")) {
            contacto = "https://www.applusiteuve.com/es-es/contacto-itv-responde/itv-responde/";
        }

        const estacionData: EstacionInsert = {
            nombre: nombre,
            tipo: tipoEstacion,
            direccion: est.adre_a?.[0] || "Sin dirección",
            codigo_postal: est.cp?.[0] || "00000",
            latitud,
            longitud,
            descripcion: descripcion,
            horario: est.horari_de_servei?.[0] || "No especificado",
            contacto: contacto,
            url: est.web?.[0]?.$.url || est.web?.[0] || "https://itv.cat",
            localidadId,
        };

        const errores = validarDatosEstacion(estacionData);
        if (errores.length > 0) {
            console.error(`❌ Datos inválidos para ${denominacio}:`, errores);
            continue;
        }

        const { error } = await supabase.from("estacion").insert(estacionData);
        if (error) {
            console.error("❌ Error insertando CAT:", error.message);
            estacionesInvalidas++;
        } else {
            console.log(`✅ Estación insertada correctamente en la base de datos\n`);
            estacionesValidas++;
        }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 RESUMEN CATALUÑA`);
    console.log(`${"=".repeat(80)}`);
    console.log(`✅ Estaciones válidas insertadas: ${estacionesValidas}`);
    console.log(`❌ Estaciones rechazadas por errores: ${estacionesInvalidas}`);
    console.log(`📋 Total procesadas: ${estaciones.length}`);
    console.log(`${"=".repeat(80)}\n`);
}
