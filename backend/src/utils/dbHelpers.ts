import { supabase } from "../db/supabaseClient";
import { TablesInsert } from "../../types/supabase";

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

    if (found) return found.id;

    const provinciaData: TablesInsert<"provincia"> = {
        nombre: nombreNorm
    };

    const { data: created, error: insertError } = await supabase
        .from("provincia")
        .insert(provinciaData)
        .select("id")
        .single();

    if (insertError) {
        console.error("Error creando provincia:", insertError.message);
        return null;
    }

    return created.id;
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

    if (found) return found.id;

    const localidadData: TablesInsert<"localidad"> = {
        nombre: nombreNorm,
        provinciaId
    };

    const { data: created, error: insertError } = await supabase
        .from("localidad")
        .insert(localidadData)
        .select("id")
        .single();

    if (insertError) {
        console.error("Error creando localidad:", insertError.message);
        return null;
    }

    return created.id;
}
