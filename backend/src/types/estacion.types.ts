import { TablesInsert, Enums } from "../../types/supabase";

/**
 * Tipo para los datos de estación que se van a insertar
 */
export type EstacionInsert = TablesInsert<"estacion">;

/**
 * Tipo para los tipos de estación disponibles
 */
export type TipoEstacion = Enums<"TipoEstacion">;

/**
 * Interfaz base para los datos que se extraen de diferentes fuentes
 */
export interface EstacionDataBase {
    nombre: string;
    tipo: TipoEstacion;
    direccion: string;
    codigo_postal: string;
    latitud: number;
    longitud: number;
    descripcion: string;
    horario: string;
    contacto: string;
    url: string;
    municipio: string;
    provincia: string;
}

/**
 * Valida que los datos de la estación sean correctos antes de insertarlos
 */
export function validarDatosEstacion(data: Partial<EstacionInsert>): string[] {
    const errores: string[] = [];

    if (!data.nombre || data.nombre.trim() === "") {
        errores.push("El nombre es obligatorio");
    }

    if (!data.tipo || !["estacion_fija", "estacion_movil", "otros"].includes(data.tipo)) {
        errores.push("El tipo de estación no es válido");
    }

    if (!data.direccion || data.direccion.trim() === "") {
        errores.push("La dirección es obligatoria");
    }

    if (!data.codigo_postal || data.codigo_postal.trim() === "") {
        errores.push("El código postal es obligatorio");
    }

    if (typeof data.latitud !== "number" || isNaN(data.latitud)) {
        errores.push("La latitud debe ser un número válido");
    }

    if (typeof data.longitud !== "number" || isNaN(data.longitud)) {
        errores.push("La longitud debe ser un número válido");
    }

    if (!data.localidadId || data.localidadId <= 0) {
        errores.push("La localidad es obligatoria");
    }

    return errores;
}

/**
 * Normaliza el tipo de estación desde diferentes formatos
 */
export function normalizarTipoEstacion(tipo: string | undefined): TipoEstacion {
    if (!tipo) {
        console.warn("⚠️  Tipo de estación undefined, usando 'otros'");
        return "otros";
    }

    const tipoNorm = tipo.toLowerCase().trim().replaceAll(" ", "_");

    if (tipoNorm.includes("fija") || tipoNorm === "estacion_fija") {
        return "estacion_fija";
    }

    if (tipoNorm.includes("movil") || tipoNorm.includes("móvil") || tipoNorm === "estacion_movil") {
        return "estacion_movil";
    }

    return "otros";
}
