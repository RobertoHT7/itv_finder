import fs from "fs";
import path from "path";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { geocodificarConSelenium, delay } from "../utils/geocoding";
import { cerrarNavegador } from "../utils/geocodingSelenium";
import { SELENIUM_CONFIG } from "../utils/seleniumConfig";
import { validarYCorregirEstacion } from "../utils/validator";

interface EstacionCV {
    "TIPO ESTACIÓN": string;
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

    console.log(`\n🔄 Cargando ${estaciones.length} estaciones de Comunidad Valenciana...`);
    
    let cargadas = 0;
    let rechazadas = 0;
    let corregidas = 0;

    for (const est of estaciones) {
        // VALIDAR Y CORREGIR DATOS
        const validacion = validarYCorregirEstacion(est, "Comunidad Valenciana");
        
        if (!validacion.esValido) {
            rechazadas++;
            console.log(`⛔ Estación rechazada por errores críticos\n`);
            continue;
        }

        if (validacion.advertencias.length > 0) {
            corregidas++;
        }

        // Usar datos corregidos
        const datos = validacion.datosCorregidos;
        
        const rawTipo = datos["TIPO ESTACIÓN"] || est["TIPO ESTACIÓN"] || "";
        const municipio = datos.MUNICIPIO || datos.PROVINCIA;
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

        // 2. Transformación de TIPO 
        let tipoEstacion: "Estacion Fija" | "Estacion Movil" | "Otros" = "Otros";
        if (rawTipo.includes("Fija")) tipoEstacion = "Estacion Fija";
        else if (rawTipo.includes("Móvil") || rawTipo.includes("Movil")) tipoEstacion = "Estacion Movil";
        else tipoEstacion = "Otros";

        // 3. Transformación de URL 
        let url = "https://sitval.com/centros/";
        if (tipoEstacion === "Estacion Movil") {
            url += "movil";
        } else if (tipoEstacion === "Otros" || rawTipo.includes("Agrícola")) {
            url += "agricola";
        }

        // 4. Transformación de NOMBRE 
        const nombre = `ITV de ${municipio}`;

        // 5. Transformación de DESCRIPCIÓN 
        const descripcion = `Estación ITV ${municipio} con código: ${est["Nº ESTACIÓN"]}`;

        // 6. Geocodificación de la dirección usando Selenium
        console.log(`📍 Geocodificando con Selenium: ${municipio}...`);
        const coordenadas = await geocodificarConSelenium(
            est["DIRECCIÓN"] || "",
            municipio,
            datos.PROVINCIA,
            codigoPostal
        );

        // Pequeño delay entre peticiones para no sobrecargar
        await delay(SELENIUM_CONFIG.DELAY_BETWEEN_REQUESTS);

        const estacionData = {
            nombre: `ITV ${municipio} ${est["Nº ESTACIÓN"]}`,
            tipo: tipoEstacion,
            direccion: est["DIRECCIÓN"] || "Sin dirección",
            codigo_postal: codigoPostal,
            latitud: coordenadas?.lat || 0,
            longitud: coordenadas?.lon || 0,
            descripcion: descripcion,
            horario: est.HORARIOS || "No especificado",
            contacto: est.CORREO || "Sin contacto",
            url: "https://sitval.com/",
            localidadId,
        };

        if (coordenadas) {
            console.log(`✅ Coordenadas obtenidas: ${coordenadas.lat}, ${coordenadas.lon}`);
        } else {
            console.warn(`⚠️ No se pudieron obtener coordenadas para ${municipio}`);
        }

        const { error } = await supabase.from("estacion").insert(estacionData);
        if (error) {
            console.error("❌ Error insertando estación:", error.message);
            rechazadas++;
        } else {
            cargadas++;
        }
    }

    // Cerrar el navegador de Selenium
    await cerrarNavegador();
    
    console.log("\n" + "=".repeat(70));
    console.log("📊 RESUMEN DE CARGA - COMUNIDAD VALENCIANA");
    console.log("=".repeat(70));
    console.log(`✅ Estaciones cargadas: ${cargadas}`);
    console.log(`✏️  Estaciones con correcciones: ${corregidas}`);
    console.log(`❌ Estaciones rechazadas: ${rechazadas}`);
    console.log(`📝 Total procesadas: ${estaciones.length}`);
    console.log("=".repeat(70) + "\n");
}
