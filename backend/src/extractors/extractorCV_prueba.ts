import fs from "fs";
import path from "path";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { validarYCorregirEstacion } from "../utils/validator";
import { geocodificarConSelenium, delay, cerrarNavegador } from "../utils/geocodingSelenium";

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

    let cargadas = 0;
    let rechazadas = 0;
    let corregidas = 0;

    for (const est of estaciones) {
        // 🔍 VALIDACIÓN Y CORRECCIÓN DE DATOS
        const validacion = validarYCorregirEstacion(est, "Comunidad Valenciana");

        if (!validacion.esValido) {
            rechazadas++;
            console.log(`\n🚫 La estación será RECHAZADA por errores críticos\n`);
            continue;
        }

        if (validacion.advertencias.length > 0) {
            corregidas++;
        }

        console.log(`\n✅ Estación validada, procediendo a la geocodificación e inserción...\n`);

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
        } else {
            console.warn(`⚠️ No se pudieron obtener coordenadas para ${municipio}`);
        }

        const { error } = await supabase.from("estacion").insert(estacionData);
        if (error) {
            console.error("❌ Error insertando estación CV:", error.message);
            rechazadas++;
        } else {
            console.log(`✅ Estación insertada correctamente en la base de datos\n`);
            cargadas++;
        }
    }

    await cerrarNavegador();

    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 RESUMEN COMUNIDAD VALENCIANA - PRUEBA`);
    console.log(`${"=".repeat(80)}`);
    console.log(`✅ Estaciones cargadas: ${cargadas}`);
    console.log(`✏️  Estaciones con correcciones: ${corregidas}`);
    console.log(`❌ Estaciones rechazadas: ${rechazadas}`);
    console.log(`📝 Total procesadas: ${estaciones.length}`);
    console.log(`${"=".repeat(80)}\n`);
}
