/**
 * uiController.js - Controlador de la interfaz de usuario para la Herramienta de Subneteo.
 * Maneja eventos, interactúa con la lógica (subnetLogic, exerciseGenerator) y actualiza el DOM.
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
    // const calcExplanationDiv = document.getElementById('calcExplanation'); // Para futuras explicaciones

    // --- Ejercicios ---
    const exerciseTypeSelect = document.getElementById('exerciseType');
    // const difficultySelect = document.getElementById('difficulty'); // Si se implementa dificultad
    const generateExerciseBtn = document.getElementById('generateExercise');
    const exercisePromptDiv = document.getElementById('exercisePrompt');
    const exerciseSolutionInputDiv = document.getElementById('exerciseSolutionInput');
    const userAnswerTableContainer = document.getElementById('userAnswerTableContainer');
    // const exerciseExplanationMethodSelect = document.getElementById('exerciseExplanationMethod'); // Para futuras explicaciones
    const checkAnswerBtn = document.getElementById('checkAnswer');
    const exerciseFeedbackDiv = document.getElementById('exerciseFeedback');
    const exerciseFeedbackParagraph = exerciseFeedbackDiv.querySelector('p');
    const exerciseSolutionDiv = document.getElementById('exerciseSolution');
    // const solutionExplanationDiv = document.getElementById('solutionExplanation'); // Para futuras explicaciones
    const solutionTableContainer = document.getElementById('solutionTableContainer');
    const showSolutionStepsBtn = document.getElementById('showSolutionSteps'); // Para futuras explicaciones
    // const solutionStepsContentDiv = document.getElementById('solutionStepsContent'); // Para futuras explicaciones

    // --- Footer ---
    const yearSpan = document.getElementById('year');

    // --- ESTADO INTERNO ---
    let currentExerciseSolution = null; // Almacenará la solución del ejercicio actual

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
         // Ocultar explicaciones si estuvieran visibles
        // calcExplanationDiv.style.display = 'none';
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
        currentExerciseSolution = null; // Olvidar la solución anterior
        // Limpiar/ocultar explicaciones si existieran
        // solutionExplanationDiv.innerHTML = '';
        // solutionStepsContentDiv.innerHTML = '';
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
         // No eliminar la última fila si solo queda una
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
        let errorElement;
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;

        if (!targetElement) return; // No se encontró dónde mostrar el error

        // Buscar si ya existe un elemento de error asociado
        let errorContainerId = `error-for-${targetElement.id || targetElement.classList[0] || 'element'}`;
         errorElement = document.getElementById(errorContainerId);

        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorContainerId;
            errorElement.classList.add('error-message'); // Añadir clase para estilizar
            errorElement.style.color = 'red';
            errorElement.style.fontSize = '0.9em';
            errorElement.style.marginTop = '5px';
             // Insertar después del elemento o dentro si es un contenedor
            if (targetElement.parentNode && targetElement.nextSibling) {
                 targetElement.parentNode.insertBefore(errorElement, targetElement.nextSibling);
            } else if (targetElement.parentNode){
                targetElement.parentNode.appendChild(errorElement);
            } else {
                 targetElement.appendChild(errorElement); // Último recurso
            }
        }
        errorElement.textContent = message;
        errorElement.style.display = 'block'; // Asegurarse de que es visible
    }

    /** Limpia mensajes de error previos asociados a un elemento */
    function clearError(target) {
         const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
         if (!targetElement) return;
         let errorContainerId = `error-for-${targetElement.id || targetElement.classList[0] || 'element'}`;
         const errorElement = document.getElementById(errorContainerId);
          if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none'; // Ocultar
        }
    }


    /**
     * Genera y muestra la tabla de resultados de la calculadora.
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

        // Añadir nota si es Classful y se muestran subredes especiales
        if (isClassfulResult && data.length > 1) {
             calcSummaryDiv.innerHTML += `<br><small style='color: #6c757d;'><i>Las filas resaltadas representan 'Subnet Zero' y 'All-Ones Subnet', históricamente no utilizadas.</i></small>`;
        }
        
        calcSummaryDiv.textContent = `Cálculo completado. Se generaron ${data.length} subred(es).`;

        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Dir. Red</th>
                        <th>Máscara</th>
                        <th>Prefijo</th>
                        <th>Rango Usable</th>
                        <th>Broadcast</th>
                        <th>Hosts Totales</th>
                        <th>Hosts Usables</th>
                        ${!isClassfulResult ? '<th>Hosts Pedidos</th>' : ''} {/* Mostrar solo si NO es Classful */}
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach((subnet, index) => {
            let rowClass = ''; // Inicializar clase vacía
            let nameSuffix = ''; // Inicializar sufijo de nombre vacío

            // Aplicar clase y sufijo SOLO si es resultado Classful, hay > 1 subred, y es la primera o última
            if (isClassfulResult && data.length > 1) {
                 if (index === 0) { // Primera fila (Subnet Zero)
                    rowClass = ' class="subnet-zero-or-all-ones"';
                    nameSuffix = ' <span class="subnet-label">(Subnet Zero)</span>';
                 } else if (index === data.length - 1) { // Última fila (All-Ones)
                     rowClass = ' class="subnet-zero-or-all-ones"';
                     nameSuffix = ' <span class="subnet-label">(All-Ones)</span>';
                 }
            }

            // Generar la fila HTML
            tableHTML += `
                <tr${rowClass}> {/* Añadir la clase al TR si aplica */}
                    <td>${subnet.name || '-'}${nameSuffix}</td> {/* Añadir sufijo al nombre si aplica */}
                    <td>${subnet.networkAddress}</td>
                    <td>${subnet.mask}</td>
                    <td>/${subnet.prefix}</td>
                    <td>${subnet.firstUsable ? `${subnet.firstUsable} - ${subnet.lastUsable}` : 'N/A'}</td>
                    <td>${subnet.broadcastAddress}</td>
                    <td style="text-align: right;">${subnet.totalHosts.toLocaleString()}</td>
                    <td style="text-align: right;">${subnet.usableHosts.toLocaleString()}</td>
                     ${!isClassfulResult ? `<td style="text-align: right;">${subnet.requestedHosts.toLocaleString()}</td>` : ''} {}
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        calcTableContainer.innerHTML = tableHTML;
    }

     /**
     * Muestra el problema generado y prepara el área de respuesta del usuario.
     * @param {object} exerciseData - El objeto devuelto por los generadores de ejercicios.
     */
    function displayExercise(exerciseData) {
        clearExerciseArea(); // Limpiar área antes de mostrar nuevo ejercicio

        if (!exerciseData || !exerciseData.problemStatement || !exerciseData.solution) {
            exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Error al generar el ejercicio. Inténtalo de nuevo.</p>';
            return;
        }

        // Guardar la solución correcta para verificación posterior
        currentExerciseSolution = exerciseData.solution;

        // Mostrar el enunciado del problema
        exercisePromptDiv.innerHTML = `<h3>Problema:</h3><p>${exerciseData.problemStatement.replace(/\n/g, '<br>')}</p>`; // Reemplazar saltos de línea para HTML

        // Generar y mostrar la tabla para la respuesta del usuario
        generateUserInputTable(currentExerciseSolution);
        exerciseSolutionInputDiv.style.display = 'block'; // Mostrar el área de respuesta
    }


    /**
     * Genera una tabla HTML con campos de entrada para que el usuario introduzca su solución.
     * @param {object[]} correctSolution - La solución correcta (array de subredes).
     */
    function generateUserInputTable(correctSolution) {
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
            // Usar el nombre de la subred de la solución como referencia
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

        tableHTML += `
                </tbody>
            </table>
        `;
        userAnswerTableContainer.innerHTML = tableHTML;
    }

    /**
     * Obtiene las respuestas introducidas por el usuario desde la tabla de entrada.
     * @returns {object[]} Un array de objetos, cada uno representando la respuesta del usuario para una subred.
     */
    function getUserAnswers() {
        const userAnswers = [];
        const rows = userAnswerTableContainer.querySelectorAll('tbody tr');

        rows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input[data-field]');
            const answer = { index: index }; // Guardar índice original por si acaso
            inputs.forEach(input => {
                answer[input.dataset.field] = input.value.trim(); // Guardar valor quitando espacios extra
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
        let isFullyCorrect = true;
        let feedback = '';
        const errors = []; // Array para detalles de errores por campo

        if (!correctSolution || userAnswers.length !== correctSolution.length) {
            return { correct: false, feedback: 'Error: El número de respuestas no coincide con la solución.', errors: [] };
        }

        for (let i = 0; i < correctSolution.length; i++) {
            const user = userAnswers[i];
            const correct = correctSolution[i];
            let rowErrors = {};

            // Comparar Dirección de Red
            if (user.networkAddress !== correct.networkAddress) {
                isFullyCorrect = false;
                rowErrors.networkAddress = `Esperado: ${correct.networkAddress}`;
            }

            // Comparar Máscara/Prefijo (permitir ambos formatos)
            let userPrefix = null;
            if (user.maskOrPrefix.startsWith('/')) {
                userPrefix = parseInt(user.maskOrPrefix.substring(1), 10);
            } else if (isValidMask(user.maskOrPrefix)) {
                userPrefix = getPrefixLength(user.maskOrPrefix);
            }
            if (userPrefix === null || userPrefix !== correct.prefix) {
                isFullyCorrect = false;
                 // Mostrar ambos formatos esperados para claridad
                rowErrors.maskOrPrefix = `Esperado: /${correct.prefix} (${correct.mask})`;
            }

            // Comparar Primer Host Usable (manejar N/A)
            if (user.firstUsable !== (correct.firstUsable || 'N/A')) {
                 // Considerar null o undefined como N/A
                const expectedFirst = correct.firstUsable || 'N/A';
                 if(user.firstUsable !== expectedFirst) {
                    isFullyCorrect = false;
                    rowErrors.firstUsable = `Esperado: ${expectedFirst}`;
                 }
            }

             // Comparar Último Host Usable (manejar N/A)
            if (user.lastUsable !== (correct.lastUsable || 'N/A')) {
                 const expectedLast = correct.lastUsable || 'N/A';
                  if(user.lastUsable !== expectedLast) {
                    isFullyCorrect = false;
                    rowErrors.lastUsable = `Esperado: ${expectedLast}`;
                  }
            }

            // Comparar Broadcast
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
             feedback = `Se encontraron errores. Revisa los campos marcados (o la solución detallada). Errores encontrados en ${errors.length} subred(es).`;
             // (Opcional: Podríamos añadir lógica para marcar los campos incorrectos en la tabla de usuario)
        }

        return { correct: isFullyCorrect, feedback: feedback, errors: errors };
    }


    /**
     * Muestra el feedback (correcto/incorrecto) al usuario.
     * @param {object} comparisonResult - El resultado de compareAnswers.
     */
    function displayFeedback(comparisonResult) {
        exerciseFeedbackParagraph.textContent = comparisonResult.feedback;
        exerciseFeedbackDiv.classList.remove('correct', 'incorrect'); // Limpiar clases previas
        if (comparisonResult.correct) {
            exerciseFeedbackDiv.classList.add('correct');
        } else {
            exerciseFeedbackDiv.classList.add('incorrect');
            // (Opcional: Marcar campos erróneos)
             highlightErrors(comparisonResult.errors);
        }
        exerciseFeedbackDiv.style.display = 'block'; // Mostrar el div de feedback
        // Mostrar también el botón/área de solución
        exerciseSolutionDiv.style.display = 'block';
        displaySolution(currentExerciseSolution); // Mostrar tabla de solución correcta
    }

    /** (Opcional) Resalta los campos con errores en la tabla de entrada del usuario */
    function highlightErrors(errors) {
        // Primero, quitar resaltados previos
        userAnswerTableContainer.querySelectorAll('input').forEach(input => input.style.borderColor = '#ccc');

        errors.forEach(errorDetail => {
            const rowIndex = errorDetail.index;
            const row = userAnswerTableContainer.querySelectorAll('tbody tr')[rowIndex];
            if (row) {
                 for (const fieldName in errorDetail.fields) {
                     const input = row.querySelector(`input[data-field="${fieldName}"]`);
                      if (input) {
                        input.style.borderColor = 'red';
                        // Podríamos añadir un tooltip con el error específico si quisiéramos
                        // input.title = errorDetail.fields[fieldName];
                     }
                 }
            }
        });
    }

    /**
     * Muestra la tabla con la solución correcta del ejercicio.
     * @param {object[]} correctSolution - La solución correcta.
     */
    function displaySolution(correctSolution) {
        if (!correctSolution) {
            solutionTableContainer.innerHTML = '<p>No hay solución disponible para mostrar.</p>';
            return;
        }

        // Reutilizar la lógica de displayCalculatorResults para generar la tabla
        const resultObject = { success: true, data: correctSolution };
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
                            <th>Máscara</th>
                            <th>Prefijo</th>
                            <th>Rango Usable</th>
                            <th>Broadcast</th>
                            <th>Hosts Totales</th>
                            <th>Hosts Usables</th>
                            ${data[0].requestedHosts !== undefined ? '<th>Hosts Pedidos</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
            `;
            data.forEach(subnet => {
                tableHTML += `
                    <tr>
                        <td>${subnet.name || '-'}</td>
                        <td>${subnet.networkAddress}</td>
                        <td>${subnet.mask}</td>
                        <td>/${subnet.prefix}</td>
                        <td>${subnet.firstUsable ? `${subnet.firstUsable} - ${subnet.lastUsable}` : 'N/A'}</td>
                        <td>${subnet.broadcastAddress}</td>
                        <td style="text-align: right;">${subnet.totalHosts.toLocaleString()}</td>
                        <td style="text-align: right;">${subnet.usableHosts.toLocaleString()}</td>
                         ${subnet.requestedHosts !== undefined ? `<td style="text-align: right;">${subnet.requestedHosts.toLocaleString()}</td>` : ''}
                    </tr>
                `;
            });
            tableHTML += `</tbody></table>`;
        }

        solutionTableContainer.innerHTML = tableHTML;
        // Asegurarse de que el contenedor de la solución esté visible
        exerciseSolutionDiv.style.display = 'block';
        // (Opcional: Mostrar botón de pasos)
        // showSolutionStepsBtn.style.display = 'inline-block';
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

     // Input de IP Classful para mostrar info (si se desea)
     classfulNetworkIpInput.addEventListener('input', () => {
         clearError(classfulNetworkIpInput); // Limpiar error al escribir
         const ip = classfulNetworkIpInput.value.trim();
         let info = '';
         if (isValidIp(ip)) {
            const ipClass = getIpClass(ip);
            const defaultMask = getDefaultMask(ip);
            if(ipClass && defaultMask) {
                 info = `Clase ${ipClass}, Máscara Default: ${defaultMask}`;
            } else if (ipClass) {
                 info = `Clase ${ipClass} (Rango especial/no subnetable A/B/C)`;
            } else {
                 info = 'IP válida, pero clase no determinada.';
            }
         } else if (ip !== '') {
             info = 'Escribiendo IP...';
         }
         classfulIpInfoSpan.textContent = info;
     });
     classfulNetworkIpInput.addEventListener('blur', () => { // Validar al perder foco
         const ip = classfulNetworkIpInput.value.trim();
         if (ip !== '' && !isValidIp(ip)) {
            displayError(classfulNetworkIpInput, 'Formato de IP inválido.');
         } else if (ip !== '') {
             clearError(classfulNetworkIpInput);
         }
     });


    // Submit Formulario Classful
    classfulForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Evitar envío real del formulario
        clearCalculatorResults();
        clearError(calcTableContainer); // Limpiar errores previos del área de resultados

        const networkIp = classfulNetworkIpInput.value.trim();
        const selectedReqRadio = classfulForm.querySelector('input[name="classfulRequirement"]:checked');

        if (!isValidIp(networkIp)) {
            displayError(calcTableContainer, 'La dirección IP de red no es válida.');
            return;
        }
        if (!selectedReqRadio) {
             displayError(calcTableContainer, 'Debes seleccionar un tipo de requisito.');
            return;
        }

        const requirement = { type: selectedReqRadio.value };
        if (requirement.type === 'subnets') {
            requirement.value = parseInt(numSubnetsInput.value, 10);
        } else {
            requirement.value = parseInt(numHostsInput.value, 10);
        }

        if (isNaN(requirement.value) || requirement.value <= 0) {
            displayError(calcTableContainer, 'El valor del requisito debe ser un número positivo.');
            return;
        }

        // Llamar a la lógica de cálculo
        const result = calculateClassful(networkIp, requirement);
        // Mostrar resultados (la función maneja éxito y error)
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

        if (!initialNetworkInfo) {
            displayError(calcTableContainer, 'La red/prefijo inicial de VLSM no es válida (formato: x.x.x.x/yy).');
            return;
        }

        const requirements = [];
        const requirementRows = vlsmRequirementsContainer.querySelectorAll('.vlsm-requirement');
        let reqError = false;
        requirementRows.forEach((row, index) => {
            const hostsInput = row.querySelector('input[type="number"]');
            const nameInput = row.querySelector('input[type="text"]');
            const hosts = parseInt(hostsInput.value, 10);
            const name = nameInput.value.trim() || null; // Usar null si está vacío

            if (isNaN(hosts) || hosts < 0) { // Permitir 0 hosts? bitsForHosts lo maneja
                 displayError(calcTableContainer, `Error en requisito #${index + 1}: El número de hosts debe ser un número entero positivo o cero.`);
                 reqError = true;
            }
             if (!reqError) { // Solo añadir si no hay error previo en esta fila
                requirements.push({ hosts, name });
            }
        });

        if (reqError) return; // Detener si hubo errores en los requisitos

        if (requirements.length === 0) {
            displayError(calcTableContainer, 'Debes añadir al menos un requisito de hosts para VLSM.');
            return;
        }

        // IMPORTANTE: Ordenar requisitos aquí antes de pasar a la lógica
        requirements.sort((a, b) => b.hosts - a.hosts);
        // Mostrar advertencia si el usuario no los ordenó (visual, la lógica usa el ordenado)
        let userOrderCorrect = true;
         requirementRows.forEach((row, index) => {
             const hosts = parseInt(row.querySelector('input[type="number"]').value, 10);
             if (hosts !== requirements[index].hosts) {
                 userOrderCorrect = false;
             }
         });
         if (!userOrderCorrect) {
             // Podríamos mostrar una advertencia no bloqueante
             console.warn("Los requisitos no estaban ordenados de mayor a menor en la interfaz, pero se han ordenado internamente para el cálculo.");
              // displayError(calcTableContainer, "Advertencia: Los requisitos se ordenaron internamente de mayor a menor para el cálculo."); // Opcional
         }


        // Llamar a la lógica VLSM
        const result = calculateVLSM(networkIpWithPrefix, requirements);
        // Mostrar resultados
        displayCalculatorResults(result);
    });

    // --- Event Listeners Ejercicios ---

    // Generar Ejercicio
    generateExerciseBtn.addEventListener('click', () => {
        const type = exerciseTypeSelect.value;
        // const difficulty = difficultySelect.value; // Si se implementa
        let exerciseData = null;

        if (type === 'classful') {
            exerciseData = generateClassfulProblem(/* difficulty */);
        } else { // vlsm
            exerciseData = generateVLSMProblem(/* difficulty */);
        }

        if (exerciseData) {
            displayExercise(exerciseData);
        } else {
            // Mostrar error si la generación falla consistentemente
             exercisePromptDiv.innerHTML = '<h3>Problema:</h3><p>Error: No se pudo generar un ejercicio válido. Por favor, inténtalo de nuevo.</p>';
        }
    });

    // Verificar Respuesta del Ejercicio
    checkAnswerBtn.addEventListener('click', () => {
        if (!currentExerciseSolution) {
            alert("Primero genera un ejercicio.");
            return;
        }

        const userAnswers = getUserAnswers();
        const comparisonResult = compareAnswers(userAnswers, currentExerciseSolution);
        displayFeedback(comparisonResult);
        // La solución se muestra automáticamente en displayFeedback
    });


    // Mostrar Pasos de la Solución (Funcionalidad Futura)
    showSolutionStepsBtn.addEventListener('click', () => {
        // Aquí iría la lógica para generar y mostrar los pasos
        // de acuerdo al método seleccionado en exerciseExplanationMethodSelect
         const solutionStepsContentDiv = document.getElementById('solutionStepsContent'); // Obtener referencia aquí
         if(solutionStepsContentDiv) {
            solutionStepsContentDiv.innerHTML = "<p><i>Funcionalidad de explicación paso a paso pendiente de implementación.</i></p>";
         } else {
             console.error("Elemento #solutionStepsContent no encontrado")
         }
    });

    // --- INICIALIZACIÓN ---
    updateFooterYear();
    switchMode('calculator'); // Iniciar en modo calculadora por defecto
    switchCalculatorForm('vlsm'); // Mostrar formulario vlsm por defecto

}); // Fin de DOMContentLoaded
