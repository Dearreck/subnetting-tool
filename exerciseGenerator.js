/**
 * exerciseGenerator.js - Lógica para generar ejercicios de subneteo aleatorios.
 * Utiliza las funciones de ipUtils.js y subnetLogic.js (deben estar cargadas previamente).
 * La lógica Classful asume la perspectiva histórica (subnet zero/all-ones no usables).
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
    if (min > max) { [min, max] = [max, min]; }
    if (min === max) { return min; }
    if (max < min) max = min; // Asegurar que max es al menos min
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera un problema de subneteo Classful aleatorio bajo la perspectiva histórica.
 * - Si se pide por hosts, asegura que resulten al menos 4 subredes totales.
 * - Si se pide por subredes (N), calcula para N+2 subredes totales.
 * - Limita el número MÁXIMO de subredes utilizables resultantes a ~25.
 *
 * @param {string} difficulty - Nivel de dificultad ('easy', 'medium', 'hard'). No implementado.
 * @returns {{problemStatement: string, problemData: object, solution: object[]}|null} - Objeto con el problema y la solución, o null si falla.
 */
function generateClassfulProblem(difficulty = 'medium') {
    let attempts = 0;
    const maxAttempts = 30; // Más intentos por validaciones estrictas
    const maxUsableResultingSubnets = 25; // Límite de subredes UTILIZABLES que queremos generar

    while (attempts < maxAttempts) {
        attempts++;
        let baseIp = '';
        let ipClass = '';
        let defaultPrefix = 0;
        const maxAllowedPrefix = 30; // Límite para tener hosts usables estándar

        // 1. Generar Red Base Aleatoria (Privada)
        const classChoice = getRandomInt(1, 3);
        if (classChoice === 1) { ipClass = 'C'; defaultPrefix = 24; baseIp = `192.168.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`; }
        else if (classChoice === 2) { ipClass = 'B'; defaultPrefix = 16; baseIp = `172.${getRandomInt(16, 31)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`; }
        else { ipClass = 'A'; defaultPrefix = 8; baseIp = `10.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`; }
        const defaultMask = getDefaultMask(baseIp);
        if (!defaultMask) continue;
        const networkAddress = getNetworkAddress(baseIp, defaultMask);
        if (!networkAddress) continue;

        // 2. Generar Requisito Aleatorio (Subredes o Hosts)
        const requirementType = Math.random() < 0.5 ? 'subnets' : 'hosts';
        let requirementValue = 0;
        let resultingPrefix; // Prefijo que resultará del requisito
        let subnetBitsBorrowed; // Bits que se tomarán prestados
        let numGeneratedSubnets; // Subredes totales que se generarán

        if (requirementType === 'subnets') {
            // --- Requisito por Subredes (UTILIZABLES) ---
            const availableSubnetBits = maxAllowedPrefix - defaultPrefix;
            // Necesitamos al menos 2 bits prestados para tener >= 2 subredes utilizables (4 totales)
            if (availableSubnetBits < 2) continue;

            // Calcular bits máx para no exceder el límite de usables (~25)
            // Max total = 25 usables + 2 = 27 -> bitsForSubnets(27) = 5
            const neededBitsForMaxUsable = bitsForSubnets(maxUsableResultingSubnets + 2); // = 5
            const maxBitsToBorrow = Math.min(availableSubnetBits, neededBitsForMaxUsable);

            // Elegir bits a tomar prestados (entre 2 y el máximo)
            subnetBitsToUse = getRandomInt(2, maxBitsToBorrow);
            resultingPrefix = defaultPrefix + subnetBitsToUse;
            numGeneratedSubnets = Math.pow(2, subnetBitsToUse);
            const maxUsableSubnetsPossible = numGeneratedSubnets - 2;

            // Generar el valor del requisito (subredes UTILIZABLES a pedir)
            // Pedir entre 1 y el máximo de usables posible con esos bits
            requirementValue = getRandomInt(1, maxUsableSubnetsPossible);
            subnetBitsBorrowed = subnetBitsToUse; // Guardar los bits usados

        } else { // requirementType === 'hosts'
            // --- Requisito por Hosts Utilizables ---
            const availableHostBits = 32 - defaultPrefix;
            // Necesitamos dejar al menos 2 bits para hosts (/30) y tomar prestados al menos 2 bits para subredes (>=4 totales)
            if (availableHostBits <= 3) continue; // No hay espacio para >=2 bits de subred y >=2 bits de host

            // Elegir bits de host a dejar (entre 2 y availableHostBits - 2)
            const hostBitsToUse = getRandomInt(2, availableHostBits - 2);
            resultingPrefix = 32 - hostBitsToUse;
            subnetBitsBorrowed = resultingPrefix - defaultPrefix; // Bits que se tomaron
            numGeneratedSubnets = Math.pow(2, subnetBitsBorrowed);

            // Validar que se generen al menos 4 subredes totales
            if (numGeneratedSubnets < 4) {
                // console.log(`Classful Gen Attempt ${attempts}: Req hosts -> ${hostBitsToUse} bits host -> ${numGeneratedSubnets} subredes totales (<4).`);
                continue;
            }
             // Validar que no exceda el límite de usables
             if ((numGeneratedSubnets - 2) > maxUsableResultingSubnets) {
                 // console.log(`Classful Gen Attempt ${attempts}: Req hosts -> ${numGeneratedSubnets} subredes totales -> ${numGeneratedSubnets-2} usables (> ${maxUsableResultingSubnets}).`);
                 continue;
             }

            // Calcular hosts usables para este tamaño de bloque
            const maxHostsForBits = getUsableHosts(resultingPrefix);
            if (maxHostsForBits < 2) continue; // Seguridad

            // Pedir entre 2 y el máximo de hosts usables
            requirementValue = getRandomInt(2, maxHostsForBits);
        }

        // Verificar requisito y prefijo finales
        if (requirementValue <= 0 || resultingPrefix < defaultPrefix || resultingPrefix > 30) continue;

        // Crear objeto del problema
        const problem = {
            network: networkAddress,
            requirement: {
                type: requirementType,
                value: requirementValue
            }
        };

        // 3. Calcular Solución y Validar
        // La función calculateClassful ya genera TODAS las subredes (incluyendo zero/all-ones)
        const calculationResult = calculateClassful(problem.network, problem.requirement);

        // Validar si el cálculo fue exitoso y generó el número esperado de subredes TOTALES
        if (calculationResult.success && calculationResult.data && calculationResult.data.length > 0) {
             const expectedNumSubnets = (subnetBitsBorrowed === 0) ? 1 : numGeneratedSubnets;
             if (calculationResult.data.length !== expectedNumSubnets) {
                 console.warn(`Classful Gen: Discrepancia - Esperadas Totales: ${expectedNumSubnets}, Solución tiene: ${calculationResult.data.length}`);
                 continue; // Algo falló en el cálculo, reintentar
             }

            // Formatear el problema para el usuario
            let problemText = `Subnetea la red ${problem.network} (Clase ${ipClass}, máscara por defecto ${defaultMask}) `;
            if(problem.requirement.type === 'subnets') {
                // Indicar que se piden subredes UTILIZABLES
                problemText += `para obtener al menos ${problem.requirement.value} subredes utilizables (asumiendo que subnet zero y all-ones no se usan para hosts).`;
            } else {
                 problemText += `de forma que cada subred pueda alojar al menos ${problem.requirement.value} hosts utilizables (asumiendo que subnet zero y all-ones no se usan para hosts).`;
            }

            return {
                problemStatement: problemText,
                problemData: problem, // Datos crudos para validación interna
                solution: calculationResult.data // La solución contiene TODAS las subredes generadas
            };
        }
        // Si falló el cálculo, registrar (opcional) y continuar el bucle while
        // console.log(`Intento ${attempts} fallido para Classful (Histórico): ${calculationResult.error || 'Resultado vacío'}`);

    } // fin while

    console.error("GENERATOR: No se pudo generar un problema Classful (Histórico) válido después de varios intentos.");
    return null; // Falló la generación
}


