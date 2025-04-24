/**
 * exerciseGenerator.js - Lógica para generar ejercicios de subneteo.
 * Utiliza las funciones de ipUtils.js y subnetLogic.js.
 */

/**
 * Genera un número entero aleatorio dentro de un rango [min, max] (ambos inclusive).
 * @param {number} min - El valor mínimo.
 * @param {number} max - El valor máximo.
 * @returns {number} Un entero aleatorio dentro del rango.
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera un problema de subneteo Classful aleatorio.
 *
 * @param {string} difficulty - Nivel de dificultad ('easy', 'medium', 'hard'). Afecta la clase y complejidad. (Actualmente simplificado)
 * @returns {{problem: object, solution: object[]}|null} - Objeto con el problema y la solución, o null si falla la generación.
 */
function generateClassfulProblem(difficulty = 'medium') {
    let attempts = 0;
    const maxAttempts = 10; // Evita bucles infinitos si algo va mal

    while (attempts < maxAttempts) {
        attempts++;
        let baseIp = '';
        let ipClass = '';
        let defaultPrefix = 0;

        // 1. Generar Red Base Aleatoria (Privada)
        const classChoice = getRandomInt(1, 3); // 1=C, 2=B, 3=A (Favorecer C/B)
        if (classChoice === 1) { // Clase C
            ipClass = 'C';
            defaultPrefix = 24;
            baseIp = `192.168.${getRandomInt(0, 255)}.0`;
        } else if (classChoice === 2) { // Clase B
            ipClass = 'B';
            defaultPrefix = 16;
            baseIp = `172.${getRandomInt(16, 31)}.${getRandomInt(0, 255)}.0`;
        } else { // Clase A
            ipClass = 'A';
            defaultPrefix = 8;
            baseIp = `10.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.0`;
        }

        // Validar la IP generada (por si acaso)
        if (!isValidIp(baseIp)) continue; // Intentar de nuevo

        // 2. Generar Requisito Aleatorio (Subredes o Hosts)
        const requirementType = Math.random() < 0.5 ? 'subnets' : 'hosts';
        let requirementValue = 0;
        const maxAllowedPrefix = 30; // Límite para tener hosts usables estándar

        if (requirementType === 'subnets') {
            // Calcular bits disponibles para subredes
            const availableSubnetBits = maxAllowedPrefix - defaultPrefix;
            if (availableSubnetBits <= 0) continue; // No se puede subnetear más

            // Generar un número de bits de subred a usar (al menos 1)
            const subnetBitsToUse = getRandomInt(1, availableSubnetBits);
            // Calcular el número de subredes (entre 2 y 2^bits)
            // Generamos un valor entre 2 y el máximo posible para variar
            const minSubnets = 2;
            const maxSubnets = Math.pow(2, subnetBitsToUse);
             // Asegurar que pedimos un número realista, no siempre la potencia de 2 exacta
            requirementValue = getRandomInt(minSubnets, maxSubnets);
             // Caso especial: si maxSubnets es 2, el valor debe ser 2
             if (maxSubnets === 2) requirementValue = 2;


        } else { // requirementType === 'hosts'
            // Calcular bits disponibles para hosts en la red por defecto
            const availableHostBits = 32 - defaultPrefix;
            if (availableHostBits <= 2) continue; // No hay suficientes bits para pedir hosts (>0)

            // Generar un número de bits de host necesarios (entre 2 y los disponibles - 1)
            // Necesitamos al menos 1 bit para la red (subnetear)
            const hostBitsToUse = getRandomInt(2, availableHostBits - 1);
            const maxHostsForBits = getUsableHosts(32 - hostBitsToUse);
            if (maxHostsForBits <= 0) continue; // No debería pasar con bits >= 2

            // Generar un valor de hosts entre 1 y el máximo posible para esos bits
            requirementValue = getRandomInt(1, maxHostsForBits);
        }

        if (requirementValue <= 0) continue; // Requisito inválido generado

        const problem = {
            network: baseIp,
            requirement: {
                type: requirementType,
                value: requirementValue
            }
        };

        // 3. Calcular Solución y Validar
        const calculationResult = calculateClassful(problem.network, problem.requirement);

        // Si el cálculo fue exitoso (incluso si devuelve la red original), es un problema válido
        if (calculationResult.success) {
            // Formatear el problema para el usuario
             let problemText = `Subnetea la red ${problem.network} (${ipClass}, máscara por defecto ${getDefaultMask(problem.network)}) `;
            if(problem.requirement.type === 'subnets') {
                problemText += `para crear al menos ${problem.requirement.value} subredes.`;
            } else {
                 problemText += `de forma que cada subred pueda alojar al menos ${problem.requirement.value} hosts utilizables.`;
            }

            return {
                problemStatement: problemText,
                problemData: problem, // Datos crudos para posible validación interna
                solution: calculationResult.data
            };
        }
        // Si calculateClassful falló, el intento no es válido, continuar el bucle while
         // console.log(`Intento ${attempts} fallido para Classful: ${calculationResult.error}`);

    } // fin while

    console.error("No se pudo generar un problema Classful válido después de varios intentos.");
    return null; // Falló la generación
}


