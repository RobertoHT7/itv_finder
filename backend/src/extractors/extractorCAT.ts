import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { EstacionInsert, TipoEstacion, validarDatosEstacion } from "../types/estacion.types";

export async function loadCATData() {
    const filePath = path.join(__dirname, "../../data/ITV-CAT.xml");
    const xml = fs.readFileSync(filePath, "utf-8");
    const json = await parseStringPromise(xml);

    const estaciones = json.response?.row || []; // estructura del XML de Cataluña

    console.log(`🔄 Cargando ${estaciones.length} estaciones de Cataluña...`);

    for (const estWrapper of estaciones) {
        const est = estWrapper.row?.[0]; // cada estación está envuelta en otro objeto row
        if (!est) continue;

        const municipio = est.municipi?.[0];
        const provincia = est.serveis_territorials?.[0];

        if (!municipio || !provincia) {
            console.warn("⚠️  Estación sin municipio o provincia, saltando...");
            continue;
        }

        const provinciaId = await getOrCreateProvincia(provincia);
        if (!provinciaId) continue;

        const localidadId = await getOrCreateLocalidad(municipio, provinciaId);
        if (!localidadId) continue;

        const tipoEstacion: TipoEstacion =
            est.estaci?.[0]?.startsWith("M") ? "estacion_movil" : "estacion_fija";

        // Las coordenadas vienen multiplicadas por 1e6
        const latitud = est.lat?.[0] ? parseFloat(est.lat[0]) / 1e6 : 0;
        const longitud = est.long?.[0] ? parseFloat(est.long[0]) / 1e6 : 0;

        const estacionData: EstacionInsert = {
            nombre: est.denominaci?.[0] || "Sin nombre",
            tipo: tipoEstacion,
            tipo_estacion: tipoEstacion,
            direccion: est.adre_a?.[0] || "Sin dirección",
            codigo_postal: est.cp?.[0] || "00000",
            latitud,
            longitud,
            descripcion: `${est.denominaci?.[0]} - ${municipio} (${est.operador?.[0]})`,
            horario: est.horari_de_servei?.[0] || "No especificado",
            contacto: est.correu_electr_nic?.[0] || "Sin contacto",
            url: est.web?.[0]?.$.url || "https://itv.cat",
            localidadId,
        };

        // Validar datos antes de insertar
        const errores = validarDatosEstacion(estacionData);
        if (errores.length > 0) {
            console.error(`❌ Datos inválidos para ${est.denominaci?.[0]}:`, errores);
            continue;
        }

        const { error } = await supabase.from("estacion").insert(estacionData);
        if (error) console.error("❌ Error insertando CAT:", error.message, est.denominaci?.[0]);
    }

    console.log("✅ Datos de Cataluña cargados correctamente");
}
