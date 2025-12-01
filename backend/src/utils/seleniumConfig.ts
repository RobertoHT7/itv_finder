/**
 * Configuración para Selenium WebDriver
 * Este archivo asegura que ChromeDriver esté correctamente configurado
 */

// Importar chromedriver para que esté disponible en el PATH
import 'chromedriver';

export const SELENIUM_CONFIG = {
    // Tiempo máximo de espera para elementos (en ms)
    TIMEOUT: 10000,

    // Tiempo de espera adicional para que se actualice la URL con coordenadas
    COORDS_WAIT: 3000,

    // Delay entre peticiones para no sobrecargar
    DELAY_BETWEEN_REQUESTS: 2000,

    // Opciones de Chrome
    CHROME_OPTIONS: [
        '--headless',           // Modo sin interfaz gráfica
        '--disable-gpu',        // Desactivar aceleración GPU
        '--no-sandbox',         // Necesario en algunos entornos
        '--disable-dev-shm-usage', // Evitar problemas de memoria compartida
        '--window-size=1920,1080', // Tamaño de ventana
        '--disable-blink-features=AutomationControlled', // Evitar detección de automatización
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
};
