/**
 * Servicio para operaciones de carga de datos
 */

import { apiClient } from './apiClient';
import type {
    CargaResponse,
    EstadisticasCargaResponse,
    LimpiarResponse,
    LogMessage
} from '@shared';

/**
 * Cargar todos los datos (CV + GAL + CAT)
 */
export const cargarTodasLasEstaciones = async (): Promise<CargaResponse> => {
    return apiClient.post<CargaResponse>('/api/carga/all');
};

/**
 * Cargar datos de Comunidad Valenciana
 */
export const cargarEstacionesCV = async (): Promise<CargaResponse> => {
    return apiClient.post<CargaResponse>('/api/carga/cv');
};

/**
 * Cargar datos de Galicia
 */
export const cargarEstacionesGAL = async (): Promise<CargaResponse> => {
    return apiClient.post<CargaResponse>('/api/carga/gal');
};

/**
 * Cargar datos de Cataluña
 */
export const cargarEstacionesCAT = async (): Promise<CargaResponse> => {
    return apiClient.post<CargaResponse>('/api/carga/cat');
};

/**
 * Obtener estadísticas de carga
 */
export const obtenerEstadisticas = async (): Promise<EstadisticasCargaResponse> => {
    return apiClient.get<EstadisticasCargaResponse>('/api/estadisticas');
};

/**
 * Limpiar toda la base de datos
 */
export const limpiarBaseDatos = async (): Promise<LimpiarResponse> => {
    return apiClient.delete<LimpiarResponse>('/api/limpiar');
};

/**
 * Conectar a los logs en tiempo real usando Server-Sent Events
 * 
 * @param onMessage Callback que se ejecuta cuando llega un nuevo log
 * @param onError Callback que se ejecuta cuando hay un error
 * @returns Función para cerrar la conexión
 */
export const connectToLogs = (
    onMessage: (log: LogMessage) => void,
    onError?: (error: Event) => void
): (() => void) => {
    const eventSource = apiClient.createEventSource('/api/carga/logs');

    console.log('[SSE Frontend] Iniciando conexión a /api/carga/logs');

    eventSource.onopen = () => {
        console.log('[SSE Frontend] Conexión establecida exitosamente');
    };

    eventSource.onmessage = (event) => {
        console.log('[SSE Frontend] Mensaje recibido:', event.data);
        try {
            const data = JSON.parse(event.data);
            onMessage({
                message: data.message || data,
                timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
            });
        } catch {
            // Si no es JSON, enviar el mensaje tal cual
            onMessage({
                message: event.data,
                timestamp: Date.now(),
            });
        }
    };

    eventSource.onerror = (error) => {
        console.error('[SSE Frontend] Error en EventSource:', error);
        console.log('[SSE Frontend] Estado de conexión:', eventSource.readyState);
        // Solo notificar del error si el handler existe
        // NO cerrar la conexión automáticamente, dejar que se reconecte
        if (eventSource.readyState === EventSource.CLOSED) {
            console.log('[SSE Frontend] Conexión cerrada permanentemente');
            if (onError) {
                onError(error);
            }
        }
    };

    // Retornar función para cerrar la conexión
    return () => {
        console.log('[SSE Frontend] Cerrando conexión SSE');
        eventSource.close();
    };
};
