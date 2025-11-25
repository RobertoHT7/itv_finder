import * as readline from "readline";
import { obtenerEstadisticas, baseDeDatosVacia } from "./estadisticas";
import { limpiarBaseDeDatos } from "./limpiar";
import { cargarTodosLosDatos } from "./carga";
import { supabase } from "../db/supabaseClient";

// Interfaz para readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Función auxiliar para hacer preguntas por consola
 */
function pregunta(texto: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(texto, (respuesta) => {
            resolve(respuesta.trim());
        });
    });
}

/**
 * Muestra el menú principal
 */
function mostrarMenu() {
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║     MENÚ ADMINISTRACIÓN ITV FINDER     ║");
    console.log("╚════════════════════════════════════════╝\n");
    console.log("1️⃣  Ver estadísticas de la base de datos");
    console.log("2️⃣  Cargar datos (ETL completo)");
    console.log("3️⃣  Limpiar base de datos");
    console.log("4️⃣  Consultar estaciones");
    console.log("5️⃣  Salir\n");
}

/**
 * Realiza una consulta de estaciones
 */
async function consultarEstaciones() {
    console.log("\n🔍 Consultar Estaciones ITV");
    console.log("═══════════════════════════════\n");
    console.log("1. Buscar por provincia");
    console.log("2. Buscar por localidad");
    console.log("3. Listar todas las estaciones");
    console.log("4. Volver al menú principal\n");

    const opcion = await pregunta("Selecciona una opción: ");

    switch (opcion) {
        case "1":
            await buscarPorProvincia();
            break;
        case "2":
            await buscarPorLocalidad();
            break;
        case "3":
            await listarTodasLasEstaciones();
            break;
        case "4":
            break;
        default:
            console.log("❌ Opción no válida");
    }
}

/**
 * Busca estaciones por provincia
 */
async function buscarPorProvincia() {
    const provincia = await pregunta("\n🔎 Introduce el nombre de la provincia: ");

    const { data: provinciaData, error: errorProvincia } = await supabase
        .from("provincia")
        .select("id, nombre")
        .ilike("nombre", `%${provincia}%`)
        .single();

    if (errorProvincia || !provinciaData) {
        console.log("❌ Provincia no encontrada");
        return;
    }

    console.log(`\n📍 Provincia: ${provinciaData.nombre}\n`);

    const { data: estaciones, error: errorEstaciones } = await supabase
        .from("estacion")
        .select(`
            id,
            nombre,
            direccion,
            tipo,
            localidad:localidad(
                nombre,
                provincia:provincia(nombre)
            )
        `)
        .eq("localidad.provinciaId", provinciaData.id);

    if (errorEstaciones || !estaciones) {
        console.log("❌ Error al buscar estaciones");
        return;
    }

    console.log(`✅ Se encontraron ${estaciones.length} estaciones:\n`);
    estaciones.forEach((est: any, index) => {
        console.log(`${index + 1}. ${est.nombre}`);
        console.log(`   📍 ${est.direccion}`);
        console.log(`   🏷️  ${est.tipo}\n`);
    });
}

/**
 * Busca estaciones por localidad
 */
async function buscarPorLocalidad() {
    const localidad = await pregunta("\n🔎 Introduce el nombre de la localidad: ");

    const { data: localidadData, error: errorLocalidad } = await supabase
        .from("localidad")
        .select("id, nombre, provincia:provincia(nombre)")
        .ilike("nombre", `%${localidad}%`)
        .single();

    if (errorLocalidad || !localidadData) {
        console.log("❌ Localidad no encontrada");
        return;
    }

    console.log(`\n🏘️  Localidad: ${localidadData.nombre}`);
    console.log(`📍 Provincia: ${(localidadData.provincia as any).nombre}\n`);

    const { data: estaciones, error: errorEstaciones } = await supabase
        .from("estacion")
        .select("id, nombre, direccion, tipo, horario, contacto")
        .eq("localidadId", localidadData.id);

    if (errorEstaciones || !estaciones) {
        console.log("❌ Error al buscar estaciones");
        return;
    }

    console.log(`✅ Se encontraron ${estaciones.length} estaciones:\n`);
    estaciones.forEach((est, index) => {
        console.log(`${index + 1}. ${est.nombre}`);
        console.log(`   📍 ${est.direccion}`);
        console.log(`   🏷️  ${est.tipo}`);
        console.log(`   🕐 ${est.horario}`);
        console.log(`   📞 ${est.contacto}\n`);
    });
}

/**
 * Lista todas las estaciones (con límite)
 */
async function listarTodasLasEstaciones() {
    const limite = await pregunta("\n¿Cuántas estaciones quieres ver? (máx 50): ");
    const limiteNum = Math.min(parseInt(limite) || 10, 50);

    const { data: estaciones, error } = await supabase
        .from("estacion")
        .select(`
            id,
            nombre,
            direccion,
            tipo,
            localidad:localidad(
                nombre,
                provincia:provincia(nombre)
            )
        `)
        .limit(limiteNum);

    if (error || !estaciones) {
        console.log("❌ Error al listar estaciones");
        return;
    }

    console.log(`\n✅ Mostrando ${estaciones.length} estaciones:\n`);
    estaciones.forEach((est: any, index) => {
        console.log(`${index + 1}. ${est.nombre}`);
        console.log(`   📍 ${est.direccion}`);
        console.log(`   🏘️  ${est.localidad.nombre} (${est.localidad.provincia.nombre})`);
        console.log(`   🏷️  ${est.tipo}\n`);
    });
}

/**
 * Inicia el menú interactivo
 */
export async function iniciarMenu() {
    console.log("\n🚀 Bienvenido a ITV Finder - Administración Backend\n");

    // Verificar si hay datos en la base de datos
    const estaVacia = await baseDeDatosVacia();

    if (estaVacia) {
        console.log("⚠️  La base de datos está vacía");
        console.log("📥 Se recomienda cargar datos antes de continuar\n");
    } else {
        // Mostrar estadísticas iniciales
        await obtenerEstadisticas();
    }

    // Bucle del menú
    let continuar = true;

    while (continuar) {
        mostrarMenu();
        const opcion = await pregunta("Selecciona una opción: ");

        switch (opcion) {
            case "1":
                await obtenerEstadisticas();
                break;

            case "2":
                const confirmCargar = await pregunta(
                    "\n⚠️  ¿Estás seguro de que quieres cargar datos? (s/n): "
                );
                if (confirmCargar.toLowerCase() === "s") {
                    await cargarTodosLosDatos();
                    await obtenerEstadisticas();
                }
                break;

            case "3":
                const confirmLimpiar = await pregunta(
                    "\n⚠️  ¿Estás seguro de que quieres limpiar la base de datos? (s/n): "
                );
                if (confirmLimpiar.toLowerCase() === "s") {
                    await limpiarBaseDeDatos();
                    await obtenerEstadisticas();
                }
                break;

            case "4":
                await consultarEstaciones();
                break;

            case "5":
                console.log("\n👋 ¡Hasta luego!\n");
                continuar = false;
                rl.close();
                break;

            default:
                console.log("\n❌ Opción no válida. Por favor, selecciona una opción del 1 al 5.\n");
        }
    }
}
