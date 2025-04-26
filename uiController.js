/**
 * uiController.js - Controlador de la interfaz de usuario para la Herramienta de Subneteo.
 * Maneja eventos, interactúa con la lógica (subnetLogic, exerciseGenerator) y actualiza el DOM.
 * Asume que ipUtils.js, subnetLogic.js, y exerciseGenerator.js están cargados previamente.
 */

// Espera a que todo el contenido del DOM esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    // Botones de Modo
    const btnCalculatorMode = document.getElementById('btnCalculatorMode');
    const btnExerciseMode = document.getElementById('btnExerciseMode');
    // Secciones de Contenido de Modo
    const calculatorModeSection = document.getElementById('calculatorMode');
    const exerciseModeSection = document.getElementById('exerciseMode');

    // --- Calculadora ---
    const calcTypeRadios = document.querySelectorAll('input[name="calcType"]');
    const classfulForm = document.getElementById('classfulForm');
    const vlsmForm = document.getElementById('vlsmForm');
    // Classful Inputs
    const classfulNetworkIpInput = document.getElementById('classfulNetworkIp');
    const classfulIpInfoSpan = classfulForm.querySelector('.ip-info');
    const classfulReqTypeRadios = document.querySelectorAll('input[name="classfulRequirement"]');
    const numSubnetsInput = document.getElementById('numSubnets');
    const numHostsInput = document.getElementById('numHosts');
    // VLSM Inputs
    const vlsmNetworkIpInput = document.getElementById('vlsmNetworkIp');
    const vlsmRequirementsContainer = document.getElementById('vlsmRequirements');
    const addVlsmRequirementBtn = document.getElementById('addVlsmRequirement');
    // Calculadora Resultados
    const calculatorResultsDiv = document.getElementById('calculatorResults');
    const calcSummaryDiv = document.getElementById('calcSummary');
    const calcTableContainer = document.getElementById('calcTableContainer');

    // --- Ejercicios ---
    const exerciseTypeSelect = document.getElementById('exerciseType');
    const generateExerciseBtn = document.getElementById('generateExercise');
    const exercisePromptDiv = document.getElementById('exercisePrompt');
    const exerciseSolutionInputDiv = document.getElementById('exerciseSolutionInput');
    const userAnswerTableContainer = document.getElementById('userAnswerTableContainer');
    const checkAnswerBtn = document.getElementById('checkAnswer');
    const exerciseFeedbackDiv = document.getElementById('exerciseFeedback');
    const exerciseFeedbackParagraph = exerciseFeedbackDiv.querySelector('p');
    // Controles y área de solución/pasos
    const exerciseSolutionDiv = document.getElementById('exerciseSolution'); // Contenedor principal de la solución
    const solutionTableContainer = document.getElementById('solutionTableContainer'); // Donde va la tabla de solución
    const showSolutionBtn = document.getElementById('showSolutionBtn'); // Botón para MOSTRAR la tabla de solución
    const explanationControlsDiv = document.querySelector('.explanation-controls'); // Div que agrupa selector y botón de pasos
    const exerciseExplanationMethodSelect = document.getElementById('exerciseExplanationMethod'); // Selector de método
    const showSolutionStepsBtn = document.getElementById('showSolutionSteps'); // Botón para MOSTRAR los pasos
    const solutionStepsContentDiv = document.getElementById('solutionStepsContent'); // Div para el contenido de los pasos

    // --- Footer ---
    const yearSpan = document.getElementById('year');

    // --- ESTADO INTERNO ---
    let currentExerciseData = null; // Almacenará { problemData, solution } del ejercicio actual

    // --- FUNCIONES AUXILIARES DE UI ---

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
         // Limpiar resultados/ejercicios anteriores al cambiar de modo
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
        clearCalculatorResults(); // Limpiar resultados al cambiar tipo
    }

    /** Limpia el área de resultados de la calculadora */
    function clearCalculatorResults() {
        calcSummaryDiv.innerHTML = '';
        calcTableContainer.innerHTML = '<p>Introduce los datos y haz clic en calcular.</p>';
    }

    /** Limpia toda el área de ejercicios */
     function clearExerciseArea() {
        exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Haz clic en "Generar Nuevo Ejercicio".</p>';
        exerciseSolutionInputDiv.style.display = 'none'; // Ocultar área de entrada
        userAnswerTableContainer.innerHTML = '';
        exerciseFeedbackDiv.style.display = 'none'; // Ocultar feedback
        exerciseFeedbackParagraph.textContent = '';
        exerciseFeedbackDiv.classList.remove('correct', 'incorrect');
        exerciseSolutionDiv.style.display = 'none'; // Ocultar área de solución completa
        solutionTableContainer.innerHTML = ''; // Limpiar tabla de solución
        solutionStepsContentDiv.innerHTML = ''; // Limpiar pasos
        solutionStepsContentDiv.style.display = 'none'; // Ocultar pasos
        if(showSolutionBtn) showSolutionBtn.style.display = 'none'; // Ocultar botón "Mostrar Solución"
        if(explanationControlsDiv) explanationControlsDiv.style.display = 'none'; // Ocultar controles de explicación
        currentExerciseData = null; // Olvidar ejercicio anterior
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

    /**
     * Muestra un mensaje de error cerca de un elemento o en un área específica.
     * @param {HTMLElement|string} target - Elemento HTML o selector CSS donde mostrar el error.
     * @param {string} message - El mensaje de error.
     */
    function displayError(target, message) {
        // Implementación de displayError (sin cambios respecto a versiones anteriores)
        let errorElement;
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        if (!targetElement) return;
        let errorContainerId = `error-for-${targetElement.id || targetElement.classList[0] || 'element'}`;
         errorElement = document.getElementById(errorContainerId);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorContainerId;
            errorElement.classList.add('error-message');
            errorElement.style.color = 'red';
            errorElement.style.fontSize = '0.9em';
            errorElement.style.marginTop = '5px';
            if (targetElement.parentNode && targetElement.nextSibling) {
                 targetElement.parentNode.insertBefore(errorElement, targetElement.nextSibling);
            } else if (targetElement.parentNode){
                targetElement.parentNode.appendChild(errorElement);
            } else {
                 targetElement.appendChild(errorElement);
            }
        }
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    /** Limpia mensajes de error previos asociados a un elemento */
    function clearError(target) {
        // Implementación de clearError (sin cambios)
         const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
         if (!targetElement) return;
         let errorContainerId = `error-for-${targetElement.id || targetElement.classList[0] || 'element'}`;
         const errorElement = document.getElementById(errorContainerId);
          if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    /**
     * Genera y muestra la tabla de resultados de la calculadora.
     * Mueve los valores comunes (Máscara, Prefijo, Hosts) al resumen para resultados Classful.
     * @param {object} result - El objeto resultado de calculateClassful o calculateVLSM.
     */
    function displayCalculatorResults(result) {
        clearCalculatorResults(); // Limpiar antes de mostrar nuevos resultados

        if (!result.success) {
            displayError(calcTableContainer, `Error: ${result.error}`);
            return;
        }

        if (!result.data || result.data.length === 0) {
            calcTableContainer.innerHTML = '<p>No se generaron subredes con los criterios dados (posiblemente la red original ya cumple).</p>';
            return;
        }

        const data = result.data;
        // Determinar si es un resultado Classful (heurística: no tiene requestedHosts)
        const isClassfulResult = data.length > 0 && data[0].requestedHosts === undefined;

        // --- Construcción del Resumen ---
        let summaryHTML = `Cálculo completado. Se generaron ${data.length} subred(es).`;
        let commonMask = '';
        let commonPrefix = '';
        let commonTotalHosts = '';
        let commonUsableHosts = '';

        // Añadir información común y nota SOLO si es Classful
        if (isClassfulResult) {
            commonMask = data[0].mask;
            commonPrefix = data[0].prefix;
            commonTotalHosts = data[0].totalHosts.toLocaleString();
            commonUsableHosts = data[0].usableHosts.toLocaleString();
            summaryHTML += `<br><span class="common-info">Máscara común: ${commonMask} (/${commonPrefix}) | Hosts Usables p/Subred: ${commonUsableHosts} (Total: ${commonTotalHosts})</span>`;
            if (data.length > 1) {
                summaryHTML += `<br><small style='color: #6c757d;'><i>Las filas resaltadas representan 'Subnet Zero' y 'All-Ones Subnet', históricamente no utilizadas.</i></small>`;
            }
        }
        calcSummaryDiv.innerHTML = summaryHTML;

        // --- Construcción de la Tabla ---
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Dir. Red</th>
                        ${isClassfulResult ? '' : '<th>Máscara</th>'}
                        ${isClassfulResult ? '' : '<th>Prefijo</th>'}
                        <th>Rango Usable</th>
                        <th>Broadcast</th>
                        ${isClassfulResult ? '' : '<th>Hosts Totales</th>'}
                        ${isClassfulResult ? '' : '<th>Hosts Usables</th>'}
                        ${!isClassfulResult ? '<th>Hosts Pedidos</th>' : ''}
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach((subnet, index) => {
            let rowClass = '';
            let nameSuffix = '';
            if (isClassfulResult && data.length > 1) {
                 if (index === 0) {
                    rowClass = ' class="subnet-zero-or-all-ones"';
                    nameSuffix = ' <span class="subnet-label">(Subnet Zero)</span>';
                 } else if (index === data.length - 1) {
                     rowClass = ' class="subnet-zero-or-all-ones"';
                     nameSuffix = ' <span class="subnet-label">(All-Ones)</span>';
                 }
            }
            tableHTML += `
                <tr${rowClass}>
                    <td>${subnet.name || '-'}${nameSuffix}</td>
                    <td>${subnet.networkAddress}</td>
                    ${isClassfulResult ? '' : `<td>${subnet.mask}</td>`}
                    ${isClassfulResult ? '' : `<td>/${subnet.prefix}</td>`}
                    <td>${subnet.firstUsable ? `${subnet.firstUsable} - ${subnet.lastUsable}` : 'N/A'}</td>
                    <td>${subnet.broadcastAddress}</td>
                    ${isClassfulResult ? '' : `<td style="text-align: right;">${subnet.totalHosts.toLocaleString()}</td>`}
                    ${isClassfulResult ? '' : `<td style="text-align: right;">${subnet.usableHosts.toLocaleString()}</td>`}
                    ${!isClassfulResult ? `<td style="text-align: right;">${subnet.requestedHosts.toLocaleString()}</td>` : ''}
                </tr>
            `;
        });
        tableHTML += `</tbody></table>`;
        calcTableContainer.innerHTML = tableHTML;
    }

    /**
     * Muestra el problema generado y prepara el área de respuesta del usuario.
     * @param {object} exerciseData - El objeto devuelto por los generadores de ejercicios ({problemStatement, problemData, solution}).
     */
    function displayExercise(exerciseData) {
        clearExerciseArea(); // Limpiar área antes de mostrar nuevo ejercicio

        if (!exerciseData || !exerciseData.problemStatement || !exerciseData.solution) {
            exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Error al generar el ejercicio. Inténtalo de nuevo.</p>';
            return;
        }

        // Guardar los datos completos del ejercicio actual
        currentExerciseData = exerciseData;

        // Mostrar el enunciado del problema
        exercisePromptDiv.innerHTML = `<h3>Problema:</h3><p>${exerciseData.problemStatement.replace(/\n/g, '<br>')}</p>`;

        // Generar y mostrar la tabla para la respuesta del usuario
        generateUserInputTable(currentExerciseData.solution);
        exerciseSolutionInputDiv.style.display = 'block'; // Mostrar el área de respuesta
        checkAnswerBtn.style.display = 'inline-block'; // Asegurar que el botón de verificar esté visible
    }

    /**
     * Genera una tabla HTML con campos de entrada para que el usuario introduzca su solución.
     * @param {object[]} correctSolution - La solución correcta (array de subredes).
     */
    function generateUserInputTable(correctSolution) {
        // Implementación de generateUserInputTable (sin cambios)
        if (!correctSolution || correctSolution.length === 0) {
            userAnswerTableContainer.innerHTML = '<p>Error: No se pudo generar la tabla de respuesta (solución no válida).</p>';
            return;
        }
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Dir. Red</th>
                        <th>Máscara / Prefijo</th>
                        <th>Primer Host Usable</th>
                        <th>Último Host Usable</th>
                        <th>Broadcast</th>
                    </tr>
                </thead>
                <tbody>
        `;
        correctSolution.forEach((subnet, index) => {
            const name = subnet.name || `Subred ${index + 1}`;
            tableHTML += `
                <tr>
                    <td>${name}</td>
                    <td><input type="text" data-field="networkAddress" data-index="${index}" placeholder="Ej: 192.168.1.0"></td>
                    <td><input type="text" data-field="maskOrPrefix" data-index="${index}" placeholder="Ej: 255.255.255.0 ó /24"></td>
                    <td><input type="text" data-field="firstUsable" data-index="${index}" placeholder="Ej: 192.168.1.1"></td>
                    <td><input type="text" data-field="lastUsable" data-index="${index}" placeholder="Ej: 192.168.1.254"></td>
                    <td><input type="text" data-field="broadcastAddress" data-index="${index}" placeholder="Ej: 192.168.1.255"></td>
                </tr>
            `;
        });
        tableHTML += `</tbody></table>`;
        userAnswerTableContainer.innerHTML = tableHTML;
    }

    /**
     * Obtiene las respuestas introducidas por el usuario desde la tabla de entrada.
     * @returns {object[]} Un array de objetos, cada uno representando la respuesta del usuario para una subred.
     */
    function getUserAnswers() {
        // Implementación de getUserAnswers (sin cambios)
        const userAnswers = [];
        const rows = userAnswerTableContainer.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input[data-field]');
            const answer = { index: index };
            inputs.forEach(input => {
                answer[input.dataset.field] = input.value.trim();
            });
            userAnswers.push(answer);
        });
        return userAnswers;
    }

    /**
     * Compara las respuestas del usuario con la solución correcta.
     * @param {object[]} userAnswers - Array de respuestas del usuario.
     * @param {object[]} correctSolution - Array con la solución correcta.
     * @returns {{correct: boolean, feedback: string, errors: object[]}} - Resultado de la comparación.
     */
    function compareAnswers(userAnswers, correctSolution) {
        // Implementación de compareAnswers (sin cambios)
        let isFullyCorrect = true;
        let feedback = '';
        const errors = [];
        if (!correctSolution || userAnswers.length !== correctSolution.length) {
            return { correct: false, feedback: 'Error: El número de respuestas no coincide con la solución.', errors: [] };
        }
        for (let i = 0; i < correctSolution.length; i++) {
            const user = userAnswers[i];
            const correct = correctSolution[i];
            let rowErrors = {};
            if (user.networkAddress !== correct.networkAddress) {
                isFullyCorrect = false;
                rowErrors.networkAddress = `Esperado: ${correct.networkAddress}`;
            }
            let userPrefix = null;
            if (user.maskOrPrefix.startsWith('/')) {
                userPrefix = parseInt(user.maskOrPrefix.substring(1), 10);
            } else if (isValidMask(user.maskOrPrefix)) {
                userPrefix = getPrefixLength(user.maskOrPrefix);
            }
            if (userPrefix === null || userPrefix !== correct.prefix) {
                isFullyCorrect = false;
                rowErrors.maskOrPrefix = `Esperado: /${correct.prefix} (${correct.mask})`;
            }
            const expectedFirst = correct.firstUsable || 'N/A';
            if(user.firstUsable !== expectedFirst) {
               isFullyCorrect = false;
               rowErrors.firstUsable = `Esperado: ${expectedFirst}`;
            }
            const expectedLast = correct.lastUsable || 'N/A';
             if(user.lastUsable !== expectedLast) {
               isFullyCorrect = false;
               rowErrors.lastUsable = `Esperado: ${expectedLast}`;
             }
            if (user.broadcastAddress !== correct.broadcastAddress) {
                isFullyCorrect = false;
                rowErrors.broadcastAddress = `Esperado: ${correct.broadcastAddress}`;
            }
            if (Object.keys(rowErrors).length > 0) {
                 errors.push({ index: i, fields: rowErrors, name: correct.name || `Subred ${i+1}` });
            }
        }
        if (isFullyCorrect) {
            feedback = '¡Todas las respuestas son correctas! ¡Excelente trabajo!';
        } else {
             feedback = `Se encontraron errores. Revisa los campos marcados o haz clic en "Mostrar Solución". Errores encontrados en ${errors.length} subred(es).`;
        }
        return { correct: isFullyCorrect, feedback: feedback, errors: errors };
    }

    /**
     * Muestra el feedback (correcto/incorrecto) al usuario y el botón para mostrar la solución.
     * @param {object} comparisonResult - El resultado de compareAnswers.
     */
    function displayFeedback(comparisonResult) {
        exerciseFeedbackParagraph.textContent = comparisonResult.feedback;
        exerciseFeedbackDiv.classList.remove('correct', 'incorrect');
        if (comparisonResult.correct) {
            exerciseFeedbackDiv.classList.add('correct');
        } else {
            exerciseFeedbackDiv.classList.add('incorrect');
            highlightErrors(comparisonResult.errors); // Resaltar errores si los hay
        }
        exerciseFeedbackDiv.style.display = 'block'; // Mostrar el div de feedback

        // --- Control de Mostrar Solución ---
        if (showSolutionBtn) {
            showSolutionBtn.style.display = 'inline-block'; // Mostrar el botón "Mostrar Solución"
        }
        exerciseSolutionDiv.style.display = 'none'; // Asegurarse de que la solución esté OCULTA inicialmente
        solutionStepsContentDiv.style.display = 'none'; // Ocultar pasos también
        if(explanationControlsDiv) explanationControlsDiv.style.display = 'none'; // Ocultar controles de pasos
    }

    /** Resalta los campos con errores en la tabla de entrada del usuario */
    function highlightErrors(errors) {
        // Implementación de highlightErrors (sin cambios)
        userAnswerTableContainer.querySelectorAll('input').forEach(input => input.style.borderColor = '#ccc');
        errors.forEach(errorDetail => {
            const rowIndex = errorDetail.index;
            const row = userAnswerTableContainer.querySelectorAll('tbody tr')[rowIndex];
            if (row) {
                 for (const fieldName in errorDetail.fields) {
                     const input = row.querySelector(`input[data-field="${fieldName}"]`);
                      if (input) {
                        input.style.borderColor = 'red';
                     }
                 }
            }
        });
    }

    /**
     * Muestra la tabla con la solución correcta del ejercicio y los controles de explicación.
     * @param {object[]} correctSolution - La solución correcta.
     */
    function displaySolution(correctSolution) {
        if (!correctSolution) {
            solutionTableContainer.innerHTML = '<p>No hay solución disponible para mostrar.</p>';
            return;
        }
        const resultObject = { success: true, data: correctSolution }; // Simular objeto resultado
        const isClassfulResult = correctSolution.length > 0 && correctSolution[0].requestedHosts === undefined;
        let tableHTML = '';
        if (!resultObject.data || resultObject.data.length === 0) {
           tableHTML = '<p>No se generaron subredes en la solución.</p>';
        } else {
            const data = resultObject.data;
            tableHTML = `
                <h4>Tabla de Solución Correcta:</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Dir. Red</th>
                            ${isClassfulResult ? '' : '<th>Máscara</th>'}
                            ${isClassfulResult ? '' : '<th>Prefijo</th>'}
                            <th>Rango Usable</th>
                            <th>Broadcast</th>
                            ${isClassfulResult ? '' : '<th>Hosts Totales</th>'}
                            ${isClassfulResult ? '' : '<th>Hosts Usables</th>'}
                            ${!isClassfulResult ? '<th>Hosts Pedidos</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
            `;
            data.forEach(subnet => {
                tableHTML += `
                    <tr>
                        <td>${subnet.name || '-'}</td>
                        <td>${subnet.networkAddress}</td>
                        ${isClassfulResult ? '' : `<td>${subnet.mask}</td>`}
                        ${isClassfulResult ? '' : `<td>/${subnet.prefix}</td>`}
                        <td>${subnet.firstUsable ? `${subnet.firstUsable} - ${subnet.lastUsable}` : 'N/A'}</td>
                        <td>${subnet.broadcastAddress}</td>
                        ${isClassfulResult ? '' : `<td style="text-align: right;">${subnet.totalHosts.toLocaleString()}</td>`}
                        ${isClassfulResult ? '' : `<td style="text-align: right;">${subnet.usableHosts.toLocaleString()}</td>`}
                        ${!isClassfulResult ? `<td style="text-align: right;">${subnet.requestedHosts.toLocaleString()}</td>` : ''}
                    </tr>
                `;
            });
            tableHTML += `</tbody></table>`;
        }
        solutionTableContainer.innerHTML = tableHTML;
        // Hacer visible el contenedor principal de la solución y los controles de pasos
        exerciseSolutionDiv.style.display = 'block';
        if(explanationControlsDiv) explanationControlsDiv.style.display = 'flex'; // Mostrar controles (selector y botón pasos)
    }

    /**
     * Genera el HTML con los pasos de la explicación para un ejercicio de subneteo.
     * @param {object} problemData - Los datos originales del problema (red, requisitos).
     * @param {object[]} solution - La solución calculada (array de subredes).
     * @param {'magic'|'wildcard'} method - El método de explicación seleccionado.
     * @returns {string} - Una cadena HTML con la explicación.
     */
    function generateExplanationSteps(problemData, solution, method) {
        // Implementación de generateExplanationSteps (sin cambios respecto a la versión anterior)
        let html = `<h4>Explicación (${method === 'magic' ? 'Magic Number' : 'Wildcard Conceptual'})</h4>`;
        if (!problemData || !solution || solution.length === 0) {
            return html + "<p>No hay datos suficientes para generar la explicación.</p>";
        }
        const isClassful = problemData.requirement !== undefined;

        if (method === 'magic') {
            if (isClassful) {
                const initialNetwork = problemData.network;
                const requirement = problemData.requirement;
                const firstSubnet = solution[0];
                const newPrefix = firstSubnet.prefix;
                const newMask = firstSubnet.mask;
                const defaultMask = getDefaultMask(initialNetwork);
                const defaultPrefix = getPrefixLength(defaultMask);
                const subnetBitsBorrowed = newPrefix - defaultPrefix;
                html += `<p><strong>1. Red Inicial y Requisito:</strong></p>
                         <ul>
                            <li>Red Base: <code>${initialNetwork}</code> (Clase ${getIpClass(initialNetwork)})</li>
                            <li>Máscara por Defecto: <code>${defaultMask}</code> (/${defaultPrefix})</li>
                            <li>Requisito: ${requirement.value} ${requirement.type === 'subnets' ? 'subredes' : 'hosts utilizables'}</li>
                         </ul>`;
                html += `<p><strong>2. Calcular Nueva Máscara/Prefijo:</strong></p>
                         <ul>`;
                if (requirement.type === 'subnets') {
                    const neededBits = bitsForSubnets(requirement.value);
                    html += `<li>Para ${requirement.value} subredes, se necesitan ${neededBits} bits de subred (2<sup>${neededBits}</sup> = ${Math.pow(2, neededBits)} >= ${requirement.value}).</li>`;
                    html += `<li>Nuevo Prefijo = Prefijo Default + Bits Necesarios = ${defaultPrefix} + ${neededBits} = <strong>${newPrefix}</strong>.</li>`;
                } else {
                    const neededBits = bitsForHosts(requirement.value);
                    html += `<li>Para ${requirement.value} hosts utilizables, se necesitan ${neededBits} bits de host (2<sup>${neededBits}</sup> = ${Math.pow(2, neededBits)} >= ${requirement.value} + 2).</li>`;
                    html += `<li>Nuevo Prefijo = 32 - Bits de Host Necesarios = 32 - ${neededBits} = <strong>${newPrefix}</strong>.</li>`;
                }
                html += `<li>Nueva Máscara: <code>${newMask}</code> (/${newPrefix})</li></ul>`;
                 html += `<p><strong>3. Calcular el "Magic Number" (Salto o Tamaño de Bloque):</strong></p><ul>`;
                 const blockSize = getTotalHosts(newPrefix);
                 html += `<li>El tamaño de cada bloque de subred es 2<sup>(32 - ${newPrefix})</sup> = 2<sup>${32-newPrefix}</sup> = <strong>${blockSize.toLocaleString()}</strong> direcciones.</li>`;
                 const maskOctets = newMask.split('.').map(Number);
                 let interestingOctetIndex = -1;
                 for(let i = 3; i >= 0; i--) { if (maskOctets[i] < 255) { interestingOctetIndex = i; break; } }
                 if (interestingOctetIndex !== -1) {
                     const magicNumber = 256 - maskOctets[interestingOctetIndex];
                     html += `<li>El "Magic Number" en el ${interestingOctetIndex + 1}º octeto es 256 - ${maskOctets[interestingOctetIndex]} = <strong>${magicNumber}</strong>.</li>`;
                 } else { html += `<li>La máscara es /32.</li>`; }
                 html += `</ul>`;
                 html += `<p><strong>4. Listar las Subredes:</strong></p>
                          <p>Comenzando desde <code>${getNetworkAddress(initialNetwork, defaultMask)}</code> y sumando el tamaño del bloque o usando el Magic Number:</p><ul>`;
                 solution.forEach((subnet, index) => { html += `<li>Subred ${index + 1}: <code>${subnet.networkAddress}/${subnet.prefix}</code></li>`; });
                 html += `</ul>`;
            } else { // VLSM
                const initialCIDR = problemData.network;
                const requirements = problemData.requirements;
                html += `<p><strong>1. Bloque Inicial:</strong> <code>${initialCIDR}</code></p>`;
                html += `<p><strong>2. Asignación de Subredes (ordenadas de mayor a menor requisito):</strong></p><ol>`;
                let currentAvailable = initialCIDR.split('/')[0];
                solution.forEach((subnet, index) => {
                    const req = requirements[index];
                    const neededHostBits = bitsForHosts(req.hosts);
                    const prefix = 32 - neededHostBits;
                    const blockSize = getTotalHosts(prefix);
                    html += `<li><strong>Requisito: ${req.name} (${req.hosts} hosts)</strong>
                                <ul>
                                    <li>Hosts pedidos: ${req.hosts}. Se necesitan ${neededHostBits} bits de host.</li>
                                    <li>Prefijo necesario: /${prefix}. Máscara: <code>${getMaskStringFromPrefix(prefix)}</code>.</li>
                                    <li>Tamaño del bloque necesario: ${blockSize.toLocaleString()} direcciones.</li>
                                    <li>Buscando bloque /${prefix} disponible desde <code>${currentAvailable}</code>...</li>
                                    <li>**Asignado:** <code>${subnet.networkAddress}/${subnet.prefix}</code></li>
                                    <li>Broadcast: <code>${subnet.broadcastAddress}</code></li>
                                    <li>Rango Usable: ${subnet.firstUsable ? `<code>${subnet.firstUsable}</code> - <code>${subnet.lastUsable}</code>` : 'N/A'}</li>
                                </ul></li>`;
                    currentAvailable = getNextAvailableNetwork(subnet.networkAddress, subnet.prefix) || '(Espacio Agotado)';
                });
                html += `</ol>`;
            }
        } else if (method === 'wildcard') {
            // ... (Implementación de explicación Wildcard - sin cambios) ...
             html += `<p>La máscara wildcard es la inversa de la máscara de subred y ayuda a identificar qué bits pertenecen a la red y cuáles al host dentro de un rango.</p>`;
            if (isClassful) {
                 const firstSubnet = solution[0]; const newMask = firstSubnet.mask; const newPrefix = firstSubnet.prefix;
                 const wildcardInt = (~ipToInt(newMask)) >>> 0; const wildcardMask = intToIp(wildcardInt);
                 html += `<p>Para la nueva máscara <code>${newMask}</code> (/${newPrefix}), la wildcard es <code>${wildcardMask}</code>.</p>`;
                 html += `<p><strong>Cálculo de Red/Broadcast (Ejemplo con Subred 1: ${solution[0].networkAddress}):</strong></p><ul>`;
                 html += `<li>Broadcast = Red | Wildcard = <code>${solution[0].networkAddress} | ${wildcardMask}</code> = <code>${solution[0].broadcastAddress}</code>.</li></ul>`;
                 html += `<p>Las IPs usables son las direcciones entre Red + 1 y Broadcast - 1.</p>`;
            } else { // VLSM
                 html += `<p>En VLSM, cada subred tiene su propia máscara y wildcard.</p><ol>`;
                 solution.forEach((subnet) => {
                     const wildcardInt = (~ipToInt(subnet.mask)) >>> 0; const wildcardMask = intToIp(wildcardInt);
                     html += `<li><strong>${subnet.name} (<code>${subnet.networkAddress}/${subnet.prefix}</code>)</strong><ul>`;
                     html += `<li>Máscara: <code>${subnet.mask}</code> | Wildcard: <code>${wildcardMask}</code></li>`;
                     html += `<li>Broadcast = <code>${subnet.networkAddress} | ${wildcardMask}</code> = <code>${subnet.broadcastAddress}</code></li>`;
                     html += `<li>Rango Usable: ${subnet.firstUsable ? `<code>${subnet.firstUsable}</code> - <code>${subnet.lastUsable}</code>` : 'N/A'}</li></ul></li>`;
                 });
                 html += `</ol>`;
            }
            html += "<p><em>Nota: Esta es una explicación conceptual.</em></p>";
        } else {
            html += "<p>Método de explicación no reconocido.</p>";
        }
        return html;
    }


    // --- ASIGNACIÓN DE EVENT LISTENERS ---

    // Cambio de Modo (Calculadora / Ejercicios)
    btnCalculatorMode.addEventListener('click', () => switchMode('calculator'));
    btnExerciseMode.addEventListener('click', () => switchMode('exercise'));

    // Cambio de Tipo de Calculadora (Classful / VLSM)
    calcTypeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            switchCalculatorForm(event.target.value);
        });
    });

     // Input de IP Classful para mostrar info y validar
     classfulNetworkIpInput.addEventListener('input', () => {
         clearError(classfulNetworkIpInput);
         const ip = classfulNetworkIpInput.value.trim();
         let info = '';
         if (isValidIp(ip)) {
            const ipClass = getIpClass(ip);
            const defaultMask = getDefaultMask(ip);
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

    // Submit Formulario Classful
    classfulForm.addEventListener('submit', (event) => {
        event.preventDefault();
        clearCalculatorResults();
        clearError(calcTableContainer);
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

    // Añadir/Quitar Requisitos VLSM
    addVlsmRequirementBtn.addEventListener('click', addVlsmRequirementRow);
    vlsmRequirementsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-req')) {
            removeVlsmRequirementRow(event.target);
        }
    });

    // Submit Formulario VLSM
    vlsmForm.addEventListener('submit', (event) => {
        event.preventDefault();
        clearCalculatorResults();
        clearError(calcTableContainer);
        const networkIpWithPrefix = vlsmNetworkIpInput.value.trim();
        const initialNetworkInfo = parseIpAndPrefix(networkIpWithPrefix);
        if (!initialNetworkInfo) { displayError(calcTableContainer, 'La red/prefijo inicial de VLSM no es válida (formato: x.x.x.x/yy).'); return; }
        const requirements = [];
        const requirementRows = vlsmRequirementsContainer.querySelectorAll('.vlsm-requirement');
        let reqError = false;
        requirementRows.forEach((row, index) => {
            const hostsInput = row.querySelector('input[type="number"]');
            const nameInput = row.querySelector('input[type="text"]');
            const hosts = parseInt(hostsInput.value, 10);
            const name = nameInput.value.trim() || null;
            if (isNaN(hosts) || hosts < 0) {
                 displayError(calcTableContainer, `Error en requisito #${index + 1}: Hosts debe ser número >= 0.`);
                 reqError = true;
            }
             if (!reqError) requirements.push({ hosts, name });
        });
        if (reqError) return;
        if (requirements.length === 0) { displayError(calcTableContainer, 'Debes añadir al menos un requisito de hosts.'); return; }
        requirements.sort((a, b) => b.hosts - a.hosts); // Ordenar antes de pasar
        const result = calculateVLSM(networkIpWithPrefix, requirements);
        displayCalculatorResults(result);
    });

    // --- Event Listeners Ejercicios ---

    // Generar Ejercicio
    generateExerciseBtn.addEventListener('click', () => {
        const type = exerciseTypeSelect.value;
        let exerciseData = null;
        if (type === 'classful') exerciseData = generateClassfulProblem();
        else exerciseData = generateVLSMProblem();

        if (exerciseData) displayExercise(exerciseData);
        else exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Error: No se pudo generar un ejercicio válido. Inténtalo de nuevo.</p>';
    });

    // Verificar Respuesta del Ejercicio
    checkAnswerBtn.addEventListener('click', () => {
        if (!currentExerciseData || !currentExerciseData.solution) {
            alert("Primero genera un ejercicio.");
            return;
        }
        const userAnswers = getUserAnswers();
        const comparisonResult = compareAnswers(userAnswers, currentExerciseData.solution);
        displayFeedback(comparisonResult); // Muestra feedback y botón "Mostrar Solución"
    });

    // Botón "Mostrar Solución" (para mostrar la tabla de respuestas)
    if (showSolutionBtn) {
        showSolutionBtn.addEventListener('click', () => {
            if (currentExerciseData && currentExerciseData.solution) {
                displaySolution(currentExerciseData.solution); // Muestra tabla y controles de pasos
                showSolutionBtn.style.display = 'none'; // Ocultar este botón una vez pulsado
            }
        });
    } else {
        console.error("Elemento #showSolutionBtn no encontrado en el HTML.");
    }


    // Botón "Mostrar Pasos" (para mostrar la explicación)
    showSolutionStepsBtn.addEventListener('click', () => {
        if (!currentExerciseData || !currentExerciseData.problemData || !currentExerciseData.solution) {
            solutionStepsContentDiv.innerHTML = '<p>No hay datos del problema o solución disponibles para generar los pasos.</p>';
            solutionStepsContentDiv.style.display = 'block';
            return;
        }
        const method = exerciseExplanationMethodSelect.value;
        const explanationHTML = generateExplanationSteps(currentExerciseData.problemData, currentExerciseData.solution, method);
        solutionStepsContentDiv.innerHTML = explanationHTML;
        solutionStepsContentDiv.style.display = 'block';
    });

    // --- INICIALIZACIÓN ---
    updateFooterYear();
    switchMode('calculator'); // Iniciar en modo calculadora
    switchCalculatorForm('vlsm'); // Mostrar formulario VLSM por defecto dentro de calculadora

}); // Fin de DOMContentLoaded
