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
        // Configurar Chrome con opciones headless y optimizadas
        const chromeOptions = new chrome.Options();
        SELENIUM_CONFIG.CHROME_OPTIONS.forEach(option => {
            chromeOptions.addArguments(option);
        });

        // Crear driver con las opciones configuradas
        driver = await new Builder()
            .forBrowser(Browser.CHROME)
            .setChromeOptions(chromeOptions)
            .build();

        // Configurar timeouts globales
        await driver.manage().setTimeouts({
            implicit: SELENIUM_CONFIG.TIMEOUT,
            pageLoad: SELENIUM_CONFIG.TIMEOUT * 3,
            script: SELENIUM_CONFIG.TIMEOUT
        });

        console.log("🌐 Abriendo Google Maps...");
        await driver.get('https://www.google.com/maps?hl=es');

        // Gestionar el banner de cookies
        console.log("🍪 Buscando banner de cookies...");
        try {
            const xpathCookies = "//button//span[contains(text(), 'Aceptar todo')] | //button[contains(., 'Aceptar todo')] | //span[contains(text(), 'Acepto')]/..";

            const acceptCookiesBtn = await driver.wait(
                until.elementLocated(By.xpath(xpathCookies)),
                5000
            );

            await delay(500);
            await acceptCookiesBtn.click();
            await delay(1000);
            console.log("✅ Cookies aceptadas");
        } catch (e) {
            console.log("ℹ️ No se detectó banner de cookies, continuando...");
        }

        // Preparar la búsqueda
        const direccionLimpia = limpiarDireccion(direccion);
        const query = `${direccionLimpia}, ${codigoPostal} ${municipio}, ${provincia}, España`;

        console.log(`🔍 Buscando: "${query}"`);

        // Encontrar la caja de búsqueda de Google Maps
        console.log("📝 Localizando caja de búsqueda...");
        const searchBox = await driver.wait(
            until.elementLocated(By.id('searchboxinput')),
            SELENIUM_CONFIG.TIMEOUT
        );
        await searchBox.clear();
        await searchBox.sendKeys(query);
        await searchBox.sendKeys(Key.ENTER);
        console.log("✅ Búsqueda enviada");

        // Esperar a que la URL cambie y contenga las coordenadas
        console.log("⏳ Esperando coordenadas en la URL...");
        try {
            await driver.wait(until.urlContains('@'), SELENIUM_CONFIG.TIMEOUT);
        } catch (e) {
            console.log("⚠️ Timeout esperando URL, intentando extraer de todas formas...");
        }

        // Damos tiempo para que la URL se estabilice
        await delay(SELENIUM_CONFIG.COORDS_WAIT);

        const currentUrl = await driver.getCurrentUrl();
        console.log(`📍 URL actual: ${currentUrl.substring(0, 100)}...`);

        // Extraer coordenadas con Regex
        const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const match = currentUrl.match(regex);

        if (match && match.length >= 3) {
            const lat = parseFloat(match[1]);
            const lon = parseFloat(match[2]);

            console.log(`✅ Coordenadas encontradas: ${lat}, ${lon}\n`);
            return { lat, lon };
        } else {
            console.warn(`⚠️ No se pudieron extraer coordenadas de la URL\n`);
            return null;
        }

    } catch (error: any) {
        console.error(`❌ Error en geocodificación:`, error.message || error);
        return null;
    } finally {
        if (driver) {
            try {
                await driver.quit();
                console.log("🔚 Navegador cerrado\n");
            } catch (e) {
                console.error("⚠️ Error cerrando navegador:", e);
            }
        }
    }
}
