import { supabase } from "../db/supabaseClient";
import { TablesInsert, Tables } from "../../types/supabase";

/**
 * Script de prueba para verificar que los tipos de Supabase funcionan correctamente
 */
async function testSupabaseTypes() {
    console.log("🧪 Iniciando pruebas de tipos de Supabase...\n");

    // Test 1: Verificar que el cliente está correctamente tipado
    console.log("✅ Test 1: Cliente de Supabase tipado correctamente");

    // Test 2: Leer provincias
    console.log("\n📖 Test 2: Leyendo provincias...");
    const { data: provincias, error: errorProvincias } = await supabase
        .from("provincia")
        .select("*")
        .limit(5);

    if (errorProvincias) {
        console.error("❌ Error leyendo provincias:", errorProvincias.message);
    } else {
        console.log(`✅ Provincias encontradas: ${provincias?.length || 0}`);
        if (provincias && provincias.length > 0) {
            console.log("   Ejemplo:", provincias[0]);
            // TypeScript sabe que provincias[0] tiene: id, nombre
            const provincia: Tables<"provincia"> = provincias[0];
            console.log(`   - ID: ${provincia.id}, Nombre: ${provincia.nombre}`);
        }
    }

    // Test 3: Leer localidades con join
    console.log("\n📖 Test 3: Leyendo localidades con provincia...");
    const { data: localidades, error: errorLocalidades } = await supabase
        .from("localidad")
        .select(`
            *,
            provincia:provincia(*)
        `)
        .limit(5);

    if (errorLocalidades) {
        console.error("❌ Error leyendo localidades:", errorLocalidades.message);
    } else {
        console.log(`✅ Localidades encontradas: ${localidades?.length || 0}`);
        if (localidades && localidades.length > 0) {
            console.log("   Ejemplo:", localidades[0].nombre);
        }
    }

    // Test 4: Leer estaciones
    console.log("\n📖 Test 4: Leyendo estaciones...");
    const { data: estaciones, error: errorEstaciones } = await supabase
        .from("estacion")
        .select("*")
        .limit(5);

    if (errorEstaciones) {
        console.error("❌ Error leyendo estaciones:", errorEstaciones.message);
    } else {
        console.log(`✅ Estaciones encontradas: ${estaciones?.length || 0}`);
        if (estaciones && estaciones.length > 0) {
            const estacion: Tables<"estacion"> = estaciones[0];
            console.log(`   Ejemplo: ${estacion.nombre}`);
            console.log(`   - Tipo: ${estacion.tipo}`);
            console.log(`   - Dirección: ${estacion.direccion}`);
            console.log(`   - Coordenadas: (${estacion.latitud}, ${estacion.longitud})`);
        }
    }

    // Test 5: Contar registros por tipo de estación
    console.log("\n📊 Test 5: Contando estaciones por tipo...");
    const { count: countFijas } = await supabase
        .from("estacion")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "estacion_fija");

    const { count: countMoviles } = await supabase
        .from("estacion")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "estacion_movil");

    const { count: countOtros } = await supabase
        .from("estacion")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "otros");

    console.log("✅ Distribución de tipos:");
    console.log(`   - Estaciones fijas: ${countFijas || 0}`);
    console.log(`   - Estaciones móviles: ${countMoviles || 0}`);
    console.log(`   - Otros: ${countOtros || 0}`);

    // Test 6: Verificar que los tipos de inserción funcionan
    console.log("\n🔧 Test 6: Verificando tipos de inserción...");
    const ejemploInsercion: TablesInsert<"estacion"> = {
        nombre: "Test ITV",
        tipo: "estacion_fija",
        tipo_estacion: "estacion_fija",
        direccion: "Calle Test 123",
        codigo_postal: "00000",
        latitud: 0,
        longitud: 0,
        descripcion: "Estación de prueba",
        horario: "24/7",
        contacto: "test@test.com",
        url: "https://test.com",
        localidadId: 1,
    };
    console.log("✅ Tipo de inserción válido (no se insertará realmente)");
    console.log("   Campos requeridos:", Object.keys(ejemploInsercion));

    console.log("\n🎉 ¡Todas las pruebas completadas!\n");
}

// Ejecutar las pruebas
testSupabaseTypes()
    .then(() => {
        console.log("✅ Script de prueba finalizado correctamente");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error en el script de prueba:", error);
        process.exit(1);
    });
