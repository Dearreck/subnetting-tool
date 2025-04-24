/**
 * subnetLogic.js - Lógica principal para calcular subredes IPv4.
 * Utiliza las funciones definidas en ipUtils.js.
 * Asume que las funciones de ipUtils.js están disponibles globalmente
 * o serían importadas si se usara un sistema de módulos.
 */

/**
 * Calcula las subredes para un escenario de subneteo Classful.
 *
 * @param {string} networkIp - La dirección IP de la red a segmentar (ej: "192.168.1.0").
 * @param {object} requirement - El requisito para el subneteo.
 * @param {'subnets'|'hosts'} requirement.type - El tipo de requisito ('subnets' o 'hosts').
 * @param {number} requirement.value - El valor numérico del requisito (cantidad de subredes o hosts).
 * @returns {{success: boolean, data: object[]|null, error: string|null}} - Objeto con resultados o error.
 * data: Array de objetos, cada uno representando una subred calculada.
 */
function calculateClassful(networkIp, requirement) {
    // 1. Validar IP de entrada y determinar clase/máscara por defecto
    if (!isValidIp(networkIp)) {
        return { success: false, data: null, error: "La dirección IP de red proporcionada no es válida." };
    }

    const ipClass = getIpClass(networkIp);
    const defaultMask = getDefaultMask(networkIp);

    if (!defaultMask) {
        return { success: false, data: null, error: `La IP ${networkIp} pertenece a la Clase ${ipClass}, la cual no es directamente subnetable como A, B o C.` };
    }

    const defaultPrefix = getPrefixLength(defaultMask);
    // Asegurarse de trabajar con la dirección de red correcta
    const actualNetworkAddress = getNetworkAddress(networkIp, defaultMask);
     if (actualNetworkAddress === null) {
         // Esto no debería ocurrir si las validaciones anteriores pasaron
         return { success: false, data: null, error: "No se pudo determinar la dirección de red base." };
     }

    // 2. Validar el requisito
    if (!requirement || (requirement.type !== 'subnets' && requirement.type !== 'hosts') || typeof requirement.value !== 'number' || requirement.value <= 0 || !Number.isInteger(requirement.value)) {
        return { success: false, data: null, error: "El requisito proporcionado (tipo o valor) no es válido." };
    }

    let newPrefix;
    let neededBits;

    // 3. Calcular el nuevo prefijo basado en el requisito
    if (requirement.type === 'subnets') {
        neededBits = bitsForSubnets(requirement.value);
        if (neededBits === -1) {
            return { success: false, data: null, error: `Imposible crear ${requirement.value} subredes.` };
        }
        newPrefix = defaultPrefix + neededBits;
    } else { // requirement.type === 'hosts'
        neededBits = bitsForHosts(requirement.value);
         if (neededBits === -1) {
            return { success: false, data: null, error: `Imposible alojar ${requirement.value} hosts utilizables por subred.` };
        }
         // El prefijo se calcula restando los bits de host necesarios de 32
        newPrefix = 32 - neededBits;
    }

    // 4. Validar el nuevo prefijo calculado
    if (newPrefix < defaultPrefix) {
         return { success: false, data: null, error: `El requisito de ${requirement.value} ${requirement.type === 'hosts' ? 'hosts' : ''} resulta en una máscara (${getMaskStringFromPrefix(newPrefix)}) más pequeña que la máscara por defecto de la clase (${defaultMask}). Esto no es subneteo estándar.` };
    }
    if (newPrefix > 30) { // Límite estándar para tener hosts utilizables
        // Podríamos permitir /31, /32 pero advertir. Por ahora, error si se piden hosts.
        if (requirement.type === 'hosts' && requirement.value > 0) {
             return { success: false, data: null, error: `El requisito de ${requirement.value} hosts necesita un prefijo /${newPrefix}, que no permite hosts utilizables según la definición estándar.` };
        }
        // Si se pidieron subredes y resulta en > /30, podría ser válido (ej. redes p2p) pero sin hosts usables.
        // Vamos a permitirlo pero los rangos usables serán null.
         if (newPrefix > 32) {
             return { success: false, data: null, error: `El prefijo calculado /${newPrefix} es inválido.` };
         }
    }
     if (newPrefix === defaultPrefix && requirement.type === 'subnets' && requirement.value > 1) {
          return { success: false, data: null, error: `Se requiere al menos 1 bit de subred para crear más de 1 subred. No se puede subnetear con la máscara por defecto.` };
     }
      if (newPrefix === defaultPrefix && requirement.type === 'hosts') {
           const maxHostsDefault = getUsableHosts(defaultPrefix);
            if (requirement.value > maxHostsDefault) {
                return { success: false, data: null, error: `La red por defecto /${defaultPrefix} solo soporta ${maxHostsDefault} hosts utilizables. Se solicitaron ${requirement.value}.` };
            }
            // Si cabe y no se necesitan bits extra, técnicamente es una sola 'subred' (la original)
            // Devolver la red original como única subred.
      }


    const newMaskString = getMaskStringFromPrefix(newPrefix);
    if (!newMaskString) {
         return { success: false, data: null, error: "Error interno al calcular la nueva máscara de subred." };
    }

    // 5. Iterar y calcular todas las subredes generadas
    const results = [];
    let currentNetworkString = actualNetworkAddress;
    // El número de subredes generadas es 2^(bits de subred tomados)
    const subnetBitsBorrowed = newPrefix - defaultPrefix;
    const numGeneratedSubnets = Math.pow(2, subnetBitsBorrowed);

    for (let i = 0; i < numGeneratedSubnets; i++) {
        if (currentNetworkString === null) {
            // Se agotó el espacio inesperadamente (no debería pasar si la lógica es correcta)
            console.error("Error: Se agotó el espacio de direcciones inesperadamente en Classful.");
            break;
        }

        const broadcastAddress = getBroadcastAddress(currentNetworkString, newPrefix);
        const firstUsable = getFirstUsableIp(currentNetworkString, newPrefix);
        const lastUsable = getLastUsableIp(broadcastAddress, newPrefix); // broadcast es null si newPrefix > 30
        const totalHostsNum = getTotalHosts(newPrefix);
        const usableHostsNum = getUsableHosts(newPrefix);


        results.push({
            name: `Subred ${i + 1}`,
            networkAddress: currentNetworkString,
            prefix: newPrefix,
            mask: newMaskString,
            firstUsable: firstUsable,
            lastUsable: lastUsable,
            broadcastAddress: broadcastAddress,
            totalHosts: totalHostsNum,
            usableHosts: usableHostsNum,
        });

        // Calcular la siguiente dirección de red para la próxima iteración
        currentNetworkString = getNextAvailableNetwork(currentNetworkString, newPrefix);
    }

    // Si después del bucle currentNetworkString no es null, podría indicar un cálculo erróneo de numGeneratedSubnets
    // o un problema en getNextAvailableNetwork, pero lo omitimos por simplicidad ahora.

    if (results.length === 0 && newPrefix === defaultPrefix){
         // Caso especial: se pidió 1 subred o los hosts cabían en la red original
         const broadcastAddress = getBroadcastAddress(actualNetworkAddress, defaultPrefix);
         const firstUsable = getFirstUsableIp(actualNetworkAddress, defaultPrefix);
         const lastUsable = getLastUsableIp(broadcastAddress, defaultPrefix);
         const totalHostsNum = getTotalHosts(defaultPrefix);
         const usableHostsNum = getUsableHosts(defaultPrefix);
         results.push({
            name: `Red Original`,
            networkAddress: actualNetworkAddress,
            prefix: defaultPrefix,
            mask: defaultMask,
            firstUsable: firstUsable,
            lastUsable: lastUsable,
            broadcastAddress: broadcastAddress,
            totalHosts: totalHostsNum,
            usableHosts: usableHostsNum,
        });
    }

    return { success: true, data: results, error: null };
}


