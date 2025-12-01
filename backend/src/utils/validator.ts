/**
 * Sistema de validación de datos para estaciones ITV
 * 
 * Este módulo valida cada campo de las estaciones antes de insertarlas
 * en la base de datos, detectando errores tipográficos y datos incorrectos.
 */

// Listas oficiales de provincias españolas
const PROVINCIAS_VALIDAS = [
    // Comunidad Valenciana
    "Alicante", "Castellón", "Valencia",
    // Galicia
    "A Coruña", "Coruña", "Lugo", "Ourense", "Pontevedra",
    // Cataluña
    "Barcelona", "Girona", "Lleida", "Tarragona",
];

// Mapeo de errores comunes de provincia
const PROVINCIAS_CORRECCIONES: { [key: string]: string } = {
    "aligante": "Alicante",
    "aligant": "Alicante",
    "alicate": "Alicante",
    "castellon": "Castellón",
    "castello": "Castellón",
    "valencia": "Valencia",
    "valència": "Valencia",
    "coruña": "A Coruña",
    "gerona": "Girona",
    "lerida": "Lleida",
};

export interface ErrorValidacion {
    campo: string;
    valor: string;
    mensaje: string;
}

export interface ResultadoValidacion {
    esValido: boolean;
    errores: ErrorValidacion[];
    advertencias: ErrorValidacion[];
}

/**
 * Convierte un valor (que puede ser string, array o undefined) a string
 */
function toStringValue(value: any): string {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value[0] || "";
    return String(value);
}

/**
 * Normaliza un texto para comparación (sin tildes, minúsculas, sin espacios extra)
 */
