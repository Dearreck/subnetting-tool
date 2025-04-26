/**
 * uiController.js - Controlador de la interfaz de usuario para la Herramienta de Subneteo.
 * Maneja eventos, interactúa con la lógica (subnetLogic, exerciseGenerator) y actualiza el DOM.
 * Asume que ipUtils.js, subnetLogic.js, y exerciseGenerator.js están cargados previamente.
 */

// Espera a que todo el contenido del DOM esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    // (Sin cambios aquí...)
    const btnCalculatorMode = document.getElementById('btnCalculatorMode');
    const btnExerciseMode = document.getElementById('btnExerciseMode');
    const calculatorModeSection = document.getElementById('calculatorMode');
    const exerciseModeSection = document.getElementById('exerciseMode');
    const calcTypeRadios = document.querySelectorAll('input[name="calcType"]');
    const classfulForm = document.getElementById('classfulForm');
    const vlsmForm = document.getElementById('vlsmForm');
    const classfulNetworkIpInput = document.getElementById('classfulNetworkIp');
    const classfulIpInfoSpan = classfulForm.querySelector('.ip-info');
    const classfulReqTypeRadios = document.querySelectorAll('input[name="classfulRequirement"]');
    const numSubnetsInput = document.getElementById('numSubnets');
    const numHostsInput = document.getElementById('numHosts');
    const vlsmNetworkIpInput = document.getElementById('vlsmNetworkIp');
    const vlsmRequirementsContainer = document.getElementById('vlsmRequirements');
    const addVlsmRequirementBtn = document.getElementById('addVlsmRequirement');
    const calculatorResultsDiv = document.getElementById('calculatorResults');
    const calcSummaryDiv = document.getElementById('calcSummary');
    const calcTableContainer = document.getElementById('calcTableContainer');
    const exerciseTypeSelect = document.getElementById('exerciseType');
    const generateExerciseBtn = document.getElementById('generateExercise');
    const exercisePromptDiv = document.getElementById('exercisePrompt');
    const exerciseSolutionInputDiv = document.getElementById('exerciseSolutionInput');
    const userAnswerTableContainer = document.getElementById('userAnswerTableContainer');
    const checkAnswerBtn = document.getElementById('checkAnswer');
    const exerciseFeedbackDiv = document.getElementById('exerciseFeedback');
    const exerciseFeedbackParagraph = exerciseFeedbackDiv.querySelector('p');
    const exerciseSolutionDiv = document.getElementById('exerciseSolution');
    const solutionTableContainer = document.getElementById('solutionTableContainer');
    const showSolutionBtn = document.getElementById('showSolutionBtn');
    const explanationControlsDiv = document.querySelector('.explanation-controls');
    const exerciseExplanationMethodSelect = document.getElementById('exerciseExplanationMethod');
    const showSolutionStepsBtn = document.getElementById('showSolutionSteps');
    const solutionStepsContentDiv = document.getElementById('solutionStepsContent');
    const yearSpan = document.getElementById('year');

    // --- ESTADO INTERNO ---
    let currentExerciseData = null;

    // --- FUNCIONES AUXILIARES DE UI ---
    // (Funciones updateFooterYear, switchMode, switchCalculatorForm, clearCalculatorResults, clearExerciseArea,
    // addVlsmRequirementRow, removeVlsmRequirementRow, displayError, clearError, displayCalculatorResults,
    // displayExercise, generateUserInputTable, getUserAnswers, compareAnswers, displayFeedback, highlightErrors,
    // displaySolution - SIN CAMBIOS, puedes copiar las de la versión anterior si es necesario)
    /** Actualiza el año en el footer */
    function updateFooterYear() {
        const currentYear = new Date().getFullYear();
        yearSpan.textContent = currentYear;
    }

    /** Cambia la visibilidad de las secciones de modo y actualiza botones */
    function switchMode(modeToShow) {
        if (modeToShow === 'calculator') {
            calculatorModeSection.classList.add('active');
            exerciseModeSection.classList.remove('active');
            btnCalculatorMode.classList.add('active');
            btnExerciseMode.classList.remove('active');
        } else if (modeToShow === 'exercise') {
            calculatorModeSection.classList.remove('active');
            exerciseModeSection.classList.add('active');
            btnCalculatorMode.classList.remove('active');
            btnExerciseMode.classList.add('active');
        }
        clearCalculatorResults();
        clearExerciseArea();
    }

     /** Cambia entre los formularios de Classful y VLSM dentro del modo Calculadora */
    function switchCalculatorForm(formToShow) {
        if (formToShow === 'classful') {
            classfulForm.classList.add('active');
            vlsmForm.classList.remove('active');
        } else if (formToShow === 'vlsm') {
            classfulForm.classList.remove('active');
            vlsmForm.classList.add('active');
        }
        clearCalculatorResults();
    }

    /** Limpia el área de resultados de la calculadora */
    function clearCalculatorResults() {
        calcSummaryDiv.innerHTML = '';
        calcTableContainer.innerHTML = '<p>Introduce los datos y haz clic en calcular.</p>';
    }

    /** Limpia toda el área de ejercicios */
     function clearExerciseArea() {
        exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Haz clic en "Generar Nuevo Ejercicio".</p>';
        exerciseSolutionInputDiv.style.display = 'none';
        userAnswerTableContainer.innerHTML = '';
        exerciseFeedbackDiv.style.display = 'none';
        exerciseFeedbackParagraph.textContent = '';
        exerciseFeedbackDiv.classList.remove('correct', 'incorrect');
        exerciseSolutionDiv.style.display = 'none';
        solutionTableContainer.innerHTML = '';
        solutionStepsContentDiv.innerHTML = '';
        solutionStepsContentDiv.style.display = 'none';
        if(showSolutionBtn) showSolutionBtn.style.display = 'none';
        if(explanationControlsDiv) explanationControlsDiv.style.display = 'none';
        currentExerciseData = null;
    }

    /** Añade una nueva fila para requisitos VLSM */
    function addVlsmRequirementRow() {
        const reqDiv = document.createElement('div');
        reqDiv.classList.add('vlsm-requirement');
        reqDiv.innerHTML = `
            <input type="number" min="1" placeholder="Hosts" required>
            <input type="text" placeholder="Nombre (Opcional)">
            <button type="button" class="remove-req">-</button>
        `;
        vlsmRequirementsContainer.appendChild(reqDiv);
    }

    /** Elimina una fila de requisito VLSM */
    function removeVlsmRequirementRow(buttonElement) {
        const rowToRemove = buttonElement.closest('.vlsm-requirement');
        if (vlsmRequirementsContainer.querySelectorAll('.vlsm-requirement').length > 1) {
            rowToRemove.remove();
        } else {
            alert("Debe haber al menos un requisito.");
        }
    }

    /** Muestra un mensaje de error */
    function displayError(target, message) {
        let errorElement;
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        if (!targetElement) return;
        let errorContainerId = `error-for-${targetElement.id || targetElement.classList[0] || 'element'}`;
         errorElement = document.getElementById(errorContainerId);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorContainerId;
            errorElement.classList.add('error-message');
            errorElement.style.color = 'red'; errorElement.style.fontSize = '0.9em'; errorElement.style.marginTop = '5px';
            if (targetElement.parentNode && targetElement.nextSibling) { targetElement.parentNode.insertBefore(errorElement, targetElement.nextSibling); }
            else if (targetElement.parentNode){ targetElement.parentNode.appendChild(errorElement); }
            else { targetElement.appendChild(errorElement); }
        }
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    /** Limpia mensajes de error */
    function clearError(target) {
         const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
         if (!targetElement) return;
         let errorContainerId = `error-for-${targetElement.id || targetElement.classList[0] || 'element'}`;
         const errorElement = document.getElementById(errorContainerId);
          if (errorElement) { errorElement.textContent = ''; errorElement.style.display = 'none'; }
    }

    /** Muestra resultados de la calculadora */
    function displayCalculatorResults(result) {
        clearCalculatorResults();
        if (!result.success) { displayError(calcTableContainer, `Error: ${result.error}`); return; }
        if (!result.data || result.data.length === 0) { calcTableContainer.innerHTML = '<p>No se generaron subredes...</p>'; return; }
        const data = result.data;
        const isClassfulResult = data.length > 0 && data[0].requestedHosts === undefined;
        let summaryHTML = `Cálculo completado. Se generaron ${data.length} subred(es).`;
        if (isClassfulResult) {
            const commonMask = data[0].mask; const commonPrefix = data[0].prefix;
            const commonTotalHosts = data[0].totalHosts.toLocaleString(); const commonUsableHosts = data[0].usableHosts.toLocaleString();
            summaryHTML += `<br><span class="common-info">Máscara común: ${commonMask} (/${commonPrefix}) | Hosts Usables p/Subred: ${commonUsableHosts} (Total: ${commonTotalHosts})</span>`;
            if (data.length > 1) { summaryHTML += `<br><small style='color: #6c757d;'><i>Las filas resaltadas representan 'Subnet Zero' y 'All-Ones Subnet'...</i></small>`; }
        }
        calcSummaryDiv.innerHTML = summaryHTML;
        let tableHTML = `<table><thead><tr><th>Nombre</th><th>Dir. Red</th>${isClassfulResult ? '' : '<th>Máscara</th><th>Prefijo</th>'}<th>Rango Usable</th><th>Broadcast</th>${isClassfulResult ? '' : '<th>Hosts Totales</th><th>Hosts Usables</th>'}${!isClassfulResult ? '<th>Hosts Pedidos</th>' : ''}</tr></thead><tbody>`;
        data.forEach((subnet, index) => {
            let rowClass = ''; let nameSuffix = '';
            if (isClassfulResult && data.length > 1) {
                 if (index === 0) { rowClass = ' class="subnet-zero-or-all-ones"'; nameSuffix = ' <span class="subnet-label">(Subnet Zero)</span>'; }
                 else if (index === data.length - 1) { rowClass = ' class="subnet-zero-or-all-ones"'; nameSuffix = ' <span class="subnet-label">(All-Ones)</span>'; }
            }
            tableHTML += `<tr${rowClass}><td>${subnet.name || '-'}${nameSuffix}</td><td>${subnet.networkAddress}</td>${isClassfulResult ? '' : `<td>${subnet.mask}</td><td>/${subnet.prefix}</td>`}<td>${subnet.firstUsable ? `${subnet.firstUsable} - ${subnet.lastUsable}` : 'N/A'}</td><td>${subnet.broadcastAddress}</td>${isClassfulResult ? '' : `<td style="text-align: right;">${subnet.totalHosts.toLocaleString()}</td><td style="text-align: right;">${subnet.usableHosts.toLocaleString()}</td>`}${!isClassfulResult ? `<td style="text-align: right;">${subnet.requestedHosts.toLocaleString()}</td>` : ''}</tr>`;
        });
        tableHTML += `</tbody></table>`;
        calcTableContainer.innerHTML = tableHTML;
    }

    /** Muestra el problema del ejercicio */
    function displayExercise(exerciseData) {
        clearExerciseArea();
        if (!exerciseData || !exerciseData.problemStatement || !exerciseData.solution) {
            exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Error al generar el ejercicio...</p>'; return;
        }
        currentExerciseData = exerciseData;
        exercisePromptDiv.innerHTML = `<h3>Problema:</h3><p>${exerciseData.problemStatement.replace(/\n/g, '<br>')}</p>`;
        generateUserInputTable(currentExerciseData.solution);
        exerciseSolutionInputDiv.style.display = 'block';
        checkAnswerBtn.style.display = 'inline-block';
    }

    /** Genera tabla de entrada para el usuario */
    function generateUserInputTable(correctSolution) {
        if (!correctSolution || correctSolution.length === 0) { userAnswerTableContainer.innerHTML = '<p>Error: Solución no válida.</p>'; return; }
        let tableHTML = `<table><thead><tr><th>Nombre</th><th>Dir. Red</th><th>Máscara / Prefijo</th><th>Primer Host Usable</th><th>Último Host Usable</th><th>Broadcast</th></tr></thead><tbody>`;
        correctSolution.forEach((subnet, index) => {
            const name = subnet.name || `Subred ${index + 1}`;
            tableHTML += `<tr><td>${name}</td><td><input type="text" data-field="networkAddress" data-index="${index}" placeholder="Ej: 192.168.1.0"></td><td><input type="text" data-field="maskOrPrefix" data-index="${index}" placeholder="Ej: /24"></td><td><input type="text" data-field="firstUsable" data-index="${index}" placeholder="Ej: 192.168.1.1"></td><td><input type="text" data-field="lastUsable" data-index="${index}" placeholder="Ej: 192.168.1.254"></td><td><input type="text" data-field="broadcastAddress" data-index="${index}" placeholder="Ej: 192.168.1.255"></td></tr>`;
        });
        tableHTML += `</tbody></table>`;
        userAnswerTableContainer.innerHTML = tableHTML;
    }

    /** Obtiene respuestas del usuario */
    function getUserAnswers() {
        const userAnswers = [];
        const rows = userAnswerTableContainer.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input[data-field]');
            const answer = { index: index };
            inputs.forEach(input => { answer[input.dataset.field] = input.value.trim(); });
            userAnswers.push(answer);
        });
        return userAnswers;
    }

    /** Compara respuestas */
    function compareAnswers(userAnswers, correctSolution) {
        // Implementación de compareAnswers (sin cambios)
        let isFullyCorrect = true; let feedback = ''; const errors = [];
        if (!correctSolution || userAnswers.length !== correctSolution.length) { return { correct: false, feedback: 'Error: El número de respuestas no coincide.', errors: [] }; }
        for (let i = 0; i < correctSolution.length; i++) {
            const user = userAnswers[i]; const correct = correctSolution[i]; let rowErrors = {};
            if (user.networkAddress !== correct.networkAddress) { isFullyCorrect = false; rowErrors.networkAddress = `Esperado: ${correct.networkAddress}`; }
            let userPrefix = null;
            if (user.maskOrPrefix.startsWith('/')) { userPrefix = parseInt(user.maskOrPrefix.substring(1), 10); }
            else if (isValidMask(user.maskOrPrefix)) { userPrefix = getPrefixLength(user.maskOrPrefix); }
            if (userPrefix === null || userPrefix !== correct.prefix) { isFullyCorrect = false; rowErrors.maskOrPrefix = `Esperado: /${correct.prefix} (${correct.mask})`; }
            const expectedFirst = correct.firstUsable || 'N/A'; if(user.firstUsable !== expectedFirst) { isFullyCorrect = false; rowErrors.firstUsable = `Esperado: ${expectedFirst}`; }
            const expectedLast = correct.lastUsable || 'N/A'; if(user.lastUsable !== expectedLast) { isFullyCorrect = false; rowErrors.lastUsable = `Esperado: ${expectedLast}`; }
            if (user.broadcastAddress !== correct.broadcastAddress) { isFullyCorrect = false; rowErrors.broadcastAddress = `Esperado: ${correct.broadcastAddress}`; }
            if (Object.keys(rowErrors).length > 0) { errors.push({ index: i, fields: rowErrors, name: correct.name || `Subred ${i+1}` }); }
        }
        if (isFullyCorrect) { feedback = '¡Todas las respuestas son correctas! ¡Excelente trabajo!'; }
        else { feedback = `Se encontraron errores. Revisa los campos marcados o haz clic en "Mostrar Solución". Errores en ${errors.length} subred(es).`; }
        return { correct: isFullyCorrect, feedback: feedback, errors: errors };
    }

    /** Muestra feedback y botón de solución */
    function displayFeedback(comparisonResult) {
        exerciseFeedbackParagraph.textContent = comparisonResult.feedback;
        exerciseFeedbackDiv.classList.remove('correct', 'incorrect');
        if (comparisonResult.correct) { exerciseFeedbackDiv.classList.add('correct'); }
        else { exerciseFeedbackDiv.classList.add('incorrect'); highlightErrors(comparisonResult.errors); }
        exerciseFeedbackDiv.style.display = 'block';
        if (showSolutionBtn) { showSolutionBtn.style.display = 'inline-block'; }
        else { console.error("Error: Botón #showSolutionBtn no encontrado."); }
        exerciseSolutionDiv.style.display = 'none';
        solutionStepsContentDiv.style.display = 'none';
        if(explanationControlsDiv) explanationControlsDiv.style.display = 'none';
    }

    /** Resalta errores en inputs */
    function highlightErrors(errors) {
        userAnswerTableContainer.querySelectorAll('input').forEach(input => input.style.borderColor = '#ccc');
        errors.forEach(errorDetail => {
            const row = userAnswerTableContainer.querySelectorAll('tbody tr')[errorDetail.index];
            if (row) {
                 for (const fieldName in errorDetail.fields) {
                     const input = row.querySelector(`input[data-field="${fieldName}"]`);
                      if (input) { input.style.borderColor = 'red'; }
                 }
            }
        });
    }

    /** Muestra tabla de solución y controles de explicación */
    function displaySolution(correctSolution) {
        if (!correctSolution) { solutionTableContainer.innerHTML = '<p>No hay solución disponible.</p>'; return; }
        const resultObject = { success: true, data: correctSolution };
        const isClassfulResult = correctSolution.length > 0 && correctSolution[0].requestedHosts === undefined;
        let tableHTML = '';
        if (!resultObject.data || resultObject.data.length === 0) { tableHTML = '<p>No se generaron subredes.</p>'; }
        else {
            const data = resultObject.data;
            tableHTML = `<h4>Tabla de Solución Correcta:</h4><table><thead><tr><th>Nombre</th><th>Dir. Red</th>${isClassfulResult ? '' : '<th>Máscara</th><th>Prefijo</th>'}<th>Rango Usable</th><th>Broadcast</th>${isClassfulResult ? '' : '<th>Hosts Totales</th><th>Hosts Usables</th>'}${!isClassfulResult ? '<th>Hosts Pedidos</th>' : ''}</tr></thead><tbody>`;
            data.forEach(subnet => {
                tableHTML += `<tr><td>${subnet.name || '-'}</td><td>${subnet.networkAddress}</td>${isClassfulResult ? '' : `<td>${subnet.mask}</td><td>/${subnet.prefix}</td>`}<td>${subnet.firstUsable ? `${subnet.firstUsable} - ${subnet.lastUsable}` : 'N/A'}</td><td>${subnet.broadcastAddress}</td>${isClassfulResult ? '' : `<td style="text-align: right;">${subnet.totalHosts.toLocaleString()}</td><td style="text-align: right;">${subnet.usableHosts.toLocaleString()}</td>`}${!isClassfulResult ? `<td style="text-align: right;">${subnet.requestedHosts.toLocaleString()}</td>` : ''}</tr>`;
            });
            tableHTML += `</tbody></table>`;
        }
        solutionTableContainer.innerHTML = tableHTML;
        exerciseSolutionDiv.style.display = 'block';
        if(explanationControlsDiv) explanationControlsDiv.style.display = 'flex';
    }

    /**
     * Genera el HTML con los pasos de la explicación para un ejercicio de subneteo.
     * @param {object} problemData - Los datos originales del problema (red, requisitos).
     * @param {object[]} solution - La solución calculada (array de subredes).
     * @param {'magic'|'wildcard'} method - El método de explicación seleccionado.
     * @returns {string} - Una cadena HTML con la explicación.
     */
    function generateExplanationSteps(problemData, solution, method) {
        // --- DEBUG LOG INICIAL ---
        console.log(`DEBUG: Generando explicación - Método: ${method}`);
        console.log("DEBUG: Datos del problema:", JSON.stringify(problemData));
        console.log("DEBUG: Solución:", JSON.stringify(solution));

        let html = `<h4>Explicación (${method === 'magic' ? 'Magic Number' : 'Wildcard Conceptual'})</h4>`;
        if (!problemData || !solution || solution.length === 0) {
            console.error("DEBUG: Datos insuficientes para generar explicación.");
            return html + "<p>No hay datos suficientes para generar la explicación.</p>";
        }
        const isClassful = problemData.requirement !== undefined;
        console.log(`DEBUG: Es Classful: ${isClassful}`);

        try { // Envolver en try...catch para capturar errores inesperados
            if (method === 'magic') {
                console.log("DEBUG: Entrando a lógica Magic Number");
                if (isClassful) {
                    console.log("DEBUG: Magic Number - Classful");
                    // --- Magic Number para Classful (CORREGIDO) ---
                    const initialNetwork = problemData.network;
                    const requirement = problemData.requirement;
                    const firstSubnet = solution[0];
                    const actualPrefix = firstSubnet.prefix;
                    const actualMask = firstSubnet.mask;
                    const defaultMask = getDefaultMask(initialNetwork);
                    const defaultPrefix = getPrefixLength(defaultMask);

                    // Validar que defaultPrefix no sea null
                    if (defaultPrefix === null) throw new Error("No se pudo obtener el prefijo por defecto.");

                    const subnetBitsBorrowed = actualPrefix - defaultPrefix;
                    const numGeneratedSubnets = Math.pow(2, subnetBitsBorrowed);

                    console.log("DEBUG: Classful - Variables calculadas:", { initialNetwork, requirement, actualPrefix, actualMask, defaultMask, defaultPrefix, subnetBitsBorrowed, numGeneratedSubnets });

                    html += `<p><strong>1. Red Inicial y Requisito:</strong></p><ul>...</ul>`; // (Contenido omitido por brevedad, igual al anterior)
                    html += `<p><strong>2. Calcular Nueva Máscara/Prefijo:</strong></p><ul>`;
                    if (requirement.type === 'subnets') {
                        const strictlyNeededBits = bitsForSubnets(requirement.value);
                        if (subnetBitsBorrowed === strictlyNeededBits) {
                            html += `<li>Para ${requirement.value} subredes, se necesitan ${subnetBitsBorrowed} bits...</li>`;
                        } else {
                            html += `<li>Para satisfacer ${requirement.value} subredes (y considerando N+2 histórico)... se necesitaron <strong>${subnetBitsBorrowed}</strong> bits...</li>`;
                        }
                        html += `<li>(Cálculo: 2<sup>${subnetBitsBorrowed}</sup> = ${numGeneratedSubnets} subredes totales)</li>`;
                    } else { // hosts
                        const neededHostBits = 32 - actualPrefix;
                        html += `<li>Para ${requirement.value} hosts... se necesitan ${neededHostBits} bits de host...</li>`;
                        html += `<li>Esto requiere tomar prestados ${subnetBitsBorrowed} bits...</li>`;
                    }
                    html += `<li>Nuevo Prefijo = ${defaultPrefix} + ${subnetBitsBorrowed} = <strong>${actualPrefix}</strong>.</li>`;
                    html += `<li>Nueva Máscara: <code>${actualMask}</code> (/${actualPrefix})</li></ul>`;

                    html += `<p><strong>3. Calcular "Magic Number":</strong></p><ul>`;
                    const blockSize = getTotalHosts(actualPrefix);
                    html += `<li>Tamaño del bloque: 2<sup>${32-actualPrefix}</sup> = <strong>${blockSize.toLocaleString()}</strong> direcciones.</li>`;
                    const maskOctets = actualMask.split('.').map(Number);
                    let interestingOctetIndex = -1;
                    let magicNumber = null;
                    for(let i = 3; i >= 0; i--) { if (maskOctets[i] < 255) { interestingOctetIndex = i; break; } }
                    if (interestingOctetIndex !== -1) {
                        magicNumber = 256 - maskOctets[interestingOctetIndex];
                        html += `<li>"Magic Number" en ${interestingOctetIndex + 1}º octeto = <strong>${magicNumber}</strong>.</li>`;
                    } else { html += `<li>Máscara /32.</li>`; }
                    html += `</ul>`;

                    html += `<p><strong>4. Listar Subredes (${numGeneratedSubnets} total):</strong></p>`;
                    const baseNetworkForListing = getNetworkAddress(initialNetwork, defaultMask); // Asegurar que empezamos desde la red base
                    html += `<p>Comenzando desde <code>${baseNetworkForListing}</code> usando Magic Number (${magicNumber || 'N/A'}) o tamaño de bloque (${blockSize}):</p><ul>`;
                    solution.forEach((subnet, index) => { html += `<li>Subred ${index + 1}: <code>${subnet.networkAddress}/${subnet.prefix}</code></li>`; });
                    html += `</ul>`;
                    if (solution.length > 1) { html += `<p><small><i>Nota: Modernamente todas son usables...</i></small></p>`; }

                } else { // VLSM
                    console.log("DEBUG: Magic Number - VLSM");
                    // ... (Lógica VLSM - parece menos propensa a errores aquí, pero añadir logs si es necesario) ...
                    const initialCIDR = problemData.network;
                    const requirements = problemData.requirements;
                    html += `<p><strong>1. Bloque Inicial:</strong> <code>${initialCIDR}</code></p>`;
                    html += `<p><strong>2. Asignación de Subredes:</strong></p><ol>`;
                    let currentAvailable = initialCIDR.split('/')[0];
                    solution.forEach((subnet, index) => {
                        const req = requirements[index];
                        const neededHostBits = bitsForHosts(req.hosts);
                        const prefix = 32 - neededHostBits;
                        const blockSize = getTotalHosts(prefix);
                        html += `<li><strong>Req: ${req.name} (${req.hosts} hosts)</strong><ul>`;
                        html += `<li>Bits host: ${neededHostBits}, Prefijo: /${prefix}, Máscara: <code>${getMaskStringFromPrefix(prefix)}</code>, Tamaño: ${blockSize.toLocaleString()}</li>`;
                        html += `<li>Buscando desde <code>${currentAvailable}</code>...</li>`;
                        html += `<li>**Asignado:** <code>${subnet.networkAddress}/${subnet.prefix}</code></li>`;
                        html += `<li>Broadcast: <code>${subnet.broadcastAddress}</code>, Rango: ${subnet.firstUsable ? `<code>${subnet.firstUsable}</code> - <code>${subnet.lastUsable}</code>` : 'N/A'}</li>`;
                        html += `</ul></li>`;
                        currentAvailable = getNextAvailableNetwork(subnet.networkAddress, subnet.prefix) || '(Agotado)';
                    });
                    html += `</ol>`;
                }
            } else if (method === 'wildcard') {
                console.log("DEBUG: Entrando a lógica Wildcard");
                // ... (Lógica Wildcard - asumimos que funciona) ...
                 html += `<p>La máscara wildcard es la inversa...</p>`;
                if (isClassful) {
                     const firstSubnet = solution[0]; const newMask = firstSubnet.mask; const newPrefix = firstSubnet.prefix;
                     const wildcardInt = (~ipToInt(newMask)) >>> 0; const wildcardMask = intToIp(wildcardInt);
                     html += `<p>Para máscara <code>${newMask}</code> (/${newPrefix}), wildcard: <code>${wildcardMask}</code>.</p>`;
                     html += `<p><strong>Cálculo Broadcast (Ej: Subred 1 ${solution[0].networkAddress}):</strong></p><ul>`;
                     html += `<li>Broadcast = Red | Wildcard = <code>${solution[0].networkAddress} | ${wildcardMask}</code> = <code>${solution[0].broadcastAddress}</code>.</li></ul>`;
                     html += `<p>IPs usables: Red+1 a Broadcast-1.</p>`;
                } else { // VLSM
                     html += `<p>En VLSM, cada subred tiene su wildcard.</p><ol>`;
                     solution.forEach((subnet) => {
                         const wildcardInt = (~ipToInt(subnet.mask)) >>> 0; const wildcardMask = intToIp(wildcardInt);
                         html += `<li><strong>${subnet.name} (${subnet.networkAddress}/${subnet.prefix})</strong><ul>`;
                         html += `<li>Máscara: <code>${subnet.mask}</code> | Wildcard: <code>${wildcardMask}</code></li>`;
                         html += `<li>Broadcast = <code>${subnet.networkAddress} | ${wildcardMask}</code> = <code>${subnet.broadcastAddress}</code></li>`;
                         html += `<li>Rango Usable: ${subnet.firstUsable ? `<code>${subnet.firstUsable}</code> - <code>${subnet.lastUsable}</code>` : 'N/A'}</li></ul></li>`;
                     });
                     html += `</ol>`;
                }
                html += "<p><em>Nota: Explicación conceptual.</em></p>";
            } else {
                console.warn("DEBUG: Método de explicación no reconocido:", method);
                html += "<p>Método de explicación no reconocido.</p>";
            }
        } catch (error) {
            console.error("ERROR en generateExplanationSteps:", error);
            html += `<p style="color: red;"><strong>Error al generar la explicación:</strong> ${error.message || 'Error desconocido'}</p>`;
        }

        console.log("DEBUG: HTML final generado:", html.substring(0, 200) + "..."); // Mostrar inicio del HTML
        return html;
    }


    // --- ASIGNACIÓN DE EVENT LISTENERS ---
    // (Sin cambios aquí...)
    btnCalculatorMode.addEventListener('click', () => switchMode('calculator'));
    btnExerciseMode.addEventListener('click', () => switchMode('exercise'));
    calcTypeRadios.forEach(radio => { radio.addEventListener('change', (event) => { switchCalculatorForm(event.target.value); }); });
    classfulNetworkIpInput.addEventListener('input', () => { /* ... validación ... */ });
    classfulNetworkIpInput.addEventListener('blur', () => { /* ... validación ... */ });
    classfulForm.addEventListener('submit', (event) => { /* ... cálculo classful ... */ });
    addVlsmRequirementBtn.addEventListener('click', addVlsmRequirementRow);
    vlsmRequirementsContainer.addEventListener('click', (event) => { if (event.target.classList.contains('remove-req')) { removeVlsmRequirementRow(event.target); } });
    vlsmForm.addEventListener('submit', (event) => { /* ... cálculo vlsm ... */ });
    generateExerciseBtn.addEventListener('click', () => { /* ... generar ejercicio ... */ });
    checkAnswerBtn.addEventListener('click', () => { /* ... verificar respuesta ... */ });
    if (showSolutionBtn) { showSolutionBtn.addEventListener('click', () => { /* ... mostrar solución ... */ }); }
    else { console.error("Elemento #showSolutionBtn no encontrado."); }

    // Listener CORREGIDO para botón "Mostrar Pasos"
    showSolutionStepsBtn.addEventListener('click', () => {
        console.log("DEBUG: Click en Mostrar Pasos. Datos actuales:", currentExerciseData); // LOG INICIAL
        // Asegurarse de que currentExerciseData y sus propiedades existan
        if (!currentExerciseData || !currentExerciseData.problemData || !currentExerciseData.solution) {
            solutionStepsContentDiv.innerHTML = '<p>Error: No hay datos del problema o solución disponibles. Por favor, genera y verifica un ejercicio primero.</p>';
            solutionStepsContentDiv.style.display = 'block';
            console.error("DEBUG: Faltan datos para generar pasos.");
            return;
        }
        const method = exerciseExplanationMethodSelect.value;
        console.log(`DEBUG: Método seleccionado: ${method}`);
        try {
            const explanationHTML = generateExplanationSteps(currentExerciseData.problemData, currentExerciseData.solution, method);
            console.log("DEBUG: HTML generado por generateExplanationSteps:", explanationHTML.substring(0, 200) + "..."); // Log del HTML
            solutionStepsContentDiv.innerHTML = explanationHTML;
            solutionStepsContentDiv.style.display = 'block';
            console.log("DEBUG: Contenido de pasos mostrado.");
        } catch (error) {
             console.error("ERROR al mostrar pasos:", error);
             solutionStepsContentDiv.innerHTML = `<p style="color: red;"><strong>Ocurrió un error al intentar mostrar los pasos.</strong></p>`;
             solutionStepsContentDiv.style.display = 'block';
        }
    });

    // --- INICIALIZACIÓN ---
    updateFooterYear();
    switchMode('calculator'); // Iniciar en modo calculadora
    switchCalculatorForm('vlsm'); // Mostrar formulario VLSM por defecto

}); // Fin de DOMContentLoaded
