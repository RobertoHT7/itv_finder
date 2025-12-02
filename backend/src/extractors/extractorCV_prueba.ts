import fs from "fs";
import path from "path";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { validarDatosEstacion, EstacionInsert } from "../../../shared/types";
import { geocodificarConSelenium, delay } from "../utils/geocoding";
import { validarEstacionCompleta } from "../utils/validator";

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

    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔄 [COMUNIDAD VALENCIANA - PRUEBA] Procesando ${estaciones.length} estaciones`);
    console.log(`${"=".repeat(80)}\n`);

    let estacionesValidas = 0;
    let estacionesInvalidas = 0;

    for (const est of estaciones) {
        // 🔍 PASO 1: VALIDACIÓN PREVIA DE DATOS CRUDOS
        const resultadoValidacion = validarEstacionCompleta(est, "Comunidad Valenciana");

        if (!resultadoValidacion.esValido) {
            estacionesInvalidas++;
            console.log(`\n🚫 La estación será RECHAZADA y NO se insertará en la base de datos\n`);
            continue;
        }

        console.log(`\n✅ Estación válida, procediendo a la geocodificación e inserción...\n`);

        // 🔍 PASO 2: PROCESAMIENTO DE DATOS VALIDADOS
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

        let coordenadas: { lat: number; lon: number } | null = null;
        if (tipoEstacion !== "Estacion Movil") {
            console.log(`📍 Geocodificando: ${municipio}...`);
            coordenadas = await geocodificarConSelenium(
                est["DIRECCIÓN"] || "",
                municipio,
                est.PROVINCIA,
                codigoPostal
            );
        } else {
            console.log(`Estación móvil, se omite geocodificación.`);
        }

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
        if (error) {
            console.error("❌ Error insertando estación CV:", error.message);
            estacionesInvalidas++;
        } else {
            console.log(`✅ Estación insertada correctamente en la base de datos\n`);
            estacionesValidas++;
        }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 RESUMEN COMUNIDAD VALENCIANA`);
    console.log(`${"=".repeat(80)}`);
    console.log(`✅ Estaciones válidas insertadas: ${estacionesValidas}`);
    console.log(`❌ Estaciones rechazadas por errores: ${estacionesInvalidas}`);
    console.log(`📋 Total procesadas: ${estaciones.length}`);
    console.log(`${"=".repeat(80)}\n`);
}