function normalizar(texto: string): string {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * Para detectar errores tipográficos
 */
function distanciaLevenshtein(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,    // eliminación
                    dp[i][j - 1] + 1,    // inserción
                    dp[i - 1][j - 1] + 1 // sustitución
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * Busca la provincia más similar en caso de error tipográfico
 */
function buscarProvinciaSimilar(provincia: string): string | null {
    const normalizado = normalizar(provincia);

    // Primero buscar en correcciones conocidas
    if (PROVINCIAS_CORRECCIONES[normalizado]) {
        return PROVINCIAS_CORRECCIONES[normalizado];
    }

    // Buscar provincia con distancia de edición pequeña
    let mejorCandidato: string | null = null;
    let menorDistancia = Infinity;

    for (const provinciaValida of PROVINCIAS_VALIDAS) {
        const distancia = distanciaLevenshtein(
            normalizado,
            normalizar(provinciaValida)
        );

        // Si la distancia es pequeña (1-2 caracteres), es probablemente un error tipográfico
        if (distancia < menorDistancia && distancia <= 2) {
            menorDistancia = distancia;
            mejorCandidato = provinciaValida;
        }
    }

    return mejorCandidato;
}

/**
 * Valida una provincia
 */
export function validarProvincia(provincia: any): ErrorValidacion | null {
    const provinciaStr = toStringValue(provincia);

    if (!provinciaStr || provinciaStr.trim() === "") {
        return {
            campo: "PROVINCIA",
            valor: provinciaStr,
            mensaje: "La provincia es obligatoria y no puede estar vacía"
        };
    }

    const normalizado = normalizar(provinciaStr);
    const esValida = PROVINCIAS_VALIDAS.some(p => normalizar(p) === normalizado);

    if (!esValida) {
        const sugerencia = buscarProvinciaSimilar(provinciaStr);
        const mensajeCompleto = sugerencia
            ? `La provincia "${provinciaStr}" no es válida (¿quizás "${sugerencia}"?)`
            : `La provincia "${provinciaStr}" no es válida`;
        return {
            campo: "PROVINCIA",
            valor: provinciaStr,
            mensaje: mensajeCompleto
        };
    }

    return null;
}

/**
 * Valida un municipio
 */
export function validarMunicipio(municipio: any, provincia: any, tipoEstacion?: any): ErrorValidacion | null {
    const municipioStr = toStringValue(municipio);
    const tipoEstacionStr = toStringValue(tipoEstacion);

    // Las estaciones móviles y agrícolas pueden no tener municipio
    const esMovilOAgricola = tipoEstacionStr && (normalizar(tipoEstacionStr).includes("movil") || normalizar(tipoEstacionStr).includes("agricola"));

    if (!municipioStr || municipioStr.trim() === "" || municipioStr === "undefined") {
        if (esMovilOAgricola) {
            return null; // Es válido para estaciones móviles/agrícolas
        }
        return {
            campo: "MUNICIPIO",
            valor: municipioStr,
            mensaje: "El municipio es obligatorio y no puede estar vacío"
        };
    }

    // Validar que no sea un placeholder o valor genérico
    if (municipioStr.toLowerCase().includes("desconocido") ||
        municipioStr.toLowerCase() === "n/a" ||
        municipioStr === "-") {
        return {
            campo: "MUNICIPIO",
            valor: municipioStr,
            mensaje: "El municipio no puede ser un valor genérico o desconocido"
        };
    }

    return null;
}/**
 * Valida un código postal español (5 dígitos)
 */
export function validarCodigoPostal(cp: any, provincia?: any, tipoEstacion?: any): ErrorValidacion | null {
    const cpStr = toStringValue(cp).trim();
    const provinciaStr = toStringValue(provincia);
    const tipoEstacionStr = toStringValue(tipoEstacion);

    // Las estaciones móviles y agrícolas pueden no tener código postal
    const esMovilOAgricola = tipoEstacionStr && (normalizar(tipoEstacionStr).includes("movil") || normalizar(tipoEstacionStr).includes("agricola"));

    if (!cpStr || cpStr === "" || cpStr === "0" || cpStr === "00000" || cpStr === "undefined") {
        if (esMovilOAgricola) {
            return null; // Es válido para estaciones móviles/agrícolas
        }
        return {
            campo: "C.POSTAL",
            valor: cpStr,
            mensaje: "El código postal es obligatorio y no puede ser vacío o 00000"
        };
    }

    // Validar formato: debe ser 5 dígitos
    if (!/^\d{5}$/.test(cpStr)) {
        return {
            campo: "C.POSTAL",
            valor: cpStr,
            mensaje: `El código postal "${cpStr}" debe tener exactamente 5 dígitos numéricos`
        };
    }

    // Validar coherencia con provincia
    if (provinciaStr) {
        const prefijo = parseInt(cpStr.substring(0, 2));
        let prefijoEsperado: number[] = [];

        const provinciaNorm = normalizar(provinciaStr);
        if (provinciaNorm.includes("alicante")) prefijoEsperado = [3];
        else if (provinciaNorm.includes("castellon")) prefijoEsperado = [12];
        else if (provinciaNorm.includes("valencia")) prefijoEsperado = [46];
        else if (provinciaNorm.includes("coruna")) prefijoEsperado = [15];
        else if (provinciaNorm.includes("lugo")) prefijoEsperado = [27];
        else if (provinciaNorm.includes("ourense")) prefijoEsperado = [32];
        else if (provinciaNorm.includes("pontevedra")) prefijoEsperado = [36];
        else if (provinciaNorm.includes("barcelona")) prefijoEsperado = [8];
        else if (provinciaNorm.includes("girona")) prefijoEsperado = [17];
        else if (provinciaNorm.includes("lleida")) prefijoEsperado = [25];
        else if (provinciaNorm.includes("tarragona")) prefijoEsperado = [43];

        if (prefijoEsperado.length > 0 && !prefijoEsperado.includes(prefijo)) {
            return {
                campo: "C.POSTAL",
                valor: cpStr,
                mensaje: `El código postal "${cpStr}" no corresponde con la provincia "${provinciaStr}" (debe empezar con ${prefijoEsperado.join(" o ")})`
            };
        }
    }

    return null;
}

/**
 * Valida una dirección
 */
export function validarDireccion(direccion: any): ErrorValidacion | null {
    const direccionStr = toStringValue(direccion);

    if (!direccionStr || direccionStr.trim() === "") {
        return {
            campo: "DIRECCIÓN",
            valor: direccionStr,
            mensaje: "La dirección es obligatoria y no puede estar vacía"
        };
    }

    // Validar que no sea un valor genérico
    if (direccionStr.toLowerCase().includes("sin dirección") ||
        direccionStr.toLowerCase() === "n/a" ||
        direccionStr === "-") {
        return {
            campo: "DIRECCIÓN",
            valor: direccionStr,
            mensaje: "La dirección no puede ser un valor genérico"
        };
    }

    // Debe tener al menos 5 caracteres
    if (direccionStr.length < 5) {
        return {
            campo: "DIRECCIÓN",
            valor: direccionStr,
            mensaje: "La dirección es demasiado corta, debe ser más descriptiva"
        };
    }

    return null;
}

/**
 * Valida un email
 */
export function validarEmail(email: any): ErrorValidacion | null {
    const emailStr = toStringValue(email);

    if (!emailStr || emailStr.trim() === "") {
        return {
            campo: "CORREO",
            valor: emailStr,
            mensaje: "El correo electrónico no puede estar vacío"
        };
    }

    // Expresión regular básica para email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
        return {
            campo: "CORREO",
            valor: emailStr,
            mensaje: `El correo "${emailStr}" no tiene un formato válido`
        };
    }

    return null;
}

/**
 * Valida el tipo de estación
 */
export function validarTipoEstacion(tipo: any): ErrorValidacion | null {
    const tipoStr = toStringValue(tipo);

    if (!tipoStr || tipoStr.trim() === "") {
        return {
            campo: "TIPO ESTACIÓN",
            valor: tipoStr,
            mensaje: "El tipo de estación es obligatorio"
        };
    }

    const tipoNorm = normalizar(tipoStr).replace(/\s+/g, "");
    const tiposValidos = ["estacionfija", "estacionmovil", "estacionagricola", "otros"];

    const esValido = tiposValidos.some(t => tipoNorm === t || tipoNorm.includes(t));

    if (!esValido) {
        return {
            campo: "TIPO ESTACIÓN",
            valor: tipoStr,
            mensaje: `El tipo de estación "${tipoStr}" no es reconocido`
        };
    }

    return null;
}

/**
 * Valida un número de estación
 */
export function validarNumeroEstacion(numero: number | string): ErrorValidacion | null {
    if (!numero && numero !== 0) {
        return {
            campo: "Nº ESTACIÓN",
            valor: String(numero),
            mensaje: "El número de estación es obligatorio"
        };
    }

    const numeroStr = String(numero);
    if (!/^\d+$/.test(numeroStr)) {
        return {
            campo: "Nº ESTACIÓN",
            valor: numeroStr,
            mensaje: `El número de estación "${numeroStr}" debe ser numérico`
        };
    }

    return null;
}

/**
 * Valida coordenadas geográficas
 */
export function validarCoordenadas(lat: number, lon: number): ErrorValidacion[] {
    const errores: ErrorValidacion[] = [];

    if (isNaN(lat) || lat === 0) {
        errores.push({
            campo: "LATITUD",
            valor: String(lat),
            mensaje: "La latitud no es válida o es 0"
        });
    }

    if (isNaN(lon) || lon === 0) {
        errores.push({
            campo: "LONGITUD",
            valor: String(lon),
            mensaje: "La longitud no es válida o es 0"
        });
    }

    // Validar rango para España (aproximado)
    if (lat < 36 || lat > 44) {
        errores.push({
            campo: "LATITUD",
            valor: String(lat),
            mensaje: `La latitud ${lat} está fuera del rango de España (36-44) - verificar formato`
        });
    }

    if (lon < -10 || lon > 5) {
        errores.push({
            campo: "LONGITUD",
            valor: String(lon),
            mensaje: `La longitud ${lon} está fuera del rango de España (-10 a 5) - verificar formato`
        });
    }

    return errores;
}

/**
 * Valida horario
 */
export function validarHorario(horario: any): ErrorValidacion | null {
    const horarioStr = toStringValue(horario);

    if (!horarioStr || horarioStr.trim() === "") {
        return {
            campo: "HORARIOS",
            valor: horarioStr,
            mensaje: "El horario es obligatorio"
        };
    }

    // Validar que no sea un valor genérico poco informativo
    if (horarioStr.toLowerCase() === "n/a" ||
        horarioStr === "-" ||
        horarioStr.toLowerCase().includes("no especificado")) {
        return {
            campo: "HORARIOS",
            valor: horarioStr,
            mensaje: "El horario debe ser específico, no un valor genérico"
        };
    }

    return null;
}

/**
 * Función principal que valida todos los datos de una estación
 */
export function validarEstacionCompleta(estacion: any, origen: string): ResultadoValidacion {
    const errores: ErrorValidacion[] = [];
    const advertencias: ErrorValidacion[] = [];

    console.log(`\n🔍 Validando estación: ${estacion.MUNICIPIO || estacion.CONCELLO || estacion.municipi || "Sin nombre"}`);
    console.log("=".repeat(60));

    // Obtener tipo de estación primero para validaciones condicionales
    const tipoEstacion = estacion["TIPO ESTACIÓN"] || estacion["TIPO ESTACION"];

    // Validar provincia
    const provincia = estacion.PROVINCIA || estacion.provincia || estacion.serveis_territorials;
    const errorProvincia = validarProvincia(provincia);
    if (errorProvincia) {
        errores.push(errorProvincia);
        console.log(`❌ ${errorProvincia.campo}: "${errorProvincia.valor}" - ${errorProvincia.mensaje}`);
    } else {
        console.log(`✅ ${provincia} - Provincia válida`);
    }

    // Validar tipo de estación primero (para CV)
    if (tipoEstacion) {
        const errorTipo = validarTipoEstacion(tipoEstacion);
        if (errorTipo) {
            errores.push(errorTipo);
            console.log(`❌ ${errorTipo.campo}: "${errorTipo.valor}" - ${errorTipo.mensaje}`);
        } else {
            console.log(`✅ ${tipoEstacion} - Tipo válido`);
        }
    }

    // Validar municipio (opcional para móviles/agrícolas)
    const municipio = estacion.MUNICIPIO || estacion.CONCELLO || estacion.municipi;
    const errorMunicipio = validarMunicipio(municipio, provincia, tipoEstacion);
    if (errorMunicipio) {
        errores.push(errorMunicipio);
        console.log(`❌ ${errorMunicipio.campo}: "${errorMunicipio.valor}" - ${errorMunicipio.mensaje}`);
    } else {
        if (municipio && municipio !== "undefined") {
            console.log(`✅ ${municipio} - Municipio válido`);
        } else {
            console.log(`✅ Municipio no requerido (estación móvil/agrícola)`);
        }
    }

    // Validar código postal (opcional para móviles/agrícolas)
    const cp = estacion["C.POSTAL"] || estacion["CÓDIGO POSTAL"] || estacion["CDIGO POSTAL"] || estacion.cp;
    const errorCP = validarCodigoPostal(cp, provincia, tipoEstacion);
    if (errorCP) {
        errores.push(errorCP);
        console.log(`❌ ${errorCP.campo}: "${errorCP.valor}" - ${errorCP.mensaje}`);
    } else {
        if (cp && cp !== "undefined" && cp !== "" && String(cp) !== "0") {
            console.log(`✅ ${cp} - Código postal válido`);
        } else {
            console.log(`✅ Código postal no requerido (estación móvil/agrícola)`);
        }
    }

    // Validar dirección
    const direccion = estacion["DIRECCIÓN"] || estacion.ENDEREZO || estacion.adre_a;
    const errorDireccion = validarDireccion(direccion);
    if (errorDireccion) {
        errores.push(errorDireccion);
        console.log(`❌ ${errorDireccion.campo}: "${errorDireccion.valor}" - ${errorDireccion.mensaje}`);
    } else {
        console.log(`✅ Dirección válida`);
    }

    // Validar número de estación (solo para CV)
    if (estacion["Nº ESTACIÓN"]) {
        const errorNumero = validarNumeroEstacion(estacion["Nº ESTACIÓN"]);
        if (errorNumero) {
            errores.push(errorNumero);
            console.log(`❌ ${errorNumero.campo}: "${errorNumero.valor}" - ${errorNumero.mensaje}`);
        } else {
            console.log(`✅ ${estacion["Nº ESTACIÓN"]} - Número de estación válido`);
        }
    }

    // Validar email (solo para CV y GAL)
    if (estacion.CORREO || estacion["CORREO ELECTRÓNICO"] || estacion["CORREO ELECTRNICO"]) {
        const email = estacion.CORREO || estacion["CORREO ELECTRÓNICO"] || estacion["CORREO ELECTRNICO"];
        const errorEmail = validarEmail(email);
        if (errorEmail) {
            errores.push(errorEmail);
            console.log(`❌ ${errorEmail.campo}: "${errorEmail.valor}" - ${errorEmail.mensaje}`);
        } else {
            console.log(`✅ Email válido`);
        }
    }

    // Validar horario
    const horario = estacion.HORARIOS || estacion.HORARIO || estacion.horari_de_servei;
    const errorHorario = validarHorario(horario);
    if (errorHorario) {
        // Los horarios sin especificar son una advertencia, no un error crítico
        advertencias.push(errorHorario);
        console.log(`⚠️  ${errorHorario.campo}: ${errorHorario.mensaje}`);
    } else {
        console.log(`✅ Horario válido`);
    }

    console.log("=".repeat(60));

    if (errores.length > 0) {
        console.log(`\n❌ ESTACIÓN RECHAZADA: ${errores.length} error(es) encontrado(s)`);
        errores.forEach((err, i) => {
            console.log(`   ${i + 1}. ${err.campo}: ${err.mensaje}`);
        });
    } else {
        console.log(`\n✅ ESTACIÓN VÁLIDA: Todos los datos son correctos`);
    }

    if (advertencias.length > 0) {
        console.log(`\n⚠️  ${advertencias.length} advertencia(s):`);
        advertencias.forEach((adv, i) => {
            console.log(`   ${i + 1}. ${adv.campo}: ${adv.mensaje}`);
        });
    }

    return {
        esValido: errores.length === 0,
        errores,
        advertencias
    };
}