/**
 * Genera un problema de subneteo VLSM aleatorio.
 *
 * @param {string} difficulty - Nivel de dificultad ('easy', 'medium', 'hard'). (Actualmente simplificado)
 * @returns {{problem: object, solution: object[]}|null} - Objeto con el problema y la solución, o null si falla.
 */
function generateVLSMProblem(difficulty = 'medium') {
    let attempts = 0;
    const maxAttempts = 20; // VLSM puede fallar más a menudo por alineación

    while (attempts < maxAttempts) {
        attempts++;

        // 1. Generar Bloque Inicial Aleatorio
        // Prefijo inicial (ej: /16 a /27)
        const startPrefix = getRandomInt(16, 27);
        // Generar una IP base (usar rangos privados es más seguro/realista)
        let baseIp = '';
         const classChoice = getRandomInt(1, 3); // 1=C, 2=B, 3=A
        if (classChoice === 1) {
            baseIp = `192.168.${getRandomInt(0, 255)}.0`;
        } else if (classChoice === 2) {
             baseIp = `172.${getRandomInt(16, 31)}.${getRandomInt(0, 255)}.0`;
        } else {
             baseIp = `10.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.0`;
        }
        // Asegurarse de que la IP generada es la dirección de red para el prefijo elegido
        const networkAddress = getNetworkAddress(baseIp, startPrefix);
         if (!networkAddress) continue; // Prefijo inválido para la IP? intentar de nuevo

        const startCIDR = `${networkAddress}/${startPrefix}`;
        const totalAvailableAddresses = getTotalHosts(startPrefix);

        // 2. Generar Requisitos de Hosts Aleatorios
        const numRequirements = getRandomInt(2, 6); // Entre 2 y 6 subredes
        const requirements = [];
        let totalAddressesNeededHeuristic = 0; // Suma de 2^(bits para hosts) para cada req

        for (let i = 0; i < numRequirements; i++) {
            // Calcular bits de host aleatorios que tengan sentido dentro del bloque
            // Max host bits = 32 - startPrefix. Min host bits = 2 (para hosts usables)
            const maxHostBits = 32 - startPrefix;
             if (maxHostBits < 2) break; // El bloque inicial es demasiado pequeño

            // Generar un número de hosts requeridos
            // Evitar pedir exactamente potencias de 2 - 2 todo el tiempo
            // Pedir entre 1 y un poco menos del máximo posible para una subred "razonable"
            const hostBitsForReq = getRandomInt(2, maxHostBits - getRandomInt(0, Math.min(maxHostBits-2, 3))); // Dejar algo de margen
            const maxHosts = getUsableHosts(32 - hostBitsForReq);
             if (maxHosts <= 0) continue; // No pedir 0 hosts si es posible evitarlo

            const requiredHosts = getRandomInt(1, maxHosts);

            // Heurística: Sumar el tamaño TOTAL del bloque necesario para estos hosts
             const hostBitsActuallyNeeded = bitsForHosts(requiredHosts);
             const blockSizeForReq = Math.pow(2, hostBitsActuallyNeeded);
             totalAddressesNeededHeuristic += blockSizeForReq;

            requirements.push({
                hosts: requiredHosts,
                name: `Red ${String.fromCharCode(65 + i)}` // Red A, Red B, etc.
            });
        }

         if (requirements.length < 2) continue; // No se generaron suficientes requisitos válidos

        // Validar heurística: ¿Cabe la suma de tamaños de bloque en el bloque inicial?
         if (totalAddressesNeededHeuristic > totalAvailableAddresses) {
            // console.log(`Intento ${attempts}: Requisitos VLSM (${totalAddressesNeededHeuristic}) exceden bloque inicial (${totalAvailableAddresses}). Regenerando.`);
             continue; // No caben, intentar generar otro set de requisitos
         }

        // Ordenar requisitos (aunque calculateVLSM lo reordena, es buena práctica)
        requirements.sort((a, b) => b.hosts - a.hosts);

        const problem = {
            network: startCIDR,
            requirements: requirements
        };

        // 3. Calcular Solución y Validar
        const calculationResult = calculateVLSM(problem.network, problem.requirements);

        // Si el cálculo fue exitoso, el problema es válido
        if (calculationResult.success) {
             let problemText = `Subnetea en modo VLSM el bloque ${problem.network} para satisfacer los siguientes requisitos de hosts (ordenados de mayor a menor):\n`;
             problem.requirements.forEach(req => {
                 problemText += ` - ${req.name}: ${req.hosts} hosts\n`;
             });

            return {
                problemStatement: problemText.trim(),
                problemData: problem,
                solution: calculationResult.data
            };
        }
        // Si calculateVLSM falló (probablemente por alineación/fragmentación), intentar de nuevo
        // console.log(`Intento ${attempts} fallido para VLSM: ${calculationResult.error}`);

    } // fin while

    console.error("No se pudo generar un problema VLSM válido después de varios intentos.");
    return null; // Falló la generación
}

// --- Fin de exerciseGenerator.js ---
