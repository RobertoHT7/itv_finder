import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { validarDatosEstacion, type EstacionInsert, type TipoEstacion } from "../../../shared/types";

export async function loadCATData() {
    const filePath = path.join(__dirname, "../../data/ITV-CAT.xml");
    const xml = fs.readFileSync(filePath, "utf-8");
    const json = await parseStringPromise(xml);

    // Ajuste al path correcto del XML proporcionado
    const estaciones = json.response?.row?.[0]?.row || [];

    console.log(`🔄 Cargando ${estaciones.length} estaciones de Cataluña...`);

    for (const est of estaciones) {
        // Acceso a campos XML (vienen como arrays de 1 elemento)
        const denominacio = est.denominaci?.[0];
        const municipi = est.municipi?.[0];
        const provincia = est.serveis_territorials?.[0];
        const operador = est.operador?.[0];

        if (!municipi || !provincia) continue;

        const provinciaId = await getOrCreateProvincia(provincia);
        if (!provinciaId) continue;

        const localidadId = await getOrCreateLocalidad(municipi, provinciaId);
        if (!localidadId) continue;

        // 1. Transformación de TIPO (Mapping Page 4: Asignar valor fijo "Estación_fija")
        const tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Estacion Fija";

        // 2. Coordenadas (Dividir por 1e6)
        const latitud = est.lat?.[0] ? parseFloat(est.lat[0]) / 1e6 : 0;
        const longitud = est.long?.[0] ? parseFloat(est.long[0]) / 1e6 : 0;

        // 3. Transformación de DESCRIPCIÓN
        // "Juntar estos 3 campos XML: denominaci + " - " + municipi + " (" + operador + ")"
        const descripcion = `${denominacio} - ${municipi} (${operador})`;

        // 4. Transformación de CONTACTO
        // "Si empieza por https: -> Reemplazar por URL específica"
        let contacto = est.correu_electr_nic?.[0] || "Sin contacto";
        if (contacto.startsWith("https") || contacto.startsWith("http")) {
            contacto = "https://www.applusiteuve.com/es-es/contacto-itv-responde/itv-responde/";
        }

        const estacionData: EstacionInsert = {
            nombre: denominacio || "Sin nombre",
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
            console.error(`❌ Datos inválidos para ${est.denominaci?.[0]}:`, errores);
            continue;
        }

        const { error } = await supabase.from("estacion").insert(estacionData as any);
        if (error) console.error("❌ Error insertando CAT:", error.message);
    }

    console.log("✅ Datos de Cataluña cargados correctamente");
}