import { Builder, By, WebDriver, Key, until, Browser } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import { SELENIUM_CONFIG } from "./seleniumConfig"; // Asumo que esto existe en tu proyecto

interface GeocodeResult {
    lat: number;
    lon: number;
}

/**
 * Limpia y simplifica una dirección para mejorar la geocodificación
 * Elimina números de parcela, polígonos industriales específicos, etc.
 * (MÉTODO ORIGINAL CONSERVADO)
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
 * Añade un delay
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geocodifica una dirección usando Selenium scrapeando Google Maps.
 * Es más robusto para direcciones de polígonos industriales que Nominatim.
 */
export async function geocodificarConSelenium(
    direccion: string,
    municipio: string,
    provincia: string,
    codigoPostal: string
): Promise<GeocodeResult | null> {
    let driver: WebDriver | null = null;
    try {
        driver = await new Builder().forBrowser(Browser.CHROME).build();
        await driver.get('https://www.google.com/maps?hl=es');

        // 2. Gestionar el banner de cookies (Crítico en España)
        try {
            // Buscamos botones de forma más agresiva. Google suele usar estructura: Button > span > "Aceptar todo"
            // El xpath busca cualquier elemento que contenga "Aceptar todo" o "Acepto" y busca su ancestro botón o el elemento mismo si es clickable
            const xpathCookies = "//button//span[contains(text(), 'Aceptar todo')] | //button[contains(., 'Aceptar todo')] | //span[contains(text(), 'Acepto')]/..";

            const acceptCookiesBtn = await driver.wait(
                until.elementLocated(By.xpath(xpathCookies)),
                5000 // Aumentamos a 5 segundos
            );

            // A veces selenium intenta hacer click antes de que sea interactivo
            await delay(500);
            await acceptCookiesBtn.click();
            console.log("🍪 Cookies aceptadas.");
            await delay(1000); // Esperar a que desaparezca el modal
        } catch (e) {
            console.log("ℹ️ No se detectó banner de cookies (o falló el click), intentando continuar...");
        }

        // 3. Preparar la búsqueda
        const direccionLimpia = limpiarDireccion(direccion);
        const query = `${direccionLimpia}, ${codigoPostal} ${municipio}, ${provincia}, España`;

        console.log(`🔍 Buscando: "${query}"`);

        // 4. Encontrar la caja de búsqueda de Google Maps
        // Aumentamos el timeout a 15 segundos por si la red va lenta
        const searchBox = await driver.findElement(By.id('searchboxinput'));
        await searchBox.clear();
        await searchBox.sendKeys(query);
        await searchBox.sendKeys(Key.ENTER);

        // 5. Esperar a que la URL cambie y contenga las coordenadas
        try {
            await driver.wait(until.urlContains('@'), 10000);
        } catch (e) {
            console.log("⚠️ Tiempo de espera agotado esperando actualización de URL. Intentando leerla de todas formas.");
        }

        // Damos tiempo para que la URL se estabilice (animación de vuelo al sitio)
        await delay(2000);

        const currentUrl = await driver.getCurrentUrl();
        console.log(`🔗 URL obtenida: ${currentUrl}`);

        // 6. Extraer coordenadas con Regex
        const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const match = currentUrl.match(regex);

        if (match && match.length >= 3) {
            const lat = parseFloat(match[1]);
            const lon = parseFloat(match[2]);

            console.log(`✅ Coordenadas encontradas: ${lat}, ${lon}`);
            return { lat, lon };
        } else {
            console.warn("⚠️ No se pudieron extraer coordenadas de la URL.");
            return null;
        }

    } catch (error) {
        console.error(`❌ Error crítico en Selenium:`, error);
        return null;
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}
