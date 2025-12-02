import { Builder, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import 'chromedriver';

interface GeocodeResult {
    lat: number;
    lon: number;
}

let driver: WebDriver | null = null;
let driverInitialized = false;

/**
 * Inicializa el navegador Chrome con Selenium
 */
async function inicializarNavegador(): Promise<WebDriver> {
    if (driver && driverInitialized) {
        return driver;
    }

    try {
        console.log('🚀 Inicializando navegador Chrome con Selenium...');
        const options = new chrome.Options();
        // --- BÁSICOS ---
        options.addArguments('--headless=new');
        options.addArguments('--window-size=1920,1080');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        
        // --- RENDIMIENTO Y GPU (Evita "GPU state invalid") ---
        options.addArguments('--disable-gpu');
        options.addArguments('--disable-software-rasterizer');
        options.addArguments('--disable-features=VizDisplayCompositor');
        options.addArguments('--disable-extensions');

        // --- SILENCIAR LOGS (Nivel Dios) ---
        options.addArguments('--log-level=3'); // Fatal only
        options.addArguments('--silent');
        options.addArguments('--disable-logging');
        
        // Evita errores de USB en Windows
        options.addArguments('--disable-usb-device-event-log');
        options.addArguments('--disable-usb-keyboard-detect');
        
        // Evita errores de PHONE_REGISTRATION (Google Sync)
        options.addArguments('--disable-sync');
        options.addArguments('--disable-background-networking');
        options.addArguments('--disable-default-apps');
        
        // Importante: Excluir el switch de logging por defecto
        options.excludeSwitches('enable-logging'); 
        options.excludeSwitches('enable-automation'); // Opcional: quita la barra "Chrome está siendo controlado..."

        const service = new chrome.ServiceBuilder()
            .setStdio('ignore'); 

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(service) // <--- AQUI ESTÁ EL TRUCO
            .build();

        // Configurar timeouts cortos
        await driver.manage().setTimeouts({
            implicit: 5000,
            pageLoad: 20000,
            script: 20000
        });

        driverInitialized = true;
        // console.log('✅ Navegador Chrome inicializado');
        return driver;
    } catch (error) {
        console.error('❌ Error inicializando navegador:', error);
        driverInitialized = false;
        driver = null;
        throw error;
    }
}

/**
 * Cierra el navegador de Selenium
 */
export async function cerrarNavegador(): Promise<void> {
    if (driver && driverInitialized) {
        try {
            await driver.quit();
            console.log('🔒 Navegador cerrado');
        } catch (error) {
            console.error('⚠️ Error cerrando navegador:', error);
        }
        driver = null;
        driverInitialized = false;
    }
}

/**
 * Extrae las coordenadas desde la URL de OpenStreetMap
 * Formato: #map=zoom/lat/lon
 */
function extraerCoordenadasDeOpenStreetMap(url: string): GeocodeResult | null {
    try {
        // Patrón para OpenStreetMap: #map=11/39.4227/-0.3525
        const osmPattern = /#map=\d+\/([-+]?\d+\.?\d*)\/([-+]?\d+\.?\d*)/;
        const match = url.match(osmPattern);
        
        if (match) {
            const lat = parseFloat(match[1]);
            const lon = parseFloat(match[2]);
            
            if (!isNaN(lat) && !isNaN(lon)) {
                return { lat, lon };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error extrayendo coordenadas de OpenStreetMap:', error);
        return null;
    }
}

/**
 * Extrae las coordenadas desde la URL de Google Maps (legacy)
 */
function extraerCoordenadasDeURL(url: string): GeocodeResult | null {
    try {
        // Formato 1: https://www.google.com/maps/place/.../@lat,lon,zoom...
        // Formato 2: https://www.google.com/maps/@lat,lon,zoom...
        // Formato 3: https://www.google.com/maps/search/.../@lat,lon,zoom
        // Formato 4: https://www.google.com/maps/dir//lat,lon
        
        // Buscar patrón /@latitud,longitud o /lat,lon
        const patterns = [
            /@(-?\d+\.?\d*),(-?\d+\.?\d*),/,  // Con @ y coma al final
            /@(-?\d+\.?\d*),(-?\d+\.?\d*)$/,   // Con @ y sin coma al final
            /\/(-?\d+\.?\d*),(-?\d+\.?\d*),/,  // Sin @ con coma
            /\/(-?\d+\.?\d*),(-?\d+\.?\d*)$/,  // Sin @ sin coma
            /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/  // Formato alternativo de Google !3d=lat !4d=lon
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                let lat, lon;
                
                // El último patrón tiene lat en posición 1 y lon en posición 2
                if (pattern.source.includes('!3d')) {
                    lat = parseFloat(match[1]);
                    lon = parseFloat(match[2]);
                } else {
                    lat = parseFloat(match[1]);
                    lon = parseFloat(match[2]);
                }
                
                // Validar que las coordenadas son razonables (España está entre lat 36-44, lon -10-5)
                if (lat >= 27 && lat <= 45 && lon >= -19 && lon <= 5) {
                    return { lat, lon };
                }
            }
        }

        // Formato alternativo: ?q=lat,lon
        const matchQ = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (matchQ) {
            const lat = parseFloat(matchQ[1]);
            const lon = parseFloat(matchQ[2]);
            
            if (lat >= 27 && lat <= 45 && lon >= -19 && lon <= 5) {
                return { lat, lon };
            }
        }

        return null;
    } catch (error) {
        console.error('Error extrayendo coordenadas de URL:', error);
        return null;
    }
}

/**
 * Geocodifica una dirección usando Selenium y latlong.net
 * Busca la dirección exacta y extrae las coordenadas de los campos del formulario
 */
export async function geocodificarDireccionSelenium(
    direccion: string,
    municipio: string,
    provincia: string,
    codigoPostal: string
): Promise<GeocodeResult | null> {
    let browserLocal: WebDriver | null = null;
    
    try {
        // IMPORTANTE: Cerrar navegador anterior si existe para forzar sesión limpia
        await cerrarNavegador();
        
        // Crear nuevo navegador para esta búsqueda
        browserLocal = await inicializarNavegador();

        // Construir query con dirección, municipio y provincia
        const query = direccion 
            ? `${direccion}, ${municipio}, ${provincia}` 
            : `${municipio}, ${provincia}, España`;
        const encodedQuery = encodeURIComponent(query);
        const url = `https://www.latlong.net/search.php?keyword=${encodedQuery}`;

        console.log(`🌐 Buscando en latlong.net: ${query}`);

        // Navegar a latlong.net
        await browserLocal.get(url);

        // Esperar a que cargue y procese la búsqueda
        await delay(5000);

        // Extraer las coordenadas de los campos de entrada
        const coordenadas = await browserLocal.executeScript<GeocodeResult | null>(`
            const latInput = document.querySelector('input[name="lat"]');
            const lonInput = document.querySelector('input[name="lon"]');
            
            if (latInput && lonInput) {
                const lat = parseFloat(latInput.value);
                const lon = parseFloat(lonInput.value);
                
                if (!isNaN(lat) && !isNaN(lon)) {
                    return { lat, lon };
                }
            }
            return null;
        `);

        if (coordenadas && coordenadas.lat && coordenadas.lon) {
            console.log(`✅ Coordenadas: ${coordenadas.lat}, ${coordenadas.lon}`);
            return coordenadas;
        }

        console.warn(`⚠️ No se encontraron coordenadas para: ${query}`);
        return null;

    } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error geocodificando ${municipio}:`, mensaje);
        return null;
    } finally {
        // IMPORTANTE: Cerrar navegador después de cada búsqueda para asegurar sesión limpia
        if (browserLocal) {
            try {
                await browserLocal.quit();
                driver = null;
                driverInitialized = false;
            } catch (e) {
                // Ignorar errores al cerrar
            }
        }
    }
}

/**
 * Extrae coordenadas de un texto que pueda contenerlas
 */
function extraerCoordenadasDeTexto(texto: string): GeocodeResult | null {
    try {
        // Buscar patrón de coordenadas en el texto
        const match = texto.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
        
        if (match) {
            const lat = parseFloat(match[1]);
            const lon = parseFloat(match[2]);
            
            // Validar que las coordenadas son razonables para España
            if (lat >= 35 && lat <= 45 && lon >= -10 && lon <= 5) {
                return { lat, lon };
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Añade un delay entre peticiones
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
