/**
 * Sistema de validación y corrección automática de datos para estaciones ITV
 * 
 * Este módulo valida y CORRIGE automáticamente errores tipográficos,
 * acentos, capitalización y formatos incorrectos.
 */

// Listas oficiales de provincias españolas
const PROVINCIAS_VALIDAS = [
    // Comunidad Valenciana
    "Alicante", "Castellón", "Valencia",
    // Galicia
    "A Coruña", "Lugo", "Ourense", "Pontevedra",
    // Cataluña
    "Barcelona", "Girona", "Lleida", "Tarragona",
];

// Mapeo de municipios conocidos a sus provincias correctas
const MUNICIPIOS_PROVINCIAS: { [municipio: string]: string } = {
    // Barcelona
    "barcelona": "Barcelona",
    "sabadell": "Barcelona",
    "terrassa": "Barcelona",
    "badalona": "Barcelona",
    "hospitalet": "Barcelona",
    "l'hospitalet": "Barcelona",
    "santa coloma": "Barcelona",
    "mataro": "Barcelona",
    "mataró": "Barcelona",
    "cornella": "Barcelona",
    "cornellà": "Barcelona",
    "granollers": "Barcelona",
    "sant boi": "Barcelona",
    "manresa": "Barcelona",
    "vic": "Barcelona",
    "viladecans": "Barcelona",
    "igualada": "Barcelona",
    "mollet": "Barcelona",
    "esplugues": "Barcelona",
    "sant feliu": "Barcelona",
    "sant cugat": "Barcelona",
    // Tarragona
    "tarragona": "Tarragona",
    "reus": "Tarragona",
    "tortosa": "Tarragona",
    "el vendrell": "Tarragona",
    "cambrils": "Tarragona",
    "valls": "Tarragona",
    "salou": "Tarragona",
    // Lleida
    "lleida": "Lleida",
    "lerida": "Lleida",
    "balaguer": "Lleida",
    "mollerussa": "Lleida",
    "tremp": "Lleida",
    "la seu d'urgell": "Lleida",
    "la seu": "Lleida",
    // Girona
    "girona": "Girona",
    "gerona": "Girona",
    "figueres": "Girona",
    "blanes": "Girona",
    "lloret": "Girona",
    "olot": "Girona",
    "salt": "Girona",
    "palafrugell": "Girona",
    // Comunidad Valenciana
    "valencia": "Valencia",
    "valència": "Valencia",
    "torrent": "Valencia",
    "gandia": "Valencia",
    "sagunto": "Valencia",
    "paterna": "Valencia",
    "alcira": "Valencia",
    "alzira": "Valencia",
    "mislata": "Valencia",
    "burjassot": "Valencia",
    "alicante": "Alicante",
    "alacant": "Alicante",
    "elche": "Alicante",
    "elx": "Alicante",
    "torrevieja": "Alicante",
    "orihuela": "Alicante",
    "benidorm": "Alicante",
    "alcoy": "Alicante",
    "alcoi": "Alicante",
    "denia": "Alicante",
    "dénia": "Alicante",
    "castellon": "Castellón",
    "castelló": "Castellón",
    "vila-real": "Castellón",
    "villarreal": "Castellón",
    "burriana": "Castellón",
    "vinaros": "Castellón",
    "vinaròs": "Castellón",
    // Galicia
    "a coruña": "A Coruña",
    "coruña": "A Coruña",
    "santiago": "A Coruña",
    "ferrol": "A Coruña",
    "lugo": "Lugo",
    "ourense": "Ourense",
    "orense": "Ourense",
    "pontevedra": "Pontevedra",
    "vigo": "Pontevedra",
    "vilagarcía": "Pontevedra",
};

