/**
 * exerciseGenerator.js - Lógica para generar ejercicios de subneteo aleatorios.
 * Utiliza las funciones de ipUtils.js y subnetLogic.js (deben estar cargadas previamente).
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
    // Asegurarse de que min no sea mayor que max después del redondeo
    if (min > max) {
        [min, max] = [max, min]; // Intercambiar si es necesario
    }
    // Manejar caso donde min y max son iguales
    if (min === max) {
        return min;
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera un problema de subneteo Classful aleatorio.
 * Limita la solicitud máxima de subredes a ~25 y el número MÁXIMO de subredes RESULTANTES a 25.
 *
 * @param {string} difficulty - Nivel de dificultad ('easy', 'medium', 'hard'). Actualmente no implementado, se usa un comportamiento medio.
 * @returns {{problemStatement: string, problemData: object, solution: object[]}|null} - Objeto con el enunciado, datos crudos del problema y la solución, o null si falla la generación.
 */
function generateClassfulProblem(difficulty = 'medium') {
    let attempts = 0;
    const maxAttempts = 20; // Aumentar intentos por la nueva validación
    const maxResultingSubnets = 25; // Límite de subredes que se mostrarán

    while (attempts < maxAttempts) {
        attempts++;
        let baseIp = '';
        let ipClass = '';
        let defaultPrefix = 0;
        const maxAllowedPrefix = 30; // Límite para tener hosts usables estándar

        // 1. Generar Red Base Aleatoria (Privada)
        const classChoice = getRandomInt(1, 3); // 1=C, 2=B, 3=A (Favorecer C/B)
        if (classChoice === 1) { // Clase C
            ipClass = 'C';
            defaultPrefix = 24;
            baseIp = `192.168.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        } else if (classChoice === 2) { // Clase B
            ipClass = 'B';
            defaultPrefix = 16;
            baseIp = `172.${getRandomInt(16, 31)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        } else { // Clase A
            ipClass = 'A';
            defaultPrefix = 8;
            baseIp = `10.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        }

        // Obtener dirección de red real y máscara por defecto
        const defaultMask = getDefaultMask(baseIp);
         if (!defaultMask) continue;
        const networkAddress = getNetworkAddress(baseIp, defaultMask);
        if (!networkAddress) continue;

        // 2. Generar Requisito Aleatorio (Subredes o Hosts)
        const requirementType = Math.random() < 0.5 ? 'subnets' : 'hosts';
        let requirementValue = 0;

        if (requirementType === 'subnets') {
            // --- Lógica para limitar subredes SOLICITADAS ---
            const availableSubnetBits = maxAllowedPrefix - defaultPrefix;
            const neededBitsForMaxRequest = bitsForSubnets(maxResultingSubnets); // Usar el límite final aquí también

            const maxBitsToBorrowForExercise = Math.min(availableSubnetBits, neededBitsForMaxRequest);

            if (maxBitsToBorrowForExercise < 1) continue;

            const subnetBitsToUse = getRandomInt(1, maxBitsToBorrowForExercise);
            const maxSubnetsPossibleWithBits = Math.pow(2, subnetBitsToUse);
            const maxSubnetsToRequest = Math.min(maxSubnetsPossibleWithBits, maxResultingSubnets);
            const minSubnetsToRequest = 2;

            if (maxSubnetsToRequest < minSubnetsToRequest) continue;
            requirementValue = getRandomInt(minSubnetsToRequest, maxSubnetsToRequest);

        } else { // requirementType === 'hosts'
            // --- Lógica para requisitos de hosts ---
            const availableHostBits = 32 - defaultPrefix;
            if (availableHostBits <= 2) continue;

            const hostBitsToUse = getRandomInt(2, availableHostBits - 1);
            const maxHostsForBits = getUsableHosts(32 - hostBitsToUse);
            if (maxHostsForBits < 2) continue;

            requirementValue = getRandomInt(2, maxHostsForBits); // Mínimo 2 hosts
        }

        // Verificar requisito generado
        if (requirementValue <= 0) continue;

        // Crear objeto del problema preliminar
        const problem = {
            network: networkAddress,
            requirement: {
                type: requirementType,
                value: requirementValue
            }
        };

        // --- VALIDACIÓN ADICIONAL: Limitar subredes RESULTANTES ---
        let resultingPrefix;
        if (problem.requirement.type === 'subnets') {
            const neededSubnetBits = bitsForSubnets(problem.requirement.value);
            if (neededSubnetBits === -1) continue; // Requisito imposible
            resultingPrefix = defaultPrefix + neededSubnetBits;
        } else { // type === 'hosts'
            const neededHostBits = bitsForHosts(problem.requirement.value);
            if (neededHostBits === -1) continue; // Requisito imposible
            resultingPrefix = 32 - neededHostBits;
        }

        // Validar si el prefijo resultante es válido y no menor que el default
        if (resultingPrefix < defaultPrefix || resultingPrefix > 32) {
             // console.log(`Classful Gen Attempt ${attempts}: Prefijo resultante inválido (${resultingPrefix})`);
            continue;
        }
        // Validar si el prefijo es /31 o /32 cuando se pidieron hosts > 0
        if (problem.requirement.type === 'hosts' && problem.requirement.value > 0 && resultingPrefix > 30) {
             // console.log(`Classful Gen Attempt ${attempts}: Prefijo resultante ${resultingPrefix} no permite hosts usables.`);
             continue;
        }

        // Calcular cuántas subredes se generarían con este prefijo
        const subnetBitsBorrowed = resultingPrefix - defaultPrefix;
        if (subnetBitsBorrowed < 0) continue; // Seguridad
        const numGeneratedSubnets = Math.pow(2, subnetBitsBorrowed);

        // ¡LA COMPROBACIÓN CLAVE! Limitar el número de subredes que RESULTARÍAN
        if (numGeneratedSubnets > maxResultingSubnets) {
            // console.log(`Classful Gen Attempt ${attempts}: Se generarían ${numGeneratedSubnets} subredes (límite ${maxResultingSubnets}). Regenerando.`);
            continue; // Demasiadas subredes resultantes, intentar de nuevo
        }
        // --- FIN VALIDACIÓN ADICIONAL ---


        // 3. Calcular Solución y Validar (Solo si pasó la validación anterior)
        const calculationResult = calculateClassful(problem.network, problem.requirement);

        // Si el cálculo fue exitoso, es un problema válido
        if (calculationResult.success && calculationResult.data && calculationResult.data.length > 0) {
            // Formatear el problema para el usuario
            let problemText = `Subnetea la red ${problem.network} (Clase ${ipClass}, máscara por defecto ${defaultMask}) `;
            if(problem.requirement.type === 'subnets') {
                problemText += `para crear al menos ${problem.requirement.value} subredes.`;
            } else {
                 problemText += `de forma que cada subred pueda alojar al menos ${problem.requirement.value} hosts utilizables.`;
            }

            // Asegurarse de que el número de subredes en la solución coincida (sanity check)
            // Usar Math.max(1,...) porque si numGeneratedSubnets es 0 (caso /32), la solución tendrá 1 entrada.
            if (calculationResult.data.length !== Math.max(1, numGeneratedSubnets)) {
                 console.warn(`Classful Gen: Discrepancia - Generadas: ${numGeneratedSubnets}, Solución tiene: ${calculationResult.data.length}`);
                 // Podríamos decidir continuar o no aquí, por ahora continuaremos.
            }

            return {
                problemStatement: problemText,
                problemData: problem, // Datos crudos para validación interna
                solution: calculationResult.data
            };
        }
        // Si falló el cálculo (después de pasar la validación de # subredes), registrar y reintentar
        // console.log(`Intento ${attempts} fallido para Classful (después de validación #subredes): ${calculationResult.error || 'Resultado vacío'}`);

    } // fin while

    console.error("GENERATOR: No se pudo generar un problema Classful válido después de varios intentos.");
    return null; // Falló la generación
}


/**
 * Genera un problema de subneteo VLSM aleatorio.
 * Limita el número de requisitos (2-5) y los hosts máximos por requisito (~1000).
 *
 * @param {string} difficulty - Nivel de dificultad ('easy', 'medium', 'hard'). Actualmente no implementado.
 * @returns {{problemStatement: string, problemData: object, solution: object[]}|null} - Objeto con el problema y la solución, o null si falla.
 */
function generateVLSMProblem(difficulty = 'medium') {
    let attempts = 0;
    const maxAttempts = 25; // VLSM puede fallar más a menudo por alineación o espacio

    while (attempts < maxAttempts) {
        attempts++;

        // 1. Generar Bloque Inicial Aleatorio (Privado y con tamaño razonable)
        const startPrefix = getRandomInt(16, 26); // Prefijos iniciales comunes para ejercicios: /16 a /26
        let baseIp = '';
        const classChoice = getRandomInt(1, 3); // 1=C, 2=B, 3=A
        if (classChoice === 1) { // Usar rangos menos comunes de C
            baseIp = `192.168.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        } else if (classChoice === 2) { // Rango completo B privado
             baseIp = `172.${getRandomInt(16, 31)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        } else { // Rango completo A privado
             baseIp = `10.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        }

        // Asegurar que es la dirección de red para el prefijo elegido
        const networkAddress = getNetworkAddress(baseIp, startPrefix);
        if (!networkAddress) {
            // console.log(`VLSM Gen Attempt ${attempts}: No se pudo obtener red para ${baseIp}/${startPrefix}`);
            continue; // Intentar de nuevo si hay fallo
        }

        const startCIDR = `${networkAddress}/${startPrefix}`;
        const totalAvailableAddresses = getTotalHosts(startPrefix);

        // 2. Generar Requisitos de Hosts Aleatorios
        // Limitar número de requisitos y hosts max por requisito
        const numRequirements = getRandomInt(2, 5); // Pedir entre 2 y 5 subredes
        const maxHostsToRequestPerReq = 1000; // Límite máximo de hosts a pedir por requisito individual
        const requirements = [];
        let totalAddressesNeededHeuristic = 0; // Suma de tamaños de bloque (2^N)

        for (let i = 0; i < numRequirements; i++) {
            const maxHostBitsAvailable = 32 - startPrefix; // Bits disponibles en el bloque padre
            if (maxHostBitsAvailable < 2) break; // No se puede subnetear más para hosts usables (/30 min)

            // Elegir tamaño de bloque aleatorio (en bits de host), mínimo 2 bits (/30)
            // Restringir un poco para no usar siempre el bloque más grande posible
            const hostBitsForReq = getRandomInt(2, maxHostBitsAvailable - getRandomInt(0, Math.min(maxHostBitsAvailable - 2, 4))); // Deja margen
            const usableHostsForBlock = getUsableHosts(32 - hostBitsForReq);

            if (usableHostsForBlock < 2) {
                // console.log(`VLSM Gen Attempt ${attempts}: hostBitsForReq=${hostBitsForReq} resulta en < 2 hosts usables.`);
                continue; // Saltar si es /31 o /32
            }

            // Limitar el máximo de hosts usables a nuestro tope para ejercicios
            const actualMaxHostsForReq = Math.min(usableHostsForBlock, maxHostsToRequestPerReq);
            if (actualMaxHostsForReq < 2) {
                // console.log(`VLSM Gen Attempt ${attempts}: El límite de ${maxHostsToRequestPerReq} hace que usableHosts (${actualMaxHostsForReq}) sea < 2.`);
                continue; // Verificar si el tope lo hace inválido
            }

            // Generar hosts requeridos entre 2 y el máximo (posiblemente limitado)
            const requiredHosts = getRandomInt(2, actualMaxHostsForReq); // Mínimo 2 hosts

            // Calcular heurística de espacio (tamaño TOTAL del bloque necesario)
            const hostBitsActuallyNeeded = bitsForHosts(requiredHosts);
            if (hostBitsActuallyNeeded === -1 || hostBitsActuallyNeeded > maxHostBitsAvailable) {
                // console.log(`VLSM Gen Attempt ${attempts}: Imposible obtener bits para ${requiredHosts} hosts o excede el bloque padre.`);
                continue; // Imposible o más grande que el padre
            }
            const blockSizeForReq = Math.pow(2, hostBitsActuallyNeeded);
            totalAddressesNeededHeuristic += blockSizeForReq;

            requirements.push({
                hosts: requiredHosts,
                name: `Red ${String.fromCharCode(65 + i)}` // Red A, B, C...
            });
        }

        // Validaciones post-generación de requisitos
        if (requirements.length < Math.min(numRequirements, 2)) { // Asegurar al menos 2 reqs válidos si se pidieron >=2
            // console.log(`VLSM Gen Attempt ${attempts}: No se generaron suficientes requisitos válidos (${requirements.length}).`);
            continue;
        }
        if (totalAddressesNeededHeuristic > totalAvailableAddresses) {
            // console.log(`VLSM Gen Attempt ${attempts}: Requisitos (${totalAddressesNeededHeuristic}) exceden bloque inicial (${totalAvailableAddresses}).`);
            continue; // No caben según la heurística
        }

        // Ordenar requisitos (calculateVLSM también lo hace, pero es buena práctica)
        requirements.sort((a, b) => b.hosts - a.hosts);

        // Crear objeto del problema
        const problem = {
            network: startCIDR,
            requirements: requirements
        };

        // 3. Calcular Solución y Validar
        const calculationResult = calculateVLSM(problem.network, problem.requirements);

        // Si el cálculo fue exitoso Y se asignaron todas las redes pedidas
        if (calculationResult.success && calculationResult.data && calculationResult.data.length === requirements.length) {
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
        // Si falló, registrar (opcional) y continuar el bucle while
        // console.log(`Intento ${attempts} fallido para VLSM: ${calculationResult.error || 'Resultado vacío o incompleto'}`);

    } // fin while

    console.error("GENERATOR: No se pudo generar un problema VLSM válido después de varios intentos.");
    return null; // Falló la generación
}

// --- Fin de exerciseGenerator.js ---
