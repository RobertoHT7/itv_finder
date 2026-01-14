import { TipoEstacion } from "./database.types";

// Tipo extendido de estación con relaciones (usado en búsquedas)
export interface EstacionConRelaciones {
    id: number;
    nombre: string;
    tipo: TipoEstacion;
    direccion: string;
    codigo_postal: string;
    latitud: number;
    longitud: number;
    descripcion: string;
    url: string;
    horario: string;
    contacto: string;
    localidadId: number;
    localidad: {
        id: number;
        nombre: string;
        provinciaId: number;
        provincia: {
            id: number;
            nombre: string;
        };
    };
}

// Respuesta de búsqueda de estaciones
export interface BusquedaEstacionesResponse {
    total: number;
    estaciones: EstacionConRelaciones[];
}

// Estadísticas de carga
export interface EstadisticasCarga {
    comunidad_valenciana: number;
    galicia: number;
    cataluna: number;
    total: number;
}

export interface EstadisticasCargaResponse {
    estadisticas: EstadisticasCarga;
    timestamp: string;
}

// Respuesta de carga de datos
export interface CargaResponse {
    success: boolean;
    message: string;
    source?: string;
}

// Respuesta de limpiar base de datos
export interface LimpiarResponse {
    message: string;
}

// Filtros de búsqueda
export interface FiltrosBusqueda {
    provincia?: string;
    localidad?: string;
    tipo?: TipoEstacion;
    lat?: number;
    lon?: number;
    radio?: number;
}

// Log de SSE (Server-Sent Events)
export interface LogMessage {
    message: string;
    timestamp?: number;
    level?: 'info' | 'success' | 'error' | 'warning' | 'separator';
}

// Estado de carga (para UI)
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Error de API
export interface ApiError {
    error: string;
    details?: string;
}