// Mapeo exhaustivo de errores comunes y variantes
const PROVINCIAS_CORRECCIONES: { [key: string]: string } = {
    // Comunidad Valenciana
    "aligante": "Alicante",
    "aligant": "Alicante",
    "alicate": "Alicante",
    "alacant": "Alicante",
    "castellon": "Castellón",
    "castello": "Castellón",
    "castelló": "Castellón",
    "castello de la plana": "Castellón",
    "valencia": "Valencia",
    "valencià": "Valencia",
    "vagencia": "Valencia",
    "valencua": "Valencia",
    "valncia": "Valencia",
    "vaencia": "Valencia",
    // Galicia
    "coruna": "A Coruña",
    "coruña": "A Coruña",
    "a coruna": "A Coruña",
    "la coruña": "A Coruña",
    "orense": "Ourense",
    "lugo": "Lugo",
    "pontevedra": "Pontevedra",
    "pontevdra": "Pontevedra",
    "pontevdera": "Pontevedra",
    // Cataluña
    "barcelona": "Barcelona",
    "barcleona": "Barcelona",
    "barselona": "Barcelona",
    "barchelona": "Barcelona",
    "gerona": "Girona",
    "girona": "Girona",
    "lerida": "Lleida",
    "lleida": "Lleida",
    "lérida": "Lleida",
    "tarragona": "Tarragona",
    "tarragon": "Tarragona",
    "taragon": "Tarragona",
};

export interface ErrorValidacion {
    campo: string;
    valorOriginal: string;
    valorCorregido?: string;
    mensaje: string;
    corregido: boolean;
}

export interface ResultadoValidacion {
    esValido: boolean;
    errores: ErrorValidacion[];
    advertencias: ErrorValidacion[];
    datosCorregidos: any;
}

/**
 * Convierte un valor a string
 */
function toStringValue(value: any): string {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value[0] || "";
    return String(value);
}

/**
 * Normaliza un texto (sin tildes, minúsculas, sin espacios extra)
 */
function normalizar(texto: string): string {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Capitaliza correctamente un texto
 */
function capitalizar(texto: string): string {
    return texto
        .split(' ')
        .map(palabra => {
            if (palabra.length === 0) return palabra;
            // Mantener "de", "del", "la", etc. en minúsculas excepto al inicio
            const minusculas = ["de", "del", "la", "el", "los", "las", "y"];
            if (minusculas.includes(palabra.toLowerCase())) {
                return palabra.toLowerCase();
            }
            return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
        })
        .join(' ')
        .replace(/^(\w)/, match => match.toUpperCase()); // Primera letra siempre mayúscula
}

/**
 * Calcula distancia de Levenshtein para detectar errores tipográficos
 */
function distanciaLevenshtein(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + 1
                );
            }
        }
    }
    return dp[m][n];
}

/**
 * Busca y corrige provincia automáticamente
 */
function corregirProvincia(provincia: string): { corregido: string; cambio: boolean } {
    const provinciaTrim = provincia.trim();
    const normalizado = normalizar(provinciaTrim);

    // Buscar en correcciones conocidas
    if (PROVINCIAS_CORRECCIONES[normalizado]) {
        return {
            corregido: PROVINCIAS_CORRECCIONES[normalizado],
            cambio: true
        };
    }

    // Buscar coincidencia exacta normalizada
    for (const provinciaValida of PROVINCIAS_VALIDAS) {
        if (normalizar(provinciaValida) === normalizado) {
            // Solo marcar como cambio si el texto original es diferente
            return { 
                corregido: provinciaValida, 
                cambio: provinciaTrim !== provinciaValida 
            };
        }
    }

    // Buscar similitud con Levenshtein (tolerancia de 2 caracteres)
    let mejorCandidato = provinciaTrim;
    let menorDistancia = Infinity;

    for (const provinciaValida of PROVINCIAS_VALIDAS) {
        const distancia = distanciaLevenshtein(normalizado, normalizar(provinciaValida));
        if (distancia < menorDistancia && distancia <= 2) {
            menorDistancia = distancia;
            mejorCandidato = provinciaValida;
        }
    }

    return {
        corregido: mejorCandidato,
        cambio: mejorCandidato !== provinciaTrim
    };
}

/**
 * Valida y corrige provincia
 */