// --- La función generateVLSMProblem permanece igual que en la v3 ---
function generateVLSMProblem(difficulty = 'medium') {
    let attempts = 0;
    const maxAttempts = 25;

    while (attempts < maxAttempts) {
        attempts++;
        const startPrefix = getRandomInt(16, 26);
        let baseIp = '';
        const classChoice = getRandomInt(1, 3);
        if (classChoice === 1) { baseIp = `192.168.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`; }
        else if (classChoice === 2) { baseIp = `172.${getRandomInt(16, 31)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`; }
        else { baseIp = `10.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`; }
        const networkAddress = getNetworkAddress(baseIp, startPrefix);
        if (!networkAddress) continue;
        const startCIDR = `${networkAddress}/${startPrefix}`;
        const totalAvailableAddresses = getTotalHosts(startPrefix);
        const numRequirements = getRandomInt(2, 5);
        const maxHostsToRequestPerReq = 1000;
        const requirements = [];
        let totalAddressesNeededHeuristic = 0;
        for (let i = 0; i < numRequirements; i++) {
            const maxHostBitsAvailable = 32 - startPrefix;
            if (maxHostBitsAvailable < 2) break;
            const hostBitsForReq = getRandomInt(2, maxHostBitsAvailable - getRandomInt(0, Math.min(maxHostBitsAvailable - 2, 4)));
            const usableHostsForBlock = getUsableHosts(32 - hostBitsForReq);
            if (usableHostsForBlock < 2) continue;
            const actualMaxHostsForReq = Math.min(usableHostsForBlock, maxHostsToRequestPerReq);
            if (actualMaxHostsForReq < 2) continue;
            const requiredHosts = getRandomInt(2, actualMaxHostsForReq);
            const hostBitsActuallyNeeded = bitsForHosts(requiredHosts);
            if (hostBitsActuallyNeeded === -1 || hostBitsActuallyNeeded > maxHostBitsAvailable) continue;
            const blockSizeForReq = Math.pow(2, hostBitsActuallyNeeded);
            totalAddressesNeededHeuristic += blockSizeForReq;
            requirements.push({ hosts: requiredHosts, name: `Red ${String.fromCharCode(65 + i)}` });
        }
        if (requirements.length < Math.min(numRequirements, 2)) continue;
        if (totalAddressesNeededHeuristic > totalAvailableAddresses) continue;
        requirements.sort((a, b) => b.hosts - a.hosts);
        const problem = { network: startCIDR, requirements: requirements };
        const calculationResult = calculateVLSM(problem.network, problem.requirements);
        if (calculationResult.success && calculationResult.data && calculationResult.data.length === requirements.length) {
             let problemText = `Subnetea en modo VLSM el bloque ${problem.network} para satisfacer los siguientes requisitos de hosts (ordenados de mayor a menor):\n`;
             problem.requirements.forEach(req => { problemText += ` - ${req.name}: ${req.hosts} hosts\n`; });
            return { problemStatement: problemText.trim(), problemData: problem, solution: calculationResult.data };
        }
    }
    console.error("GENERATOR: No se pudo generar un problema VLSM válido después de varios intentos.");
    return null;
}

// --- Fin de exerciseGenerator.js ---