/**
 * Calcula las subredes para un escenario VLSM (Variable Length Subnet Mask).
 *
 * @param {string} networkIpWithPrefix - La dirección de red inicial con su prefijo (ej: "172.16.0.0/22").
 * @param {object[]} requirements - Array de objetos, cada uno con {hosts: number, name?: string}.
 * IMPORTANTE: Se espera que este array ya esté ordenado DESCENDENTEMENTE por 'hosts'.
 * @returns {{success: boolean, data: object[]|null, error: string|null}} - Objeto con resultados o error.
 * data: Array de objetos, cada uno representando una subred VLSM asignada.
 */
function calculateVLSM(networkIpWithPrefix, requirements) {
    // 1. Validar y parsear la red inicial
    const initialNetworkInfo = parseIpAndPrefix(networkIpWithPrefix);
    if (!initialNetworkInfo) {
        return { success: false, data: null, error: "La red/prefijo inicial proporcionada no es válida." };
    }
    const startNetworkInt = ipToInt(initialNetworkInfo.ip);
    const startPrefix = initialNetworkInfo.prefix;
    // Calcular el final del bloque padre para validación
    const parentBroadcastInt = ipToInt(getBroadcastAddress(initialNetworkInfo.ip, startPrefix));

     if (startNetworkInt === null || parentBroadcastInt === null) {
           return { success: false, data: null, error: "Error interno al procesar la red inicial." };
     }

    // 2. Validar requisitos (básico)
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return { success: false, data: null, error: "Se requiere una lista de requisitos de hosts." };
    }
    // Clonar y validar cada requisito (asumimos que ya viene ordenado, pero podríamos re-ordenar por seguridad)
     const sortedRequirements = [...requirements]
         .filter(req => req && typeof req.hosts === 'number' && req.hosts >= 0 && Number.isInteger(req.hosts)) // Filtrar inválidos
         .sort((a, b) => b.hosts - a.hosts); // Re-ordenar por si acaso

     if (sortedRequirements.length !== requirements.length) {
         console.warn("Se filtraron algunos requisitos de VLSM inválidos.");
     }
      if (sortedRequirements.length === 0) {
           return { success: false, data: null, error: "No hay requisitos de hosts válidos para procesar." };
      }


    // 3. Iterar y asignar bloques
    const results = [];
    let currentAvailableNetworkInt = startNetworkInt;
    let currentAvailableNetworkString = initialNetworkInfo.ip; // Usamos el string para las funciones de ipUtils

    for (let i = 0; i < sortedRequirements.length; i++) {
        const req = sortedRequirements[i];
        const requiredHosts = req.hosts;
        const subnetName = req.name || `Subred ${i + 1}`;

        if (currentAvailableNetworkString === null) {
            return { success: false, data: results, error: `No hay más espacio disponible después de asignar ${i} subredes.` };
        }

        // Calcular prefijo necesario para este requisito
        const hostBitsNeeded = bitsForHosts(requiredHosts);
        if (hostBitsNeeded === -1) {
             return { success: false, data: results, error: `Imposible alojar ${requiredHosts} hosts para '${subnetName}'.` };
        }
        const requiredPrefix = 32 - hostBitsNeeded;

        // Validar si el prefijo requerido es válido y cabe en el bloque padre
        if (requiredPrefix < startPrefix) {
             return { success: false, data: results, error: `El requisito para '${subnetName}' (${requiredHosts} hosts -> /${requiredPrefix}) necesita una red más grande que el bloque inicial /${startPrefix}.` };
        }
         if (requiredPrefix > 32) { // Aunque bitsForHosts debería prevenir > /30 para hosts > 0
               return { success: false, data: results, error: `Prefijo inválido /${requiredPrefix} calculado para '${subnetName}'.` };
         }

        // Encontrar el siguiente bloque disponible que esté alineado con el requiredPrefix
        // Si la red actual no está alineada, saltar hasta la siguiente alineada.
        let alignedNetworkInt = currentAvailableNetworkInt;
        let alignedNetworkString = currentAvailableNetworkString;
        const requiredMaskInt = ipToInt(getMaskStringFromPrefix(requiredPrefix));
        if(requiredMaskInt === null) return { success: false, data: results, error: "Error interno calculando máscara requerida." };

        // Verificar alineación: network_calculada = ip_actual & mascara_requerida
        let checkAlignmentNetInt = (alignedNetworkInt & requiredMaskInt) >>> 0;
        while (checkAlignmentNetInt !== alignedNetworkInt) {
            // No está alineado. Saltar al inicio del siguiente bloque del tamaño ACTUAL disponible
            // Esto es complejo. Simplificación: Asumimos que el espacio es contiguo y
            // necesitamos encontrar el siguiente bloque TAMAÑO REQUERIDO que comience
            // en o después de currentAvailableNetworkInt.

            // Estrategia más simple: calcular el siguiente bloque del TAMAÑO REQUERIDO
            // que empieza DESPUÉS del inicio del bloque anterior (si i > 0) o en el inicio (si i=0).
            // Si currentAvailableNetworkInt no está alineado con requiredPrefix, debemos encontrar
            // el siguiente punto de alineación.
             alignedNetworkInt = ((alignedNetworkInt + getTotalHosts(requiredPrefix)) & requiredMaskInt) >>> 0; // Saltar y realinear? No, esto está mal.

             // Corrección: Si no está alineado, ¿cuál es el siguiente punto de alineación?
             // Es la dirección de red que se obtendría si forzáramos la máscara.
             const calculatedNetworkForCurrent = (currentAvailableNetworkInt & requiredMaskInt) >>> 0;
             if (calculatedNetworkForCurrent < currentAvailableNetworkInt) {
                 // El punto de alineación está antes, así que debemos saltar al *siguiente* punto de alineación
                 alignedNetworkInt = (calculatedNetworkForCurrent + getTotalHosts(requiredPrefix)) >>> 0;
             } else {
                 // El punto de alineación es donde estamos o justo adelante
                 alignedNetworkInt = calculatedNetworkForCurrent;
             }


            // Actualizar string y re-verificar alineación para el bucle
            alignedNetworkString = intToIp(alignedNetworkInt);
            checkAlignmentNetInt = (alignedNetworkInt & requiredMaskInt) >>> 0; // Recalcular con el nuevo alineado

             // ¡Importante! Verificar si el nuevo punto de alineación sigue dentro del bloque padre
             if (alignedNetworkInt > parentBroadcastInt || alignedNetworkInt < currentAvailableNetworkInt) { // < check previene wrap-around infinito
                 return { success: false, data: results, error: `No se encontró un bloque alineado para /${requiredPrefix} dentro del espacio restante para '${subnetName}'.` };
             }
        }
        // Ahora alignedNetworkInt/String está alineado para el requiredPrefix


        // Calcular el broadcast de este bloque potencial
        const potentialBroadcastInt = ipToInt(getBroadcastAddress(alignedNetworkString, requiredPrefix));
        if(potentialBroadcastInt === null) return { success: false, data: results, error: "Error interno calculando broadcast potencial." };


        // Verificar si este bloque cabe DENTRO del bloque padre
        if (alignedNetworkInt < currentAvailableNetworkInt || // No deberia pasar con la corrección de alineación
            alignedNetworkInt > parentBroadcastInt ||
            potentialBroadcastInt > parentBroadcastInt)
        {
            return { success: false, data: results, error: `Espacio insuficiente para asignar /${requiredPrefix} para '${subnetName}'. El bloque se saldría de la red padre /${startPrefix}.` };
        }

        // ¡Asignación exitosa! Calcular detalles
        const assignedMaskString = getMaskStringFromPrefix(requiredPrefix);
        const assignedBroadcastString = intToIp(potentialBroadcastInt);
        const firstUsable = getFirstUsableIp(alignedNetworkString, requiredPrefix);
        const lastUsable = getLastUsableIp(assignedBroadcastString, requiredPrefix);
        const totalHostsNum = getTotalHosts(requiredPrefix);
        const usableHostsNum = getUsableHosts(requiredPrefix);

        results.push({
            name: subnetName,
            networkAddress: alignedNetworkString,
            prefix: requiredPrefix,
            mask: assignedMaskString,
            firstUsable: firstUsable,
            lastUsable: lastUsable,
            broadcastAddress: assignedBroadcastString,
            requestedHosts: requiredHosts, // Guardar lo que se pidió
            usableHosts: usableHostsNum,    // Guardar lo que realmente se obtiene
            totalHosts: totalHostsNum,
        });

        // Actualizar el puntero a la siguiente dirección disponible
        // Es la dirección inmediatamente después del broadcast de la red recién asignada.
        currentAvailableNetworkInt = (potentialBroadcastInt + 1) >>> 0;
        currentAvailableNetworkString = intToIp(currentAvailableNetworkInt);

        // Verificar si la siguiente disponible se salió del bloque padre
         if (currentAvailableNetworkInt > parentBroadcastInt && i < sortedRequirements.length - 1) {
             // Se asignó la última parte, pero aún quedan requisitos
              return { success: false, data: results, error: `Se asignó espacio para '${subnetName}', pero no queda espacio para requisitos posteriores.` };
         }
          if (currentAvailableNetworkInt === 0 && potentialBroadcastInt !== ipToInt("255.255.255.255")) {
               // Si la siguiente es 0.0.0.0 pero no venimos de asignar hasta el final, hubo wrap-around.
                return { success: false, data: results, error: `Se detectó desbordamiento de espacio de direcciones después de asignar '${subnetName}'.` };
          }


    } // Fin del bucle for requirements

    return { success: true, data: results, error: null };
}


// --- Fin de subnetLogic.js ---
