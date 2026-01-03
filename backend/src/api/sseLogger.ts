/**
* Sistema de logs en tiempo real usando Server-Sent Events (SSE)
* Permite a los clientes recibir logs de carga en tiempo real
*/

import { Response } from "express";

// Interfaz para los clientes conectados
interface SSEClient {
    id: string;
    res: Response;
}

// Lista de clientes conectados
const clients: SSEClient[] = [];

/**
 * Agregar un nuevo cliente SSE
 */
export function addSSEClient(res: Response): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx buffering
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORS para SSE
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Enviar comentario inicial para establecer conexión
    res.write(': connected\n\n');

    // Agregar cliente a la lista
    clients.push({ id: clientId, res });

    console.log(`[SSE] Cliente conectado: ${clientId} (Total: ${clients.length})`);

    // Limpiar cuando el cliente se desconecta
    res.on('close', () => {
        removeSSEClient(clientId);
        console.log(`[SSE] Cliente desconectado: ${clientId}`);
    });

    return clientId;
}

/**
 * Remover un cliente SSE
 */
function removeSSEClient(clientId: string): void {
    const index = clients.findIndex(client => client.id === clientId);
    if (index !== -1) {
        clients.splice(index, 1);
    }
}

/**
 * Enviar un mensaje de log a todos los clientes conectados
 */
export function broadcastLog(message: string, level: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    const data = {
        message,
        level,
        timestamp: new Date().toISOString()
    };

    const payload = `data: ${JSON.stringify(data)}\n\n`;

    console.log(`[SSE Backend] Broadcasting to ${clients.length} clients: ${message}`);

    // Enviar a todos los clientes conectados
    clients.forEach(client => {
        try {
            client.res.write(payload);
            console.log(`[SSE Backend] ✓ Enviado a cliente ${client.id}`);
        } catch (error) {
            console.error(`[SSE Backend] ✗ Error enviando a ${client.id}:`, error);
            removeSSEClient(client.id);
        }
    });

    // También loguear en consola del servidor
    console.log(`[${level.toUpperCase()}] ${message}`);
}

/**
 * Obtener número de clientes conectados
 */
export function getConnectedClientsCount(): number {
    return clients.length;
}

/**
 * Cerrar todas las conexiones SSE
 */
export function closeAllSSEConnections(): void {
    clients.forEach(client => {
        try {
            client.res.end();
        } catch (error) {
            console.error(`[SSE] Error cerrando conexión ${client.id}:`, error);
        }
    });
    clients.length = 0;
}
