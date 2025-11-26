import fs from "fs";
import path from "path";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { validarDatosEstacion, EstacionInsert } from "../../../shared/types";
import { geocodificarDireccionSelenium, delay, cerrarNavegador } from "../utils/geocodingSelenium";

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

export async function loadCVDataPrueba() {
    const filePath = path.join(__dirname, "../../data_prueba/estaciones.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const estaciones: EstacionCV[] = JSON.parse(rawData);

    console.log(`🔄 [PRUEBA] Cargando ${estaciones.length} estaciones de Comunidad Valenciana...`);

    for (const est of estaciones) {
        const rawTipo = est["TIPO ESTACIÓN"] || "";
        const municipio = est.MUNICIPIO || est.PROVINCIA || "Desconocido";
        const codigoPostal = est["C.POSTAL"] ? String(est["C.POSTAL"]) : "00000";

        const provinciaId = await getOrCreateProvincia(est.PROVINCIA);
        if (!provinciaId) continue;

        const localidadId = await getOrCreateLocalidad(municipio, provinciaId);
        if (!localidadId) continue;

        let tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Otros";
        if (rawTipo.includes("Fija")) tipoEstacion = "Estacion Fija";
        else if (rawTipo.includes("Móvil") || rawTipo.includes("Movil")) tipoEstacion = "Estacion Movil";
        else tipoEstacion = "Otros";

        let url = "https://sitval.com/centros/";
        if (tipoEstacion === "Estacion Movil") {
            url += "movil";
        } else if (tipoEstacion === "Otros" || rawTipo.includes("Agrícola")) {
            url += "agricola";
        }

        const nombre = `ITV de ${municipio}`;
        const descripcion = `Estación ITV ${municipio} con código: ${est["Nº ESTACIÓN"]}`;

        console.log(`📍 Geocodificando con Selenium: ${municipio}...`);
        const coordenadas = await geocodificarDireccionSelenium(
            est["DIRECCIÓN"] || "",
            municipio,
            est.PROVINCIA,
            codigoPostal
        );

        await delay(500);

        const estacionData: EstacionInsert = {
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
        } else {
            console.warn(`⚠️ No se pudieron obtener coordenadas para ${municipio}`);
        }

        const errores = validarDatosEstacion(estacionData);
        if (errores.length > 0) {
            console.error(`❌ Datos inválidos para ${municipio}:`, errores);
            continue;
        }

        const { error } = await supabase.from("estacion").insert(estacionData);
        if (error) console.error("❌ Error insertando estación CV:", error.message);
    }

    await cerrarNavegador();
    console.log("✅ [PRUEBA] Datos de Comunidad Valenciana cargados correctamente");
}
