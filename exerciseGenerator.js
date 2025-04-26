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
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera un problema de subneteo Classful aleatorio.
 * Limita la solicitud máxima de subredes a ~25 para realismo pedagógico.
 *
 * @param {string} difficulty - Nivel de dificultad ('easy', 'medium', 'hard'). Actualmente no implementado, se usa un comportamiento medio.
 * @returns {{problemStatement: string, problemData: object, solution: object[]}|null} - Objeto con el enunciado, datos crudos del problema y la solución, o null si falla la generación.
 */
function generateClassfulProblem(difficulty = 'medium') {
    let attempts = 0;
    const maxAttempts = 15; // Intentos máximos para evitar bucles infinitos

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
            baseIp = `192.168.${getRandomInt(1, 254)}.${getRandomInt(1, 254)}`; // Usar IPs 'internas' para evitar .0 y .255
        } else if (classChoice === 2) { // Clase B
            ipClass = 'B';
            defaultPrefix = 16;
            baseIp = `172.${getRandomInt(16, 31)}.${getRandomInt(1, 254)}.${getRandomInt(1, 254)}`;
        } else { // Clase A
            ipClass = 'A';
            defaultPrefix = 8;
            baseIp = `10.${getRandomInt(1, 254)}.${getRandomInt(1, 254)}.${getRandomInt(1, 254)}`;
        }

        // Obtener dirección de red real y máscara por defecto
        const defaultMask = getDefaultMask(baseIp);
         if (!defaultMask) continue; // No debería pasar con A, B, C pero por seguridad
        const networkAddress = getNetworkAddress(baseIp, defaultMask);
        if (!networkAddress) continue; // No debería pasar

        // 2. Generar Requisito Aleatorio (Subredes o Hosts)
        const requirementType = Math.random() < 0.5 ? 'subnets' : 'hosts';
        let requirementValue = 0;

        if (requirementType === 'subnets') {
            // --- Lógica para limitar subredes ---
            const availableSubnetBits = maxAllowedPrefix - defaultPrefix;
            const neededBitsForMaxRequest = bitsForSubnets(25); // Bits para 25 es 5

            // Determinar los bits máximos que PODEMOS tomar prestados (hasta 5, o menos si no hay disponibles)
            const maxBitsToBorrowForExercise = Math.min(availableSubnetBits, neededBitsForMaxRequest);

            // Verificar si es posible tomar prestado al menos 1 bit (para >1 subred)
            if (maxBitsToBorrowForExercise < 1) {
                // console.log(`Classful Gen: No hay suficientes bits disponibles en /${defaultPrefix} para crear >= 2 subredes (max 25).`);
                continue; // Intentar generar otro problema
            }

            // Elegir aleatoriamente cuántos bits tomar prestados (entre 1 y el máximo permitido)
            const subnetBitsToUse = getRandomInt(1, maxBitsToBorrowForExercise);

            // Calcular cuántas subredes MÁXIMO se pueden crear con esos bits
            const maxSubnetsPossibleWithBits = Math.pow(2, subnetBitsToUse);
            // Determinar cuántas subredes MÁXIMO vamos a PEDIR (hasta 25, o menos si los bits son limitados)
            const maxSubnetsToRequest = Math.min(maxSubnetsPossibleWithBits, 25);
            const minSubnetsToRequest = 2; // Siempre pedir al menos 2

            // Generar el valor del requisito (número de subredes a pedir)
            // Asegurarse de que maxSubnetsToRequest no sea menor que minSubnetsToRequest
            if (maxSubnetsToRequest < minSubnetsToRequest) {
                 // Esto no debería pasar con la lógica actual, pero por si acaso
                 console.warn("Classful Gen: Cálculo inconsistente de subredes a solicitar.");
                 continue;
            }
            requirementValue = getRandomInt(minSubnetsToRequest, maxSubnetsToRequest);

        } else { // requirementType === 'hosts'
            // --- Lógica para requisitos de hosts ---
            const availableHostBits = 32 - defaultPrefix;
            // Necesitamos dejar al menos 1 bit para la red (subnetear) y requerimos mínimo 2 bits para hosts usables (/30)
            if (availableHostBits <= 2) {
                // console.log(`Classful Gen: No hay suficientes bits de host en /${defaultPrefix} para subnetear y tener hosts usables.`);
                 continue;
            }

            // Generar un número de bits de host que dejará la nueva subred (entre /<defaultPrefix+1> y /30)
            const hostBitsToUse = getRandomInt(2, availableHostBits - 1); // Dejar entre 2 y (todos - 1) bits para hosts
            const maxHostsForBits = getUsableHosts(32 - hostBitsToUse);

            if (maxHostsForBits < 2) { // Si el bloque resultante es /31 o /32
                 // console.log(`Classful Gen: Los bits de host elegidos (${hostBitsToUse}) no permiten >= 2 hosts usables.`);
                continue;
            }

            // Pedir entre 2 y el máximo de hosts usables para ese tamaño de bloque
            requirementValue = getRandomInt(2, maxHostsForBits); // Mínimo 2 hosts
        }

        // Verificar requisito generado
        if (requirementValue <= 0) continue;

        // Crear objeto del problema
        const problem = {
            network: networkAddress, // Usar la dirección de red calculada
            requirement: {
                type: requirementType,
                value: requirementValue
            }
        };

        // 3. Calcular Solución y Validar
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

            return {
                problemStatement: problemText,
                problemData: problem, // Datos crudos para validación interna
                solution: calculationResult.data
            };
        }
        // Si falló, registrar (opcional) y continuar el bucle while
        // console.log(`Intento ${attempts} fallido para Classful: ${calculationResult.error || 'Resultado vacío'}`);

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
        const startPrefix = getRandomInt(16, 26); // Prefijos iniciales comunes para ejercicios
        let baseIp = '';
        const classChoice = getRandomInt(1, 3); // 1=C, 2=B, 3=A
        if (classChoice === 1) { // Usar rangos menos comunes de C
            baseIp = `192.168.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        } else if (classChoice === 2) { // Rango completo B privado
             baseIp = `172.${getRandomInt(16, 31)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        } else { // Rango completo A privado
             baseIp = `10.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
        }

        // Asegurar que es la dirección de red
        const networkAddress = getNetworkAddress(baseIp, startPrefix);
        if (!networkAddress) continue; // Intentar de nuevo si hay fallo

        const startCIDR = `${networkAddress}/${startPrefix}`;
        const totalAvailableAddresses = getTotalHosts(startPrefix);

        // 2. Generar Requisitos de Hosts Aleatorios
        // Limitar número de requisitos y hosts max por requisito
        const numRequirements = getRandomInt(2, 5); // Max 5 redes a pedir
        const maxHostsToRequestPerReq = 1000; // Max 1000 hosts por red pedida
        const requirements = [];
        let totalAddressesNeededHeuristic = 0; // Suma de tamaños de bloque (2^N)

        for (let i = 0; i < numRequirements; i++) {
            const maxHostBitsAvailable = 32 - startPrefix; // Bits disponibles en el bloque padre
            if (maxHostBitsAvailable < 2) break; // No se puede subnetear más para hosts usables

            // Elegir tamaño de bloque aleatorio (en bits de host), mínimo 2 bits (/30)
            // Restringir un poco para no usar siempre el bloque más grande posible
            const hostBitsForReq = getRandomInt(2, maxHostBitsAvailable - getRandomInt(0, Math.min(maxHostBitsAvailable - 2, 4))); // Deja margen
            const usableHostsForBlock = getUsableHosts(32 - hostBitsForReq);

            if (usableHostsForBlock < 2) continue; // Saltar si es /31 o /32

            // Limitar el máximo de hosts usables a nuestro tope para ejercicios
            const actualMaxHostsForReq = Math.min(usableHostsForBlock, maxHostsToRequestPerReq);
            if (actualMaxHostsForReq < 2) continue; // Verificar si el tope lo hace inválido

            // Generar hosts requeridos entre 2 y el máximo (posiblemente limitado)
            const requiredHosts = getRandomInt(2, actualMaxHostsForReq);

            // Calcular heurística de espacio (tamaño TOTAL del bloque necesario)
            const hostBitsActuallyNeeded = bitsForHosts(requiredHosts);
            if (hostBitsActuallyNeeded === -1 || hostBitsActuallyNeeded > maxHostBitsAvailable) continue; // Imposible o más grande que el padre
            const blockSizeForReq = Math.pow(2, hostBitsActuallyNeeded);
            totalAddressesNeededHeuristic += blockSizeForReq;

            requirements.push({
                hosts: requiredHosts,
                name: `Red ${String.fromCharCode(65 + i)}` // Red A, B, C...
            });
        }

        // Validaciones post-generación de requisitos
        if (requirements.length < Math.min(numRequirements, 2)) { // Asegurar al menos 2 reqs válidos si se pidieron >=2
            // console.log(`VLSM Gen: No se generaron suficientes requisitos válidos (${requirements.length}).`);
            continue;
        }
        if (totalAddressesNeededHeuristic > totalAvailableAddresses) {
            // console.log(`VLSM Gen: Requisitos (${totalAddressesNeededHeuristic}) exceden bloque inicial (${totalAvailableAddresses}).`);
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

        // Si el cálculo fue exitoso, el problema es válido
        if (calculationResult.success && calculationResult.data && calculationResult.data.length === requirements.length) {
             // Asegurarse de que se asignaron todas las redes pedidas
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