export function validarYCorregirProvincia(provincia: any): {
    esValido: boolean;
    valorCorregido: string;
    error: ErrorValidacion | null;
} {
    const provinciaStr = toStringValue(provincia).trim();

    if (!provinciaStr) {
        return {
            esValido: false,
            valorCorregido: "",
            error: {
                campo: "PROVINCIA",
                valorOriginal: provinciaStr,
                mensaje: "La provincia es obligatoria",
                corregido: false
            }
        };
    }

    const resultado = corregirProvincia(provinciaStr);

    return {
        esValido: true,
        valorCorregido: resultado.corregido,
        error: resultado.cambio ? {
            campo: "PROVINCIA",
            valorOriginal: provinciaStr,
            valorCorregido: resultado.corregido,
            mensaje: `Corregido: "${provinciaStr}" → "${resultado.corregido}"`,
            corregido: true
        } : null
    };
}

/**
 * Valida y corrige municipio
 */
export function validarYCorregirMunicipio(municipio: any, esMovil: boolean = false): {
    esValido: boolean;
    valorCorregido: string;
    error: ErrorValidacion | null;
} {
    const municipioStr = toStringValue(municipio).trim();

    if (!municipioStr || municipioStr === "undefined") {
        if (esMovil) {
            return { esValido: true, valorCorregido: "", error: null };
        }
        return {
            esValido: false,
            valorCorregido: "",
            error: {
                campo: "MUNICIPIO",
                valorOriginal: municipioStr,
                mensaje: "El municipio es obligatorio",
                corregido: false
            }
        };
    }

    // Corregir capitalización
    const corregido = capitalizar(municipioStr);
    const cambio = corregido !== municipioStr;

    return {
        esValido: true,
        valorCorregido: corregido,
        error: cambio ? {
            campo: "MUNICIPIO",
            valorOriginal: municipioStr,
            valorCorregido: corregido,
            mensaje: `Capitalización corregida: "${municipioStr}" → "${corregido}"`,
            corregido: true
        } : null
    };
}

/**
 * Valida y corrige código postal
 */
export function validarYCorregirCodigoPostal(
    cp: any,
    provincia?: string,
    esMovil: boolean = false
): {
    esValido: boolean;
    valorCorregido: string;
    error: ErrorValidacion | null;
} {
    const cpStr = toStringValue(cp).trim();

    if (!cpStr || cpStr === "0" || cpStr === "00000" || cpStr === "undefined") {
        if (esMovil) {
            return { esValido: true, valorCorregido: "00000", error: null };
        }
        return {
            esValido: false,
            valorCorregido: "00000",
            error: {
                campo: "C.POSTAL",
                valorOriginal: cpStr,
                mensaje: "Código postal vacío o 00000",
                corregido: false
            }
        };
    }

    // Validar formato: debe ser 5 dígitos
    if (!/^\d{5}$/.test(cpStr)) {
        return {
            esValido: false,
            valorCorregido: cpStr,
            error: {
                campo: "C.POSTAL",
                valorOriginal: cpStr,
                mensaje: `Formato incorrecto: "${cpStr}" (debe tener 5 dígitos)`,
                corregido: false
            }
        };
    }

    // Validar coherencia con provincia
    if (provincia) {
        const prefijo = cpStr.substring(0, 2);
        const mapaPrefijos: { [key: string]: string[] } = {
            "alicante": ["03"],
            "castellón": ["12"],
            "castellon": ["12"],
            "valencia": ["46"],
            "a coruña": ["15"],
            "coruna": ["15"],
            "lugo": ["27"],
            "ourense": ["32"],
            "pontevedra": ["36"],
            "barcelona": ["08"],
            "girona": ["17"],
            "lleida": ["25"],
            "tarragona": ["43"]
        };

        const provinciaNorm = normalizar(provincia);
        const prefijosEsperados = mapaPrefijos[provinciaNorm];

        if (prefijosEsperados && !prefijosEsperados.includes(prefijo)) {
            return {
                esValido: false,
                valorCorregido: cpStr,
                error: {
                    campo: "C.POSTAL",
                    valorOriginal: cpStr,
                    mensaje: `CP ${cpStr} no corresponde a ${provincia} (debe empezar por ${prefijosEsperados.join(" o ")})`,
                    corregido: false
                }
            };
        }
    }

    return { esValido: true, valorCorregido: cpStr, error: null };
}

