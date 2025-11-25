import fetch from "node-fetch";

interface GeocodeResult {
    lat: number;
    lon: number;
}

/**
 * Limpia y simplifica una dirección para mejorar la geocodificación
 * Elimina números de parcela, polígonos industriales específicos, etc.
 */
function limpiarDireccion(direccion: string): string {
    let limpia = direccion;
    
    // Eliminar "s/n" y "s/nº"
    limpia = limpia.replace(/\bs\/n[ºo]?\b/gi, '');
    
    // Eliminar números de parcela: "Parcela 88", "Parcelas 88 y 89"
    limpia = limpia.replace(/parcelas?\s*\d+(\s*y\s*\d+)?/gi, '');
    
    // Eliminar "Pol. Ind." y el nombre específico del polígono
    limpia = limpia.replace(/pol\.?\s*ind\.?\s*[^,]*/gi, 'Polígono Industrial');
    
    // Eliminar kilómetros: "Km 55", "Km. 55"
    limpia = limpia.replace(/km\.?\s*\d+/gi, '');
    
    // Eliminar comas múltiples y espacios extras
    limpia = limpia.replace(/,\s*,/g, ',');
    limpia = limpia.replace(/\s+/g, ' ');
    limpia = limpia.trim();
    
    return limpia;
}

/**
 * Geocodifica una dirección usando Nominatim (OpenStreetMap)
 * @param direccion - La dirección completa
 * @param municipio - El municipio
 * @param provincia - La provincia
 * @param codigoPostal - El código postal
 * @returns Coordenadas {lat, lon} o null si no se encuentra
 */
export async function geocodificarDireccion(
    direccion: string,
    municipio: string,
    provincia: string,
    codigoPostal: string
): Promise<GeocodeResult | null> {
    try {
        // Limpiar la dirección
        const direccionLimpia = limpiarDireccion(direccion);
        
        // Intentar primero con la dirección limpia
        const query = `${direccionLimpia}, ${municipio}, ${provincia}, España`;
        
        // Nominatim requiere un User-Agent
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ITV-Finder-App/1.0 (contact@itvfinder.com)'
            }
        });

        if (!response.ok) {
            console.warn(`⚠️ Error en geocodificación: ${response.statusText}`);
            return null;
        }

        const data = await response.json() as any[];

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }

        // Si no se encuentra con la dirección, intentar solo con municipio y código postal
        console.log(`🔄 Reintentando con solo municipio: ${municipio}`);
        await delay(1100);
        
        const querySimple = `${municipio}, ${provincia}, ${codigoPostal}, España`;
        const urlSimple = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(querySimple)}&limit=1`;
        
        const responseSimple = await fetch(urlSimple, {
            headers: {
                'User-Agent': 'ITV-Finder-App/1.0 (contact@itvfinder.com)'
            }
        });

        if (responseSimple.ok) {
            const dataSimple = await responseSimple.json() as any[];
            if (dataSimple && dataSimple.length > 0) {
                return {
                    lat: parseFloat(dataSimple[0].lat),
                    lon: parseFloat(dataSimple[0].lon)
                };
            }
        }

        console.warn(`⚠️ No se encontraron coordenadas para: ${municipio}`);
        return null;

    } catch (error) {
        console.error(`❌ Error en geocodificación:`, error);
        return null;
    }
}

/**
 * Añade un delay para respetar rate limits de Nominatim (máx 1 req/sec)
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
