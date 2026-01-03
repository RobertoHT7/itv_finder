/**
 * Servicio para operaciones relacionadas con estaciones ITV
 */

import { apiClient } from './apiClient';
import type {
    BusquedaEstacionesResponse,
    FiltrosBusqueda
} from '@shared';

/**
 * Obtener todas las estaciones
 */
export const getAllEstaciones = async (): Promise<BusquedaEstacionesResponse> => {
    return apiClient.get<BusquedaEstacionesResponse>('/api/estaciones');
};

/**
 * Buscar estaciones con filtros opcionales
 */
export const searchEstaciones = async (
    filtros: FiltrosBusqueda
): Promise<BusquedaEstacionesResponse> => {
    // Convertir filtros a parámetros de URL
    const params: Record<string, string> = {};

    if (filtros.provincia) params.provincia = filtros.provincia;
    if (filtros.localidad) params.localidad = filtros.localidad;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (filtros.lat !== undefined) params.lat = filtros.lat.toString();
    if (filtros.lon !== undefined) params.lon = filtros.lon.toString();
    if (filtros.radio !== undefined) params.radio = filtros.radio.toString();

    return apiClient.get<BusquedaEstacionesResponse>('/api/estaciones', params);
};

/**
 * Obtener wrapper de datos de Comunidad Valenciana (JSON)
 */
export const getWrapperCV = async (): Promise<unknown> => {
    return apiClient.get<unknown>('/api/wrapper/cv');
};

/**
 * Obtener wrapper de datos de Galicia (CSV text)
 */
export const getWrapperGAL = async (): Promise<string> => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/wrapper/gal`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
    }
    return response.text();
};

/**
 * Obtener wrapper de datos de Cataluña (XML text)
 */
export const getWrapperCAT = async (): Promise<string> => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/wrapper/cat`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
    }
    return response.text();
};