/**
 * Valida coordenadas geográficas
 */
export function validarCoordenadas(lat: number, lon: number): ErrorValidacion[] {
    const errores: ErrorValidacion[] = [];

    if (isNaN(lat) || lat === 0) {
        errores.push({
            campo: "LATITUD",
            valorOriginal: String(lat),
            mensaje: "Latitud inválida o 0",
            corregido: false
        });
    } else if (lat < 27 || lat > 44) {
        errores.push({
            campo: "LATITUD",
            valorOriginal: String(lat),
            mensaje: `Latitud ${lat} fuera del rango de España (27-44)`,
            corregido: false
        });
    }

    if (isNaN(lon) || lon === 0) {
        errores.push({
            campo: "LONGITUD",
            valorOriginal: String(lon),
            mensaje: "Longitud inválida o 0",
            corregido: false
        });
    } else if (lon < -19 || lon > 5) {
        errores.push({
            campo: "LONGITUD",
            valorOriginal: String(lon),
            mensaje: `Longitud ${lon} fuera del rango de España (-19 a 5)`,
            corregido: false
        });
    }

    return errores;
}

/**
 * Función para validar estación SIN coordenadas (antes de geocodificación)
 */
export function validarYCorregirEstacionSinCoordenadas(estacion: any, origen: string): ResultadoValidacion {
    const errores: ErrorValidacion[] = [];
    const advertencias: ErrorValidacion[] = [];
    const datosCorregidos: any = { ...estacion };

    console.log(`\n🔍 Validando estación [${origen}]: ${estacion.MUNICIPIO || estacion.CONCELLO || estacion.municipi || "Sin nombre"}`);
    console.log("=".repeat(70));

    // Determinar si es móvil
    const tipoEstacion = estacion["TIPO ESTACIÓN"] || estacion["TIPO ESTACION"] || "";
    const esMovil = normalizar(String(tipoEstacion)).includes("movil");

    // 1. PROVINCIA
    const provinciaOriginal = estacion.PROVINCIA || estacion.provincia || estacion.serveis_territorials;
    const resultProvincia = validarYCorregirProvincia(provinciaOriginal);
    
    if (resultProvincia.error) {
        if (resultProvincia.error.corregido) {
            advertencias.push(resultProvincia.error);
            console.log(`✏️  ${resultProvincia.error.campo}: ${resultProvincia.error.mensaje}`);
        } else {
            errores.push(resultProvincia.error);
            console.log(`❌ ${resultProvincia.error.campo}: ${resultProvincia.error.mensaje}`);
        }
    } else {
        console.log(`✅ PROVINCIA: "${resultProvincia.valorCorregido}"`);
    }
    datosCorregidos.PROVINCIA = resultProvincia.valorCorregido;

    // 2. MUNICIPIO
    const municipioOriginal = estacion.MUNICIPIO || estacion.CONCELLO || estacion.municipi;
    const resultMunicipio = validarYCorregirMunicipio(municipioOriginal, esMovil);
    
    if (resultMunicipio.error) {
        if (resultMunicipio.error.corregido) {
            advertencias.push(resultMunicipio.error);
            console.log(`✏️  ${resultMunicipio.error.mensaje}`);
        } else {
            errores.push(resultMunicipio.error);
            console.log(`❌ ${resultMunicipio.error.campo}: ${resultMunicipio.error.mensaje}`);
        }
    } else if (resultMunicipio.valorCorregido) {
        console.log(`✅ MUNICIPIO: "${resultMunicipio.valorCorregido}"`);
    }
    datosCorregidos.MUNICIPIO = resultMunicipio.valorCorregido || datosCorregidos.PROVINCIA;

    // 2.5. VALIDAR COHERENCIA MUNICIPIO-PROVINCIA
    let provinciaFinal = resultProvincia.valorCorregido;
    if (resultMunicipio.valorCorregido && resultProvincia.valorCorregido) {
        const municipioNorm = normalizar(resultMunicipio.valorCorregido);
        const provinciaCorrecta = MUNICIPIOS_PROVINCIAS[municipioNorm];
        
        if (provinciaCorrecta && provinciaCorrecta !== resultProvincia.valorCorregido) {
            // El municipio pertenece a otra provincia
            advertencias.push({
                campo: "PROVINCIA",
                valorOriginal: resultProvincia.valorCorregido,
                valorCorregido: provinciaCorrecta,
                mensaje: `Provincia corregida: "${resultProvincia.valorCorregido}" → "${provinciaCorrecta}" (${resultMunicipio.valorCorregido} pertenece a ${provinciaCorrecta})`,
                corregido: true
            });
            console.log(`✏️  PROVINCIA: Corregida por coherencia con municipio: "${resultProvincia.valorCorregido}" → "${provinciaCorrecta}"`);
            provinciaFinal = provinciaCorrecta;
            datosCorregidos.PROVINCIA = provinciaCorrecta;
        }
    }

    // 3. CÓDIGO POSTAL (validar con la provincia corregida)
    const cpOriginal = estacion["C.POSTAL"] || estacion["CÓDIGO POSTAL"] || estacion["CDIGO POSTAL"] || estacion.cp;
    const resultCP = validarYCorregirCodigoPostal(cpOriginal, provinciaFinal, esMovil);
    
    if (resultCP.error) {
        if (resultCP.error.corregido) {
            advertencias.push(resultCP.error);
            console.log(`✏️  ${resultCP.error.mensaje}`);
        } else {
            errores.push(resultCP.error);
            console.log(`❌ ${resultCP.error.campo}: ${resultCP.error.mensaje}`);
        }
    } else {
        console.log(`✅ C.POSTAL: ${resultCP.valorCorregido}`);
    }
    datosCorregidos["C.POSTAL"] = resultCP.valorCorregido;

    console.log("=".repeat(70));

    const esValido = errores.length === 0;

    if (esValido) {
        console.log(`✅ ESTACIÓN VÁLIDA (${advertencias.length} corrección/correcciones aplicadas)`);
    } else {
        console.log(`❌ ESTACIÓN RECHAZADA: ${errores.length} error/errores críticos`);
    }

    return {
        esValido,
        errores,
        advertencias,
        datosCorregidos
    };
}

