import { supabase } from "../db/supabaseClient";
import type { ProvinciaInsert, LocalidadInsert, Provincia, Localidad } from "../../../shared/types";

/**
 * Inserta una provincia si no existe y devuelve su id
 */
export async function getOrCreateProvincia(nombre: string): Promise<number | null> {
    const nombreNorm = nombre.trim();

    const { data: found, error: findError } = await supabase
        .from("provincia")
        .select("id")
        .eq("nombre", nombreNorm)
        .maybeSingle();

    if (findError) {
        console.error("Error buscando provincia:", findError.message);
        return null;
    }

    if (found) return (found as Provincia).id;

    const provinciaData: ProvinciaInsert = {
        nombre: nombreNorm
    };

    const { data: created, error: insertError } = await supabase
        .from("provincia")
        .insert(provinciaData as any)
        .select("id")
        .single();

    if (insertError) {
        console.error("Error creando provincia:", insertError.message);
        return null;
    }

    return (created as Provincia).id;
}

/**
 * Inserta una localidad si no existe y devuelve su id
 */
export async function getOrCreateLocalidad(nombre: string, provinciaId: number): Promise<number | null> {
    const nombreNorm = nombre.trim();

    const { data: found, error: findError } = await supabase
        .from("localidad")
        .select("id")
        .eq("nombre", nombreNorm)
        .eq("provinciaId", provinciaId)
        .maybeSingle();

    if (findError) {
        console.error("Error buscando localidad:", findError.message);
        return null;
    }

    if (found) return (found as Localidad).id;

    const localidadData: LocalidadInsert = {
        nombre: nombreNorm,
        provinciaId
    };

    const { data: created, error: insertError } = await supabase
        .from("localidad")
        .insert(localidadData as any)
        .select("id")
        .single();

    if (insertError) {
        console.error("Error creando localidad:", insertError.message);
        return null;
    }

    return (created as Localidad).id;
}

/**
 * Verifica si ya existe una estación con el mismo nombre (case-insensitive) 
 * y localidad_id en la base de datos
 */
export async function existeEstacion(nombre: string, localidadId: number): Promise<boolean> {
    const nombreNorm = nombre.trim();

    const { data: estaciones, error } = await supabase
        .from("estacion")
        .select("id, nombre")
        .eq("localidadId", localidadId);

    if (error) {
        console.error("Error verificando estación existente:", error.message);
        return false;
    }

    if (!estaciones || estaciones.length === 0) {
        return false;
    }

    // Comparar nombres ignorando mayúsculas/minúsculas y normalizando caracteres especiales
    const normalizar = (str: string) => str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nombreBuscado = normalizar(nombreNorm);

    const existe = estaciones.some(est => normalizar(est.nombre) === nombreBuscado);

    if (existe) {
        console.log(`🔍 Duplicado detectado: "${nombreNorm}" ya existe en localidad ${localidadId}`);
    }

    return existe;
}
