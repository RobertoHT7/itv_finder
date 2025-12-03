import * as readline from "readline";
import { obtenerEstadisticas, baseDeDatosVacia } from "./estadisticas";
import { limpiarBaseDeDatos } from "./limpiar";
import { cargarTodosLosDatos, cargarCATData, cargarCVData, cargarGALData } from "./carga";
import { cargarTodosLosDatosPrueba, cargarCATDataPrueba, cargarCVDataPrueba, cargarGALDataPrueba } from "./carga_prueba";
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
    console.log("\n==============================================");
    console.log("     MENU ADMINISTRACION ITV FINDER");
    console.log("==============================================\n");
    console.log("1. Ver estadisticas de la base de datos");
    console.log("2. Cargar datos (ETL completo)");
    console.log("3. Limpiar base de datos");
    console.log("4. Salir\n");
}

/**
 * Realiza una consulta de estaciones
 */
async function consultarEstaciones() {
    console.log("\nConsultar Estaciones ITV");
    console.log("==============================\n");
    console.log("1. Buscar por provincia");
    console.log("2. Buscar por localidad");
    console.log("3. Listar todas las estaciones");
    console.log("4. Volver al menu principal\n");

    const opcion = await pregunta("Selecciona una opcion: ");

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
            console.log("Opcion no valida");
    }
}

/**
 * Busca estaciones por provincia
 */
async function buscarPorProvincia() {
    const provincia = await pregunta("\nIntroduce el nombre de la provincia: ");

    const { data: provinciaData, error: errorProvincia } = await supabase
        .from("provincia")
        .select("id, nombre")
        .ilike("nombre", `%${provincia}%`)
        .single();

    if (errorProvincia || !provinciaData) {
        console.log("Provincia no encontrada");
        return;
    }

    console.log(`\nProvincia: ${provinciaData.nombre}\n`);

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
        console.log("Error al buscar estaciones");
        return;
    }

    console.log(`Se encontraron ${estaciones.length} estaciones:\n`);
    estaciones.forEach((est: any, index) => {
        console.log(`${index + 1}. ${est.nombre}`);
        console.log(`   Direccion: ${est.direccion}`);
        console.log(`   Tipo: ${est.tipo}\n`);
    });
}

/**
 * Busca estaciones por localidad
 */
async function buscarPorLocalidad() {
    const localidad = await pregunta("\nIntroduce el nombre de la localidad: ");

    const { data: localidadData, error: errorLocalidad } = await supabase
        .from("localidad")
        .select("id, nombre, provincia:provincia(nombre)")
        .ilike("nombre", `%${localidad}%`)
        .single();

    if (errorLocalidad || !localidadData) {
        console.log("Localidad no encontrada");
        return;
    }

    console.log(`\nLocalidad: ${localidadData.nombre}`);
    console.log(`Provincia: ${(localidadData.provincia as any).nombre}\n`);

    const { data: estaciones, error: errorEstaciones } = await supabase
        .from("estacion")
        .select("id, nombre, direccion, tipo, horario, contacto")
        .eq("localidadId", localidadData.id);

    if (errorEstaciones || !estaciones) {
        console.log("Error al buscar estaciones");
        return;
    }

    console.log(`Se encontraron ${estaciones.length} estaciones:\n`);
    estaciones.forEach((est, index) => {
        console.log(`${index + 1}. ${est.nombre}`);
        console.log(`   Direccion: ${est.direccion}`);
        console.log(`   Tipo: ${est.tipo}`);
        console.log(`   Horario: ${est.horario}`);
        console.log(`   Contacto: ${est.contacto}\n`);
    });
}

/**
 * Lista todas las estaciones (con límite)
 */
async function listarTodasLasEstaciones() {
    const limite = await pregunta("\nCuantas estaciones quieres ver? (max 50): ");
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
        console.log("Error al listar estaciones");
        return;
    }

    console.log(`\nMostrando ${estaciones.length} estaciones:\n`);
    estaciones.forEach((est: any, index) => {
        console.log(`${index + 1}. ${est.nombre}`);
        console.log(`   Direccion: ${est.direccion}`);
        console.log(`   Localidad: ${est.localidad.nombre} (${est.localidad.provincia.nombre})`);
        console.log(`   Tipo: ${est.tipo}\n`);
    });
}

/**
 * Inicia el menú interactivo
 */
export async function iniciarMenu() {
    console.log("\nBienvenido a ITV Finder - Administracion Backend\n");

    // Verificar si hay datos en la base de datos
    const estaVacia = await baseDeDatosVacia();

    if (estaVacia) {
        console.log("La base de datos esta vacia");
        console.log("Se recomienda cargar datos antes de continuar\n");
    } else {
        // Mostrar estadísticas iniciales
        await obtenerEstadisticas();
    }

    // Bucle del menú
    let continuar = true;

    while (continuar) {
        mostrarMenu();
        const opcion = await pregunta("Selecciona una opcion: ");

        switch (opcion) {
            case "1":
                await obtenerEstadisticas();
                break;

            case "2":
                console.log("1. Cargar todos los datos");
                console.log("2. Cargar todos los datos de prueba");
                console.log("3. Cargar datos de prueba de valencia");
                console.log("4. Cargar datos de prueba de cataluña");
                console.log("5. Cargar datos de prueba de galicia");
                const confirmCargar = await pregunta(
                    "\n Que datos quieres cargar?: "
                );
                let confirmContinuar: string;
                switch (confirmCargar) {
                    case "1":
                        console.log("\nCargando los datos (ETL completo)...");

                        await cargarTodosLosDatos();
                        await obtenerEstadisticas();
                        break;
                    case "2":
                        console.log("\nCargando todos los datos de prueba ...");
                        await cargarTodosLosDatosPrueba();

                        await obtenerEstadisticas();
                        break;
                    case "3":
                        console.log("\nCargando los datos de prueba de valencia ...");
                        await cargarCVDataPrueba();
                        break
                    case "4":
                        console.log("\nCargando los datos de prueba de cataluña ...");
                        await cargarCATDataPrueba();
                        break
                    case "5":
                        console.log("\nCargando los datos de prueba de galicia ...");
                        await cargarGALDataPrueba();
                        break

                    default:
                        console.log("\nOpcion no valida. Por favor, selecciona una opcion del 1 al 2.\n");
                }
                break;

            case "3":
                const confirmLimpiar = await pregunta(
                    "\nEstas seguro de que quieres limpiar la base de datos? (s/n): "
                );
                if (confirmLimpiar.toLowerCase() === "s") {
                    await limpiarBaseDeDatos();
                    await obtenerEstadisticas();
                }
                break;

            case "4":
                console.log("\nHasta luego!\n");
                continuar = false;
                rl.close();
                break;

            default:
                console.log("\nOpcion no valida. Por favor, selecciona una opcion del 1 al 4.\n");
        }
    }
}