/**
 * Función principal: valida y corrige todos los datos de una estación (CON coordenadas)
 */
export function validarYCorregirEstacion(estacion: any, origen: string): ResultadoValidacion {
    const errores: ErrorValidacion[] = [];
    const advertencias: ErrorValidacion[] = [];
    const datosCorregidos: any = { ...estacion };

    console.log(`\n🔍 Validando estación [${origen}]: ${estacion.MUNICIPIO || estacion.CONCELLO || estacion.municipi || "Sin nombre"}`);
    console.log("=".repeat(70));

    // Determinar si es móvil
    const tipoEstacion = estacion["TIPO ESTACIÓN"] || estacion["TIPO ESTACION"] || "";
    const esMovil = normalizar(String(tipoEstacion)).includes("movil");

    // 1. PROVINCIA
    const provinciaOriginal = estacion.PROVINCIA || estacion.provincia || estacion.serveis_territorials;
    const resultProvincia = validarYCorregirProvincia(provinciaOriginal);
    
    if (resultProvincia.error) {
        if (resultProvincia.error.corregido) {
            advertencias.push(resultProvincia.error);
            console.log(`✏️  ${resultProvincia.error.campo}: ${resultProvincia.error.mensaje}`);
        } else {
            errores.push(resultProvincia.error);
            console.log(`❌ ${resultProvincia.error.campo}: ${resultProvincia.error.mensaje}`);
        }
    } else {
        console.log(`✅ PROVINCIA: "${resultProvincia.valorCorregido}"`);
    }
    datosCorregidos.PROVINCIA = resultProvincia.valorCorregido;

    // 2. MUNICIPIO
    const municipioOriginal = estacion.MUNICIPIO || estacion.CONCELLO || estacion.municipi;
    const resultMunicipio = validarYCorregirMunicipio(municipioOriginal, esMovil);
    
    if (resultMunicipio.error) {
        if (resultMunicipio.error.corregido) {
            advertencias.push(resultMunicipio.error);
            console.log(`✏️  ${resultMunicipio.error.mensaje}`);
        } else {
            errores.push(resultMunicipio.error);
            console.log(`❌ ${resultMunicipio.error.campo}: ${resultMunicipio.error.mensaje}`);
        }
    } else if (resultMunicipio.valorCorregido) {
        console.log(`✅ MUNICIPIO: "${resultMunicipio.valorCorregido}"`);
    }
    datosCorregidos.MUNICIPIO = resultMunicipio.valorCorregido || datosCorregidos.PROVINCIA;

    // 2.5. VALIDAR COHERENCIA MUNICIPIO-PROVINCIA
    let provinciaFinal = resultProvincia.valorCorregido;
    if (resultMunicipio.valorCorregido && resultProvincia.valorCorregido) {
        const municipioNorm = normalizar(resultMunicipio.valorCorregido);
        const provinciaCorrecta = MUNICIPIOS_PROVINCIAS[municipioNorm];
        
        if (provinciaCorrecta && provinciaCorrecta !== resultProvincia.valorCorregido) {
            // El municipio pertenece a otra provincia
            advertencias.push({
                campo: "PROVINCIA",
                valorOriginal: resultProvincia.valorCorregido,
                valorCorregido: provinciaCorrecta,
                mensaje: `Provincia corregida: "${resultProvincia.valorCorregido}" → "${provinciaCorrecta}" (${resultMunicipio.valorCorregido} pertenece a ${provinciaCorrecta})`,
                corregido: true
            });
            console.log(`✏️  PROVINCIA: Corregida por coherencia con municipio: "${resultProvincia.valorCorregido}" → "${provinciaCorrecta}"`);
            provinciaFinal = provinciaCorrecta;
            datosCorregidos.PROVINCIA = provinciaCorrecta;
        }
    }

    // 3. CÓDIGO POSTAL (validar con la provincia corregida)
    const cpOriginal = estacion["C.POSTAL"] || estacion["CÓDIGO POSTAL"] || estacion["CDIGO POSTAL"] || estacion.cp;
    const resultCP = validarYCorregirCodigoPostal(cpOriginal, provinciaFinal, esMovil);
    
    if (resultCP.error) {
        if (resultCP.error.corregido) {
            advertencias.push(resultCP.error);
            console.log(`✏️  ${resultCP.error.mensaje}`);
        } else {
            errores.push(resultCP.error);
            console.log(`❌ ${resultCP.error.campo}: ${resultCP.error.mensaje}`);
        }
    } else {
        console.log(`✅ C.POSTAL: ${resultCP.valorCorregido}`);
    }
    datosCorregidos["C.POSTAL"] = resultCP.valorCorregido;

    // 4. COORDENADAS
    const lat = estacion.latitud || estacion.lat || 0;
    const lon = estacion.longitud || estacion.lon || 0;
    const erroresCoordenadas = validarCoordenadas(lat, lon);
    
    erroresCoordenadas.forEach(err => {
        errores.push(err);
        console.log(`❌ ${err.campo}: ${err.mensaje}`);
    });

    if (erroresCoordenadas.length === 0 && (lat !== 0 || lon !== 0)) {
        console.log(`✅ COORDENADAS: ${lat}, ${lon}`);
    }

    console.log("=".repeat(70));

    const esValido = errores.length === 0;

    if (esValido) {
        console.log(`✅ ESTACIÓN VÁLIDA (${advertencias.length} corrección/correcciones aplicadas)`);
    } else {
        console.log(`❌ ESTACIÓN RECHAZADA: ${errores.length} error/errores críticos`);
    }

    return {
        esValido,
        errores,
        advertencias,
        datosCorregidos
    };
}
