/**
 * ipUtils.js - Biblioteca de funciones de utilidad para la manipulación de direcciones IPv4 y máscaras de subred.
 */

/**
 * Verifica si una cadena de texto representa una dirección IPv4 válida.
 * @param {string} ipString - La cadena de texto a validar.
 * @returns {boolean} True si la cadena es una dirección IPv4 válida, false en caso contrario.
 */
function isValidIp(ipString) {
    if (typeof ipString !== 'string' || ipString.trim() === '') {
        return false;
    }
    // Expresión regular para estructura básica y rango de octetos 0-255
    // Previene ceros a la izquierda a menos que el octeto sea "0"
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ipString)) {
        return false;
    }
    // Doble verificación de partes para ceros inválidos a la izquierda como 01, 001 etc.
    const octets = ipString.split('.');
    return octets.every(octet => octet === '0' || !octet.startsWith('0') || octet.length === 1);
}

/**
 * Convierte una cadena de IPv4 válida ("192.168.1.1") a su representación entera de 32 bits.
 * Trata los 32 bits como sin signo.
 * @param {string} ipString - La cadena de la dirección IPv4.
 * @returns {number|null} El entero de 32 bits sin signo, o null si la entrada es inválida.
 */
function ipToInt(ipString) {
    if (!isValidIp(ipString)) {
        console.error(`Cadena IP inválida para ipToInt: ${ipString}`);
        return null;
    }
    const octets = ipString.split('.').map(Number);
    // Desplaza los octetos a su lugar y combina usando OR a nivel de bits
    // Usa >>> 0 para asegurar que el resultado sea tratado como sin signo de 32 bits
    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

/**
 * Convierte una representación entera de 32 bits de una dirección IPv4 a su formato de cadena.
 * Maneja el entero como sin signo.
 * @param {number} ipInt - El entero de 32 bits sin signo.
 * @returns {string} La cadena de la dirección IPv4 (ej: "192.168.1.1").
 */
function intToIp(ipInt) {
    // Asegura que la entrada sea tratada como número, maneja entradas no numéricas con gracia
    const num = Number(ipInt);
    if (isNaN(num)) {
        console.error("Número inválido proporcionado a intToIp:", ipInt);
        return "0.0.0.0"; // O lanza un error, dependiendo de la rigurosidad deseada
    }
    // Extrae los octetos usando desplazamiento a la derecha y AND a nivel de bits
    const oct1 = (num >>> 24) & 255;
    const oct2 = (num >>> 16) & 255;
    const oct3 = (num >>> 8) & 255;
    const oct4 = num & 255;
    return `${oct1}.${oct2}.${oct3}.${oct4}`;
}

/**
 * Verifica si una cadena representa una máscara de subred IPv4 válida.
 * Una máscara válida tiene unos contiguos seguidos de ceros contiguos.
 * @param {string} maskString - La cadena de la máscara a validar (ej: "255.255.255.0").
 * @returns {boolean} True si la cadena es una máscara de subred válida, false en caso contrario.
 */
function isValidMask(maskString) {
    if (!isValidIp(maskString)) { // Verificación básica de formato IP
        return false;
    }
    const maskInt = ipToInt(maskString);
    if (maskInt === null) return false; // No debería ocurrir si isValidIp pasó, pero por si acaso

    // Una máscara válida (cuando se invierten los bits) resulta en un número tal que
    // al sumarle 1 se convierte en una potencia de 2 (o 0 para /0).
    // Ejemplo: 255.255.255.0 -> int -> invertir -> 0.0.0.255 (255) -> +1 -> 256 (potencia de 2)
    // Ejemplo: 255.255.255.192 -> int -> invertir -> 0.0.0.63 (63) -> +1 -> 64 (potencia de 2)
    // Ejemplo: 255.255.255.255 -> int -> invertir -> 0.0.0.0 (0) -> +1 -> 1 (potencia de 2)
    // Ejemplo: 0.0.0.0 -> int -> invertir -> 255.255.255.255 (-1 ó 0xFFFFFFFF) -> +1 -> 0
    const inverted = (~maskInt) >>> 0;
    const plusOne = (inverted + 1) >>> 0;

    // Verifica si plusOne es potencia de 2 (o 0).
    // Un número x es potencia de 2 si (x & (x - 1)) === 0 (y x > 0).
    // También permitimos 0 para el caso /0 (inverted=0xFFFFFFFF, plusOne=0).
    // El caso /32 (inverted=0, plusOne=1) también es manejado por la fórmula.
    if (plusOne === 0) return true; // Maneja la máscara /0 (0.0.0.0)
    return (plusOne & (plusOne - 1)) === 0;
}


/**
 * Calcula la longitud del prefijo (/XX) a partir de una cadena de máscara de subred válida.
 * @param {string} maskString - La cadena de la máscara de subred (ej: "255.255.255.0").
 * @returns {number|null} La longitud del prefijo (0-32), o null si la máscara es inválida.
 */
function getPrefixLength(maskString) {
    if (!isValidMask(maskString)) {
         console.error(`Cadena de máscara inválida para getPrefixLength: ${maskString}`);
        return null;
    }
    const maskInt = ipToInt(maskString);
    if (maskInt === null) return null; // Ya debería haber sido detectado por isValidMask

    let prefix = 0;
    let maskCheck = maskInt;
    // Cuenta el número de bits activos (1s) de izquierda a derecha
    // Una forma alternativa sin bucles por rendimiento (quizás menos legible):
    // let count = 0;
    // let n = maskInt;
    // while (n !== 0) {
    //   n = n & (n - 1); // Algoritmo de Brian Kernighan para contar bits activos
    //   count++;
    // }
    // return count;
    // Mantengamos el bucle más claro por ahora:
    for (let i = 0; i < 32; i++) {
        if ((maskCheck & 0x80000000) === 0x80000000) { // Verifica el bit más significativo
            prefix++;
            maskCheck <<= 1; // Desplaza a la izquierda para verificar el siguiente bit
        } else {
            break; // Detiene el conteo al encontrar un 0
        }
    }
    return prefix;
}

/**
 * Calcula la cadena de la máscara de subred a partir de la longitud del prefijo.
 * @param {number} prefix - La longitud del prefijo (0-32).
 * @returns {string|null} La cadena de la máscara de subred, o null si el prefijo es inválido.
 */
function getMaskStringFromPrefix(prefix) {
    if (prefix < 0 || prefix > 32 || !Number.isInteger(prefix)) {
        console.error(`Prefijo inválido para getMaskStringFromPrefix: ${prefix}`);
        return null;
    }
    if (prefix === 0) {
        return "0.0.0.0";
    }
    // Calcula el entero de la máscara: -1 desplazado a la izquierda por (32 - prefijo) bits
    // Usa >>> 0 para asegurar que el resultado sea tratado como sin signo de 32 bits
    const maskInt = ((-1 << (32 - prefix)) >>> 0);
    return intToIp(maskInt);
}

/**
 * Analiza (parsea) una cadena CIDR (ej: "192.168.1.0/24") en sus componentes.
 * @param {string} cidrString - La cadena en notación CIDR.
 * @returns {{ip: string, prefix: number, mask: string}|null} Un objeto con ip, prefijo y máscara, o null si es inválido.
 */
function parseIpAndPrefix(cidrString) {
    if (typeof cidrString !== 'string') return null;
    const parts = cidrString.split('/');
    if (parts.length !== 2) return null;

    const ip = parts[0];
    const prefixStr = parts[1];
    const prefix = parseInt(prefixStr, 10);

    if (!isValidIp(ip) || isNaN(prefix) || prefix < 0 || prefix > 32) {
        return null;
    }

    const mask = getMaskStringFromPrefix(prefix);
    if (!mask) return null; // No debería ocurrir si el prefijo es válido

    return { ip, prefix, mask };
}


/**
 * Calcula la dirección de red dada una IP y su máscara o prefijo.
 * @param {string} ipString - Una dirección IP dentro de la red.
 * @param {string|number} maskOrPrefix - La cadena de la máscara de subred o la longitud del prefijo.
 * @returns {string|null} La cadena de la dirección de red, o null si las entradas son inválidas.
 */
function getNetworkAddress(ipString, maskOrPrefix) {
    const ipInt = ipToInt(ipString);
    if (ipInt === null) return null;

    let maskInt;
    if (typeof maskOrPrefix === 'number') { // La entrada es prefijo
        const maskString = getMaskStringFromPrefix(maskOrPrefix);
        if (!maskString) return null;
        maskInt = ipToInt(maskString);
    } else if (typeof maskOrPrefix === 'string') { // La entrada es cadena de máscara
         if (!isValidMask(maskOrPrefix)) return null;
        maskInt = ipToInt(maskOrPrefix);
    } else {
        return null; // Tipo inválido para máscara/prefijo
    }

    if (maskInt === null) return null;

    const networkInt = (ipInt & maskInt) >>> 0;
    return intToIp(networkInt);
}

/**
 * Calcula la dirección de broadcast dada una dirección de red y su máscara o prefijo.
 * @param {string} networkString - La cadena de la dirección de red.
 * @param {string|number} maskOrPrefix - La cadena de la máscara de subred o la longitud del prefijo.
 * @returns {string|null} La cadena de la dirección de broadcast, o null si las entradas son inválidas.
 */
function getBroadcastAddress(networkString, maskOrPrefix) {
    const networkInt = ipToInt(networkString);
    if (networkInt === null) return null;

    let maskInt;
    let prefix;
    if (typeof maskOrPrefix === 'number') { // La entrada es prefijo
        prefix = maskOrPrefix;
        const maskString = getMaskStringFromPrefix(prefix);
        if (!maskString) return null;
        maskInt = ipToInt(maskString);
    } else if (typeof maskOrPrefix === 'string') { // La entrada es cadena de máscara
         if (!isValidMask(maskOrPrefix)) return null;
        maskInt = ipToInt(maskOrPrefix);
        prefix = getPrefixLength(maskOrPrefix); // Necesita prefijo para casos especiales
         if (prefix === null) return null;
    } else {
        return null; // Tipo inválido para máscara/prefijo
    }
    if (maskInt === null) return null;

    // Maneja /32 explícitamente - broadcast es igual a la dirección de red
    if (prefix === 32) {
        return networkString;
    }
    // Maneja /31 explícitamente - el concepto de broadcast estándar no aplica igual.
    // La fórmula estándar (Net | ~Mask) calcula la dirección superior del par /31.
    if (prefix === 31) {
        // networkInt | (~maskInt) dará la dirección superior en el par /31
        // ej. 192.168.1.0/31 -> Net=0, Mask=...FE, ~Mask=1 -> Broadcast=1 (Dirección superior)
    }

    // Wildcard = NOT máscara
    const wildcardInt = (~maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;
    return intToIp(broadcastInt);
}

/**
 * Calcula la primera dirección IP de host utilizable en una subred.
 * Devuelve null para prefijos /31 y /32 ya que no tienen rango utilizable estándar.
 * @param {string} networkString - La cadena de la dirección de red.
 * @param {number} prefix - La longitud del prefijo de la red.
 * @returns {string|null} La cadena de la primera IP utilizable, o null.
 */
function getFirstUsableIp(networkString, prefix) {
    if (prefix < 0 || prefix > 30 || !Number.isInteger(prefix)) {
        // Solo /0 a /30 tienen un rango utilizable estándar > 0
        return null;
    }
    const networkInt = ipToInt(networkString);
    if (networkInt === null) return null;
    // La primera utilizable es dirección de red + 1
    const firstUsableInt = (networkInt + 1) >>> 0;
    return intToIp(firstUsableInt);
}

/**
 * Calcula la última dirección IP de host utilizable en una subred.
 * Devuelve null para prefijos /31 y /32.
 * @param {string} broadcastString - La cadena de la dirección de broadcast.
 * @param {number} prefix - La longitud del prefijo de la red.
 * @returns {string|null} La cadena de la última IP utilizable, o null.
 */
function getLastUsableIp(broadcastString, prefix) {
     if (prefix < 0 || prefix > 30 || !Number.isInteger(prefix)) {
        // Solo /0 a /30 tienen un rango utilizable estándar > 0
        return null;
    }
    const broadcastInt = ipToInt(broadcastString);
    if (broadcastInt === null) return null;
    // La última utilizable es dirección de broadcast - 1
    const lastUsableInt = (broadcastInt - 1) >>> 0;

    // Verificación de seguridad: asegura que la última utilizable no sea menor que red+1 (maneja caso /30)
    const networkInt = (broadcastInt & ipToInt(getMaskStringFromPrefix(prefix))) >>> 0;
    if(lastUsableInt <= networkInt) return null; // Solo debería ocurrir para /31, /32 ya están excluidos

    return intToIp(lastUsableInt);
}


/**
 * Calcula el número total de direcciones en una subred basado en la longitud del prefijo (2^(32-prefijo)).
 * @param {number} prefix - La longitud del prefijo (0-32).
 * @returns {number} El número total de direcciones, o 0 si el prefijo es inválido.
 */
function getTotalHosts(prefix) {
    if (prefix < 0 || prefix > 32 || !Number.isInteger(prefix)) {
        return 0;
    }
    const hostBits = 32 - prefix;
    // Para 2^32, el número estándar de JS es suficiente.
    return Math.pow(2, hostBits);
}

/**
 * Calcula el número de direcciones de host utilizables en una subred (Total - 2).
 * Devuelve 0 para prefijos /31 y /32.
 * @param {number} prefix - La longitud del prefijo (0-32).
 * @returns {number} El número de direcciones de host utilizables (mínimo 0).
 */
function getUsableHosts(prefix) {
    if (prefix < 0 || prefix > 30 || !Number.isInteger(prefix)) {
        // Definición estándar: hosts utilizables = 2^n - 2, solo aplica hasta /30
        return 0;
    }
    const hostBits = 32 - prefix;
    return Math.pow(2, hostBits) - 2;
}

/**
 * Determina la clase IP por defecto ('A', 'B', 'C', 'D', 'E') basado en el primer octeto.
 * Nota: Considera 0.x.x.x y 127.x.x.x como Clase A por definición de rango.
 * @param {string} ipString - La cadena de la dirección IPv4.
 * @returns {string|null} La clase ('A', 'B', 'C', 'D', 'E'), o null si es inválida.
 */
function getIpClass(ipString) {
    const ipInt = ipToInt(ipString);
    if (ipInt === null) return null;
    const firstOctet = (ipInt >>> 24) & 255; // Obtiene el primer octeto

    if (firstOctet >= 1 && firstOctet <= 126) return 'A'; // Rango estándar Clase A
    if (firstOctet === 127) return 'A'; // Loopback - técnicamente rango Clase A
    if (firstOctet >= 128 && firstOctet <= 191) return 'B';
    if (firstOctet >= 192 && firstOctet <= 223) return 'C';
    if (firstOctet >= 224 && firstOctet <= 239) return 'D'; // Multicast
    if (firstOctet >= 240 && firstOctet <= 255) return 'E'; // Experimental
    // Nota: El rango 0.x.x.x es especial, a menudo considerado red Clase A 0
    if (firstOctet === 0) return 'A';

    return null; // No debería alcanzarse si isValidIp funciona
}

/**
 * Obtiene la cadena de la máscara de subred por defecto para una IP dada, basada en su clase.
 * @param {string} ipString - La cadena de la dirección IPv4.
 * @returns {string|null} La máscara por defecto ("255.0.0.0", "255.255.0.0", "255.255.255.0"), o null si no es Clase A, B, o C.
 */
function getDefaultMask(ipString) {
    const ipClass = getIpClass(ipString);
    switch (ipClass) {
        case 'A': return '255.0.0.0';
        case 'B': return '255.255.0.0';
        case 'C': return '255.255.255.0';
        default: return null; // Las clases D, E no tienen máscara por defecto en este contexto
    }
}

/**
 * Calcula el número mínimo de bits de host requeridos para acomodar un número dado de hosts utilizables.
 * Fórmula: 2^bitsHost >= hostsRequeridos + 2
 * @param {number} requiredHosts - El número requerido de hosts utilizables.
 * @returns {number} El número mínimo de bits de host necesarios (0-32), o -1 si es imposible.
 */
function bitsForHosts(requiredHosts) {
    if (requiredHosts < 0 || !Number.isInteger(requiredHosts)) return -1; // Requisito inválido
    if (requiredHosts === 0) return 2; // Incluso 0 hosts utilizables necesitan red/broadcast -> min /30 -> 2 bits

    const totalAddressesNeeded = requiredHosts + 2;
    let hostBits = 0;
    // Encuentra los bitsHost más pequeños tal que 2^bitsHost >= totalAddressesNeeded
    while (Math.pow(2, hostBits) < totalAddressesNeeded) {
        hostBits++;
        if (hostBits > 32) return -1; // No se puede acomodar
    }
    // Seguridad caso especial: asegura no devolver bitsHost=0 o 1 si se necesitan más de 0 hosts
     if (requiredHosts > 0 && hostBits < 2) {
         return 2; // Mínimo 2 bits necesarios para >0 hosts utilizables
     }

    return hostBits;
}


/**
 * Calcula el número mínimo de bits de subred requeridos para crear un número dado de subredes.
 * Fórmula: 2^bitsSubred >= subredesRequeridas
 * @param {number} requiredSubnets - El número requerido de subredes.
 * @returns {number} El número mínimo de bits de subred necesarios, o -1 si es imposible.
 */
function bitsForSubnets(requiredSubnets) {
    if (requiredSubnets <= 0 || !Number.isInteger(requiredSubnets)) return -1; // Requisito inválido
    if (requiredSubnets === 1) return 0; // 1 subred requiere 0 bits extra

    let subnetBits = 0;
     // Encuentra los bitsSubred más pequeños tal que 2^bitsSubred >= subredesRequeridas
    while (Math.pow(2, subnetBits) < requiredSubnets) {
        subnetBits++;
        if (subnetBits > 32) return -1; // No se puede acomodar
    }
    return subnetBits;
}

/**
 * Calcula la dirección de red del siguiente bloque de subred adyacente.
 * Dada una red y su prefijo, encuentra la dirección de inicio del bloque inmediatamente siguiente.
 * @param {string} networkString - La cadena de la dirección de red del bloque actual.
 * @param {number} prefix - La longitud del prefijo del bloque actual.
 * @returns {string|null} La cadena de la dirección de red del siguiente bloque, o null en caso de error o desbordamiento.
 */
function getNextAvailableNetwork(networkString, prefix) {
    if (prefix < 0 || prefix > 32 || !Number.isInteger(prefix)) return null;
    const networkInt = ipToInt(networkString);
    if (networkInt === null) return null;

    // No se puede obtener la siguiente red si el prefijo es /0 (cubre todo)
    if (prefix === 0) return null;
    // Permitamos /31, la siguiente es +2. Para /32, la siguiente es +1.

    const blockSize = getTotalHosts(prefix); // Direcciones totales en el bloque
    if (blockSize === 0) return null; // No debería ocurrir para prefijo válido > /32

    // Calcula la siguiente dirección de red
    // La suma simple debería envolver correctamente gracias a >>> 0
    const nextNetworkInt = (networkInt + blockSize) >>> 0;

    // Verifica si dimos la vuelta (ej: la siguiente red es 0.0.0.0 cuando no debería serlo)
    // o si no avanzamos (caso /32 donde blockSize=1, next=net+1)
    // Una mejor verificación: si la nueva dirección es menor o igual que la anterior (y no era 0)
    if (nextNetworkInt <= networkInt && networkInt !== 0) {
        // Probablemente dimos la vuelta o agotamos el espacio
        return null; // Indica que no hay más redes disponibles
    }

    return intToIp(nextNetworkInt);
}

// --- Fin de ipUtils.js ---
