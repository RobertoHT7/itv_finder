/**
 * Cliente HTTP base para todas las llamadas a la API
 * Proporciona funcionalidad común como manejo de errores, headers, etc.
 */

import type { ApiError } from '@shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Método GET genérico
     */
    async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        // Agregar parámetros de búsqueda si existen
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.append(key, value);
                }
            });
        }

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error: ApiError = await response.json().catch(() => ({
                    error: `HTTP error ${response.status}: ${response.statusText}`,
                }));
                throw new Error(error.error || `HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Error desconocido al realizar la petición GET');
        }
    }

    /**
     * Método POST genérico
     */
    async post<T>(endpoint: string, body?: unknown): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                const error: ApiError = await response.json().catch(() => ({
                    error: `HTTP error ${response.status}: ${response.statusText}`,
                }));
                throw new Error(error.error || `HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Error desconocido al realizar la petición POST');
        }
    }

    /**
     * Método DELETE genérico
     */
    async delete<T>(endpoint: string): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error: ApiError = await response.json().catch(() => ({
                    error: `HTTP error ${response.status}: ${response.statusText}`,
                }));
                throw new Error(error.error || `HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Error desconocido al realizar la petición DELETE');
        }
    }

    /**
     * Crear una conexión EventSource para Server-Sent Events
     */
    createEventSource(endpoint: string): EventSource {
        const url = `${this.baseUrl}${endpoint}`;
        return new EventSource(url);
    }
}

// Exportar instancia singleton
export const apiClient = new ApiClient();
