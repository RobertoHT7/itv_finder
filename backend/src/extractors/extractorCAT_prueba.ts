import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { EstacionInsert, validarDatosEstacion } from "../types/estacion.types";

export async function loadCATDataPrueba() {
    const filePath = path.join(__dirname, "../../data_prueba/ITV-CAT.xml");
    const xml = fs.readFileSync(filePath, "utf-8");
    const json = await parseStringPromise(xml);

    const estaciones = json.response?.row?.[0]?.row || [];

    console.log(`🔄 [PRUEBA] Cargando ${estaciones.length} estaciones de Cataluña...`);

    for (const est of estaciones) {
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
        if (error) console.error("❌ Error insertando CAT:", error.message);
    }

    console.log("✅ [PRUEBA] Datos de Cataluña cargados correctamente");
}
