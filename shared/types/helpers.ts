/**
 * Funciones de utilidad y validación para los tipos de base de datos
 */

import { EstacionInsert, TipoEstacion } from "./database.types";

/**
 * Interfaz base para los datos que se extraen de diferentes fuentes
 * Útil para normalizar datos de CSV, JSON, XML antes de insertar
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
 * @param data - Datos parciales de la estación a validar
 * @returns Array de mensajes de error (vacío si todo es válido)
 */
export function validarDatosEstacion(data: Partial<EstacionInsert>): string[] {
    const errores: string[] = [];

    if (!data.nombre || data.nombre.trim() === "") {
        errores.push("El nombre es obligatorio");
    }

    if (!data.tipo || !["estacion_fija", "estacion_movil", "otros", "Estacion Fija", "Estacion Movil", "Otros"].includes(data.tipo)) {
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
 * Convierte variaciones de texto a los valores enum correctos
 * 
 * @param tipo - Texto del tipo de estación en cualquier formato
 * @returns Tipo de estación normalizado
 * 
 * @example
 * normalizarTipoEstacion("Estación Fija") // "estacion_fija"
 * normalizarTipoEstacion("móvil")         // "estacion_movil"
 * normalizarTipoEstacion("OTROS")         // "otros"
 */
export function normalizarTipoEstacion(tipo: string | undefined): TipoEstacion {
    if (!tipo) {
        console.warn("⚠️  Tipo de estación undefined, usando 'Otros'");
        return "Otros";
    }

    const tipoNorm = tipo.toLowerCase().trim().replaceAll(" ", "_");

    if (tipoNorm.includes("fija") || tipoNorm === "Estacion Fija") {
        return "Estacion Fija";
    }

    if (tipoNorm.includes("movil") || tipoNorm.includes("móvil") || tipoNorm === "Estacion Movil") {
        return "Estacion Movil";
    }

    return "Otros";
}
