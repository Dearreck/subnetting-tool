/**
 * uiController.js - Controlador de la interfaz de usuario para la Herramienta de Subneteo.
 * Maneja eventos, interactúa con la lógica (subnetLogic, exerciseGenerator) y actualiza el DOM.
 * Asume que ipUtils.js, subnetLogic.js, y exerciseGenerator.js están cargados previamente.
 */

// Espera a que todo el contenido del DOM esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
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
    let currentExerciseData = null; // Almacenará { problemData, solution }

    // --- FUNCIONES AUXILIARES DE UI ---

    /** Actualiza el año en el footer */
    function updateFooterYear() {
        const currentYear = new Date().getFullYear();
        if(yearSpan) yearSpan.textContent = currentYear;
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
        if(calcSummaryDiv) calcSummaryDiv.innerHTML = '';
        if(calcTableContainer) calcTableContainer.innerHTML = '<p>Introduce los datos y haz clic en calcular.</p>';
    }

    /** Limpia toda el área de ejercicios */
     function clearExerciseArea() {
        if(exercisePromptDiv) exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Haz clic en "Generar Nuevo Ejercicio".</p>';
        if(exerciseSolutionInputDiv) exerciseSolutionInputDiv.style.display = 'none';
        if(userAnswerTableContainer) userAnswerTableContainer.innerHTML = '';
        if(exerciseFeedbackDiv) exerciseFeedbackDiv.style.display = 'none';
        if(exerciseFeedbackParagraph) exerciseFeedbackParagraph.textContent = '';
        if(exerciseFeedbackDiv) exerciseFeedbackDiv.classList.remove('correct', 'incorrect');
        if(exerciseSolutionDiv) exerciseSolutionDiv.style.display = 'none';
        if(solutionTableContainer) solutionTableContainer.innerHTML = '';
        if(solutionStepsContentDiv) solutionStepsContentDiv.innerHTML = '';
        if(solutionStepsContentDiv) solutionStepsContentDiv.style.display = 'none';
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
        if(vlsmRequirementsContainer) vlsmRequirementsContainer.appendChild(reqDiv);
    }

    /** Elimina una fila de requisito VLSM */
    function removeVlsmRequirementRow(buttonElement) {
        const rowToRemove = buttonElement.closest('.vlsm-requirement');
        if (vlsmRequirementsContainer && vlsmRequirementsContainer.querySelectorAll('.vlsm-requirement').length > 1) {
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
            if (data.length > 1) { summaryHTML += `<br><small style='color: #6c757d;'><i>Las filas resaltadas representan 'Subnet Zero' y 'All-Ones Subnet', históricamente no utilizadas.</i></small>`; }
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
        if (!exerciseFeedbackParagraph || !exerciseFeedbackDiv || !showSolutionBtn || !exerciseSolutionDiv || !solutionStepsContentDiv || !explanationControlsDiv) {
            console.error("Error: Faltan elementos de UI para mostrar feedback/solución.");
            return;
        }
        exerciseFeedbackParagraph.textContent = comparisonResult.feedback;
        exerciseFeedbackDiv.classList.remove('correct', 'incorrect');
        if (comparisonResult.correct) { exerciseFeedbackDiv.classList.add('correct'); }
        else { exerciseFeedbackDiv.classList.add('incorrect'); highlightErrors(comparisonResult.errors); }
        exerciseFeedbackDiv.style.display = 'block';
        showSolutionBtn.style.display = 'inline-block';
        exerciseSolutionDiv.style.display = 'none'; // Ocultar solución inicialmente
        solutionStepsContentDiv.style.display = 'none'; // Ocultar pasos
        explanationControlsDiv.style.display = 'none'; // Ocultar controles
    }

    /** Resalta errores en inputs */
    function highlightErrors(errors) {
        if(!userAnswerTableContainer) return;
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
        if (!solutionTableContainer || !exerciseSolutionDiv || !explanationControlsDiv) {
             console.error("Error: Faltan elementos de UI para mostrar la solución.");
             return;
        }
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
        explanationControlsDiv.style.display = 'flex';
    }

    /**
     * Genera el HTML con los pasos de la explicación para un ejercicio de subneteo.
     * (Incluye la lógica corregida para Classful Magic Number)
     * @param {object} problemData - Los datos originales del problema (red, requisitos).
     * @param {object[]} solution - La solución calculada (array de subredes).
     * @param {'magic'|'wildcard'} method - El método de explicación seleccionado.
     * @returns {string} - Una cadena HTML con la explicación.
     */
    function generateExplanationSteps(problemData, solution, method) {
        let html = `<h4>Explicación (${method === 'magic' ? 'Magic Number' : 'Wildcard Conceptual'})</h4>`;
        if (!problemData || !solution || solution.length === 0) {
            return html + "<p>No hay datos suficientes para generar la explicación.</p>";
        }
        const isClassful = problemData.requirement !== undefined;

        try {
            if (method === 'magic') {
                if (isClassful) {
                    // --- Magic Number para Classful (CORREGIDO) ---
                    const initialNetwork = problemData.network;
                    const requirement = problemData.requirement;
                    const firstSubnet = solution[0];
                    const actualPrefix = firstSubnet.prefix;
                    const actualMask = firstSubnet.mask;
                    const defaultMask = getDefaultMask(initialNetwork);
                    const defaultPrefix = getPrefixLength(defaultMask);

                    if (defaultPrefix === null) throw new Error("No se pudo obtener el prefijo por defecto.");

                    const subnetBitsBorrowed = actualPrefix - defaultPrefix;
                    const numGeneratedSubnets = Math.pow(2, subnetBitsBorrowed);

                    html += `<p><strong>1. Red Inicial y Requisito:</strong></p>
                             <ul>
                                <li>Red Base: <code>${initialNetwork}</code> (Clase ${getIpClass(initialNetwork)})</li>
                                <li>Máscara por Defecto: <code>${defaultMask}</code> (/${defaultPrefix})</li>
                                <li>Requisito: ${requirement.value} ${requirement.type === 'subnets' ? 'subredes' : 'hosts utilizables'}</li>
                             </ul>`;

                    html += `<p><strong>2. Calcular Nueva Máscara/Prefijo (basado en la solución):</strong></p>
                             <ul>`;
                    if (requirement.type === 'subnets') {
                        const strictlyNeededBits = bitsForSubnets(requirement.value);
                        if (subnetBitsBorrowed === strictlyNeededBits) {
                            html += `<li>Para ${requirement.value} subredes, se necesitan ${subnetBitsBorrowed} bits de subred (2<sup>${subnetBitsBorrowed}</sup> = ${numGeneratedSubnets} >= ${requirement.value}).</li>`;
                        } else {
                            html += `<li>Para satisfacer el requisito de ${requirement.value} subredes, y considerando la práctica histórica de reservar espacio para 'Subnet Zero' y 'All-Ones' (necesitando teóricamente ${requirement.value + 2} subredes), se determinó que se necesitaban <strong>${subnetBitsBorrowed}</strong> bits de subred.</li>`;
                            html += `<li>(Cálculo: 2<sup>${subnetBitsBorrowed}</sup> = ${numGeneratedSubnets} >= ${requirement.value + 2}).</li>`;
                        }
                    } else { // hosts
                        const neededHostBits = 32 - actualPrefix;
                        html += `<li>Para alojar al menos ${requirement.value} hosts utilizables, se necesitan ${neededHostBits} bits de host (2<sup>${neededHostBits}</sup> = ${Math.pow(2, neededHostBits)} >= ${requirement.value} + 2).</li>`;
                        html += `<li>Esto requiere tomar prestados (32 - ${defaultPrefix} - ${neededHostBits}) = <strong>${subnetBitsBorrowed}</strong> bits para la subred.</li>`;
                    }
                    html += `<li>Nuevo Prefijo = Prefijo Default + Bits Prestados = ${defaultPrefix} + ${subnetBitsBorrowed} = <strong>${actualPrefix}</strong>.</li>`;
                    html += `<li>Nueva Máscara: <code>${actualMask}</code> (/${actualPrefix})</li></ul>`;

                    html += `<p><strong>3. Calcular el "Magic Number" (Salto o Tamaño de Bloque):</strong></p><ul>`;
                    const blockSize = getTotalHosts(actualPrefix);
                    html += `<li>El tamaño de cada bloque de subred es 2<sup>(32 - ${actualPrefix})</sup> = 2<sup>${32-actualPrefix}</sup> = <strong>${blockSize.toLocaleString()}</strong> direcciones.</li>`;
                    const maskOctets = actualMask.split('.').map(Number);
                    let interestingOctetIndex = -1;
                    let magicNumber = null;
                    for(let i = 3; i >= 0; i--) { if (maskOctets[i] < 255) { interestingOctetIndex = i; break; } }
                    if (interestingOctetIndex !== -1) {
                        magicNumber = 256 - maskOctets[interestingOctetIndex];
                        html += `<li>El "Magic Number" (incremento) en el <strong>${interestingOctetIndex + 1}º octeto</strong> es 256 - ${maskOctets[interestingOctetIndex]} = <strong>${magicNumber}</strong>.</li>`;
                    } else { html += `<li>La máscara es /32.</li>`; }
                    html += `</ul>`;

                    html += `<p><strong>4. Listar las Subredes Generadas (${numGeneratedSubnets} en total):</strong></p>`;
                    const baseNetworkForListing = getNetworkAddress(initialNetwork, defaultMask);
                    html += `<p>Comenzando desde <code>${baseNetworkForListing}</code> y usando el Magic Number (${magicNumber || 'N/A'}) en el ${interestingOctetIndex + 1}º octeto (o sumando el tamaño de bloque ${blockSize}):</p><ul>`;
                    solution.forEach((subnet, index) => { html += `<li>Subred ${index + 1}: <code>${subnet.networkAddress}/${subnet.prefix}</code></li>`; });
                    html += `</ul>`;
                    if (solution.length > 1) {
                        html += `<p><small><i>Nota: Con la configuración moderna ('ip subnet-zero' en Cisco), todas estas ${numGeneratedSubnets} subredes son utilizables. Históricamente, la primera (Subnet Zero) y la última (All-Ones) a veces se descartaban.</i></small></p>`;
                    }

                } else { // VLSM
                    // ... (Lógica VLSM - sin cambios) ...
                    const initialCIDR = problemData.network;
                    const requirements = problemData.requirements;
                    html += `<p><strong>1. Bloque Inicial:</strong> <code>${initialCIDR}</code></p>`;
                    html += `<p><strong>2. Asignación de Subredes:</strong></p><ol>`;
                    let currentAvailable = initialCIDR.split('/')[0];
                    solution.forEach((subnet, index) => {
                        const req = requirements[index]; const neededHostBits = bitsForHosts(req.hosts);
                        const prefix = 32 - neededHostBits; const blockSize = getTotalHosts(prefix);
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
                // ... (Lógica Wildcard - sin cambios) ...
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
                html += "<p>Método de explicación no reconocido.</p>";
            }
        } catch (error) {
            console.error("ERROR en generateExplanationSteps:", error);
            html += `<p style="color: red;"><strong>Error al generar la explicación:</strong> ${error.message || 'Error desconocido'}</p>`;
        }
        return html;
    }


    // --- ASIGNACIÓN DE EVENT LISTENERS ---

    // Cambio de Modo
    if(btnCalculatorMode && btnExerciseMode) {
        btnCalculatorMode.addEventListener('click', () => switchMode('calculator'));
        btnExerciseMode.addEventListener('click', () => switchMode('exercise'));
    }

    // Cambio de Tipo de Calculadora
    if(calcTypeRadios.length > 0) {
        calcTypeRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                switchCalculatorForm(event.target.value);
            });
        });
    }

     // Input de IP Classful
     if(classfulNetworkIpInput && classfulIpInfoSpan) {
         classfulNetworkIpInput.addEventListener('input', () => {
             clearError(classfulNetworkIpInput);
             const ip = classfulNetworkIpInput.value.trim(); let info = '';
             if (isValidIp(ip)) {
                const ipClass = getIpClass(ip); const defaultMask = getDefaultMask(ip);
                if(ipClass && defaultMask) info = `Clase ${ipClass}, Máscara Default: ${defaultMask}`;
                else if (ipClass) info = `Clase ${ipClass} (Rango especial/no subnetable A/B/C)`;
                else info = 'IP válida, pero clase no determinada.';
             } else if (ip !== '') info = 'Escribiendo IP...';
             classfulIpInfoSpan.textContent = info;
         });
         classfulNetworkIpInput.addEventListener('blur', () => {
             const ip = classfulNetworkIpInput.value.trim();
             if (ip !== '' && !isValidIp(ip)) displayError(classfulNetworkIpInput, 'Formato de IP inválido.');
             else if (ip !== '') clearError(classfulNetworkIpInput);
         });
     }

    // Submit Formulario Classful
    if(classfulForm) {
        classfulForm.addEventListener('submit', (event) => {
            event.preventDefault(); clearCalculatorResults(); clearError(calcTableContainer);
            const networkIp = classfulNetworkIpInput.value.trim();
            const selectedReqRadio = classfulForm.querySelector('input[name="classfulRequirement"]:checked');
            if (!isValidIp(networkIp)) { displayError(calcTableContainer, 'La dirección IP de red no es válida.'); return; }
            if (!selectedReqRadio) { displayError(calcTableContainer, 'Debes seleccionar un tipo de requisito.'); return; }
            const requirement = { type: selectedReqRadio.value };
            requirement.value = parseInt(requirement.type === 'subnets' ? numSubnetsInput.value : numHostsInput.value, 10);
            if (isNaN(requirement.value) || requirement.value <= 0) { displayError(calcTableContainer, 'El valor del requisito debe ser un número positivo.'); return; }
            const result = calculateClassful(networkIp, requirement);
            displayCalculatorResults(result);
        });
    }

    // Añadir/Quitar Requisitos VLSM
    if(addVlsmRequirementBtn && vlsmRequirementsContainer) {
        addVlsmRequirementBtn.addEventListener('click', addVlsmRequirementRow);
        vlsmRequirementsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-req')) {
                removeVlsmRequirementRow(event.target);
            }
        });
    }

    // Submit Formulario VLSM
    if(vlsmForm) {
        vlsmForm.addEventListener('submit', (event) => {
            event.preventDefault(); clearCalculatorResults(); clearError(calcTableContainer);
            const networkIpWithPrefix = vlsmNetworkIpInput.value.trim();
            const initialNetworkInfo = parseIpAndPrefix(networkIpWithPrefix);
            if (!initialNetworkInfo) { displayError(calcTableContainer, 'La red/prefijo inicial de VLSM no es válida (formato: x.x.x.x/yy).'); return; }
            const requirements = [];
            const requirementRows = vlsmRequirementsContainer.querySelectorAll('.vlsm-requirement');
            let reqError = false;
            requirementRows.forEach((row, index) => {
                const hostsInput = row.querySelector('input[type="number"]'); const nameInput = row.querySelector('input[type="text"]');
                const hosts = parseInt(hostsInput.value, 10); const name = nameInput.value.trim() || null;
                if (isNaN(hosts) || hosts < 0) { displayError(calcTableContainer, `Error en requisito #${index + 1}: Hosts debe ser número >= 0.`); reqError = true; }
                 if (!reqError) requirements.push({ hosts, name });
            });
            if (reqError) return;
            if (requirements.length === 0) { displayError(calcTableContainer, 'Debes añadir al menos un requisito de hosts.'); return; }
            requirements.sort((a, b) => b.hosts - a.hosts);
            const result = calculateVLSM(networkIpWithPrefix, requirements);
            displayCalculatorResults(result);
        });
    }

    // --- Event Listeners Ejercicios ---

    // Generar Ejercicio
    if(generateExerciseBtn && exerciseTypeSelect) {
        generateExerciseBtn.addEventListener('click', () => {
            const type = exerciseTypeSelect.value;
            let exerciseData = null;
            if (type === 'classful') exerciseData = generateClassfulProblem();
            else exerciseData = generateVLSMProblem();

            if (exerciseData) displayExercise(exerciseData);
            else exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Error: No se pudo generar un ejercicio válido. Inténtalo de nuevo.</p>';
        });
    }

    // Verificar Respuesta del Ejercicio
    if(checkAnswerBtn) {
        checkAnswerBtn.addEventListener('click', () => {
            if (!currentExerciseData || !currentExerciseData.solution) { alert("Primero genera un ejercicio."); return; }
            const userAnswers = getUserAnswers();
            const comparisonResult = compareAnswers(userAnswers, currentExerciseData.solution);
            displayFeedback(comparisonResult);
        });
    }

    // Botón "Mostrar Solución"
    if (showSolutionBtn) {
        showSolutionBtn.addEventListener('click', () => {
            if (currentExerciseData && currentExerciseData.solution) {
                displaySolution(currentExerciseData.solution);
                showSolutionBtn.style.display = 'none';
            }
        });
    } else {
        console.error("Elemento #showSolutionBtn no encontrado en el HTML.");
    }


    // Botón "Mostrar Pasos"
    if(showSolutionStepsBtn && exerciseExplanationMethodSelect && solutionStepsContentDiv) {
        showSolutionStepsBtn.addEventListener('click', () => {
            if (!currentExerciseData || !currentExerciseData.problemData || !currentExerciseData.solution) {
                solutionStepsContentDiv.innerHTML = '<p>Error: No hay datos del problema o solución disponibles...</p>';
                solutionStepsContentDiv.style.display = 'block';
                return;
            }
            const method = exerciseExplanationMethodSelect.value;
            try {
                const explanationHTML = generateExplanationSteps(currentExerciseData.problemData, currentExerciseData.solution, method);
                solutionStepsContentDiv.innerHTML = explanationHTML;
                solutionStepsContentDiv.style.display = 'block';
            } catch (error) {
                 console.error("ERROR al mostrar pasos:", error);
                 solutionStepsContentDiv.innerHTML = `<p style="color: red;"><strong>Ocurrió un error al intentar mostrar los pasos.</strong></p>`;
                 solutionStepsContentDiv.style.display = 'block';
            }
        });
    } else {
         console.error("Faltan elementos para la funcionalidad 'Mostrar Pasos' (#showSolutionStepsBtn, #exerciseExplanationMethod, #solutionStepsContentDiv).");
    }

    // --- INICIALIZACIÓN ---
    updateFooterYear();
    switchMode('calculator'); // Iniciar en modo calculadora
    switchCalculatorForm('vlsm'); // Mostrar formulario VLSM por defecto

}); // Fin de DOMContentLoaded
