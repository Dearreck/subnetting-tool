// ipUtils.js - Funciones de utilidad para IPv4

/**
 * Convierte una IP en formato string ("192.168.1.1") a un entero de 32 bits.
 * @param {string} ipString - La IP en formato string.
 * @returns {number|null} El entero de 32 bits o null si es inválida.
 */
function ipToInt(ipString) {
    if (!isValidIp(ipString)) return null;
    const octets = ipString.split('.').map(Number);
    return (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
}

/**
 * Convierte un entero de 32 bits a una IP en formato string.
 * @param {number} ipInt - El entero de 32 bits.
 * @returns {string} La IP en formato string.
 */
function intToIp(ipInt) {
    // Manejar signo si el número es negativo debido a > 2^31
    const uInt = ipInt >>> 0; // Tratar como sin signo
    const oct1 = (uInt >> 24) & 255;
    const oct2 = (uInt >> 16) & 255;
    const oct3 = (uInt >> 8) & 255;
    const oct4 = uInt & 255;
    return `${oct1}.${oct2}.${oct3}.${oct4}`;
}

/**
 * Valida si un string es una dirección IPv4 válida.
 * @param {string} ipString - El string a validar.
 * @returns {boolean} True si es válida, false si no.
 */
function isValidIp(ipString) {
    if (typeof ipString !== 'string') return false;
    const octets = ipString.split('.');
    if (octets.length !== 4) return false;
    return octets.every(octet => {
        const num = Number(octet);
        // Verifica que sea un número, no NaN, entero, y en rango 0-255
        // y que no tenga ceros a la izquierda (excepto si es "0")
        return !isNaN(num) && num >= 0 && num <= 255 && String(num) === octet;
    });
}


/**
 * Obtiene la longitud del prefijo (/XX) a partir de una máscara decimal punteada.
 * @param {string} maskString - Máscara en formato "255.255.255.0".
 * @returns {number|null} La longitud del prefijo o null si la máscara es inválida.
 */
function getPrefixLength(maskString) {
    if (!isValidIp(maskString)) return null; // Reusa la validación de IP
    const maskInt = ipToInt(maskString);
    // Verificar que la máscara sea contigua (bits 1 seguidos de bits 0)
    let inverted = (~maskInt) >>> 0; // Invierte y trata como sin signo
    if (((inverted + 1) & inverted) !== 0 && maskInt !== 0) {
         // Si (invertido+1) & invertido no es 0, no es una potencia de 2 (o 0),
         // por lo tanto la máscara original no era contigua (excepto 0.0.0.0).
         // Y máscara no puede ser 0.0.0.0 si queremos un prefijo válido > 0.
         // Caso especial 255.255.255.255 (maskInt = -1, inverted = 0) es válido.
        if (maskInt !== -1) return null;
    }

    let prefix = 0;
    let maskCheck = maskInt;
    while (maskCheck & 0x80000000) { // Mientras el bit más significativo sea 1
        prefix++;
        maskCheck <<= 1;
    }
    // Segunda validación, el resto debe ser 0
    if ((maskCheck << prefix) >>> 0 !== 0 && maskInt !== -1) return null; // Comprueba que los bits restantes sean 0

    return prefix;
}


/**
 * Obtiene la máscara decimal punteada a partir de una longitud de prefijo.
 * @param {number} prefix - Longitud del prefijo (0-32).
 * @returns {string|null} La máscara en formato string o null si el prefijo es inválido.
 */
function getMaskStringFromPrefix(prefix) {
    if (prefix < 0 || prefix > 32 || !Number.isInteger(prefix)) return null;
    if (prefix === 0) return "0.0.0.0";
    // Crear máscara: -1 << (32 - prefix) maneja el caso /32 correctamente
    // >>> 0 para asegurar que sea tratado como sin signo si es -1 (/32)
    const maskInt = ((-1 << (32 - prefix)) >>> 0);
    return intToIp(maskInt);
}

/**
 * Calcula la dirección de red.
 * @param {string} ipString - IP dentro de la red.
 * @param {string} maskString - Máscara de la red.
 * @returns {string|null} Dirección de red o null si entrada inválida.
 */
function getNetworkAddress(ipString, maskString) {
    const ipInt = ipToInt(ipString);
    const maskInt = ipToInt(maskString);
    if (ipInt === null || maskInt === null) return null;
    const networkInt = (ipInt & maskInt) >>> 0;
    return intToIp(networkInt);
}

/**
 * Calcula la dirección de broadcast.
 * @param {string} networkString - Dirección de red.
 * @param {string} maskString - Máscara de la red.
 * @returns {string|null} Dirección de broadcast o null si entrada inválida.
 */
function getBroadcastAddress(networkString, maskString) {
    const networkInt = ipToInt(networkString);
    const maskInt = ipToInt(maskString);
    if (networkInt === null || maskInt === null) return null;
     // Wildcard = NOT mask
    const wildcardInt = (~maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;
    return intToIp(broadcastInt);
}

/**
 * Calcula la primera dirección IP usable.
 * @param {string} networkString - Dirección de red.
 * @param {number} prefix - Prefijo de la red.
 * @returns {string|null} Primera IP usable o null si es /31 o /32.
 */
function getFirstUsableIp(networkString, prefix) {
    if (prefix >= 31) return null; // No hay IPs usables en /31 y /32
    const networkInt = ipToInt(networkString);
    if (networkInt === null) return null;
    const firstUsableInt = (networkInt + 1) >>> 0;
    return intToIp(firstUsableInt);
}

/**
 * Calcula la última dirección IP usable.
 * @param {string} broadcastString - Dirección de broadcast.
 * @param {number} prefix - Prefijo de la red.
 * @returns {string|null} Última IP usable o null si es /31 o /32.
 */
function getLastUsableIp(broadcastString, prefix) {
    if (prefix >= 31) return null;
    const broadcastInt = ipToInt(broadcastString);
    if (broadcastInt === null) return null;
    const lastUsableInt = (broadcastInt - 1) >>> 0;
    return intToIp(lastUsableInt);
}

/**
 * Calcula el número de hosts posibles en una subred dada su máscara o prefijo.
 * @param {number} prefix - Prefijo de la red.
 * @returns {number} Número total de hosts (2^n).
 */
function getTotalHosts(prefix) {
    if (prefix < 0 || prefix > 32) return 0;
    const hostBits = 32 - prefix;
    return Math.pow(2, hostBits);
}

/**
 * Calcula el número de hosts *usables* en una subred (Total - 2).
 * @param {number} prefix - Prefijo de la red.
 * @returns {number} Número de hosts usables (mínimo 0).
 */
function getUsableHosts(prefix) {
    if (prefix < 0 || prefix > 30) return 0; // /31 y /32 no tienen usables por la fórmula std.
    const hostBits = 32 - prefix;
    return Math.pow(2, hostBits) - 2;
}

/**
 * Determina la clase de una IP (A, B, C, D, E).
 * @param {string} ipString - La IP.
 * @returns {string|null} 'A', 'B', 'C', 'D', 'E' o null.
 */
function getIpClass(ipString) {
    const ipInt = ipToInt(ipString);
    if (ipInt === null) return null;
    const firstOctet = (ipInt >>> 24) & 255;
    if (firstOctet >= 1 && firstOctet <= 126) return 'A'; // 0.x.x.x y 127.x.x.x son especiales
    if (firstOctet >= 128 && firstOctet <= 191) return 'B';
    if (firstOctet >= 192 && firstOctet <= 223) return 'C';
    if (firstOctet >= 224 && firstOctet <= 239) return 'D'; // Multicast
    if (firstOctet >= 240 && firstOctet <= 255) return 'E'; // Experimental
    return null; // Para casos como 0.x o 127.x
}

/**
 * Obtiene la máscara de subred por defecto para una IP classful.
 * @param {string} ipString - La IP.
 * @returns {string|null} Máscara por defecto o null.
 */
function getDefaultMask(ipString) {
    const ipClass = getIpClass(ipString);
    switch (ipClass) {
        case 'A': return '255.0.0.0';
        case 'B': return '255.255.0.0';
        case 'C': return '255.255.255.0';
        default: return null; // Clases D, E o inválidas no tienen máscara por defecto en este contexto
    }
}

/**
 * Calcula el número de bits necesarios para N hosts (incluyendo red y broadcast).
 * 2^bits >= N + 2
 * @param {number} requiredHosts - Número de hosts usables requeridos.
 * @returns {number} Número de bits de host necesarios.
 */
function bitsForHosts(requiredHosts) {
    if (requiredHosts < 0) return 0;
    const totalAddressesNeeded = requiredHosts + 2;
    let hostBits = 0;
    while (Math.pow(2, hostBits) < totalAddressesNeeded) {
        hostBits++;
        if (hostBits > 32) return -1; // Imposible
    }
    return hostBits;
}

/**
 * Calcula el número de bits de subred necesarios para N subredes.
 * 2^bits >= N
 * @param {number} requiredSubnets - Número de subredes requeridas.
 * @returns {number} Número de bits de subred necesarios.
 */
function bitsForSubnets(requiredSubnets) {
    if (requiredSubnets <= 1) return 0;
    let subnetBits = 0;
    while (Math.pow(2, subnetBits) < requiredSubnets) {
        subnetBits++;
         if (subnetBits > 32) return -1; // Imposible
    }
    return subnetBits;
}

// --- Más funciones pueden ser necesarias ---
