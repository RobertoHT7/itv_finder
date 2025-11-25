import fs from "fs";
import path from "path";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { normalizarTipoEstacion, validarDatosEstacion, type EstacionInsert } from "../../../shared/types";

interface EstacionCV {
    "TIPO ESTACIÓN": string;  // Nota: Con acento en el JSON original
    PROVINCIA: string;
    MUNICIPIO: string;
    "C.POSTAL": number;
    "DIRECCIÓN": string;
    "Nº ESTACIÓN": number;
    HORARIOS: string;
    CORREO: string;
}

export async function loadCVData() {
    const filePath = path.join(__dirname, "../../data/estaciones.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const estaciones: EstacionCV[] = JSON.parse(rawData);

    console.log(`🔄 Cargando ${estaciones.length} estaciones de Comunidad Valenciana...`);

    for (const est of estaciones) {
        // Las estaciones móviles pueden no tener municipio
        const municipio = est.MUNICIPIO || "Móvil";
        const codigoPostal = est["C.POSTAL"] ? String(est["C.POSTAL"]) : "00000";

        const provinciaId = await getOrCreateProvincia(est.PROVINCIA);
        if (!provinciaId) continue;

        const localidadId = await getOrCreateLocalidad(municipio, provinciaId);
        if (!localidadId) continue;

        const tipoEstacion = normalizarTipoEstacion(est["TIPO ESTACIÓN"]);

        const estacionData: EstacionInsert = {
            nombre: `ITV ${municipio} ${est["Nº ESTACIÓN"]}`,
            tipo: tipoEstacion,
            direccion: est["DIRECCIÓN"] || "Sin dirección",
            codigo_postal: codigoPostal,
            longitud: 0, // podrías añadir geocodificación más adelante
            latitud: 0,
            descripcion: `Estación ITV ${municipio} (nº ${est["Nº ESTACIÓN"]})`,
            horario: est.HORARIOS || "No especificado",
            contacto: est.CORREO || "Sin contacto",
            url: "https://sitval.com/",
            localidadId,
        };

        // Validar datos antes de insertar
        const errores = validarDatosEstacion(estacionData);
        if (errores.length > 0) {
            console.error(`❌ Datos inválidos para ${municipio}:`, errores);
            continue;
        }

        const { error } = await supabase.from("estacion").insert(estacionData as any);
        if (error) console.error("❌ Error insertando estación:", error.message);
    }

    console.log("✅ Datos de Comunidad Valenciana cargados correctamente");
}
