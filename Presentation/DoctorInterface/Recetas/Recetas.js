// Recetas.js - Funcionalidad específica para gestión de recetas con MongoDB

const API_RECETAS = '/api/recetas';
const API_DIAGNOSTICOS = '/api/diagnosticos';
const API_PACIENTES = '/api/pacientes';
let prescriptions = [];
let editingPrescriptionId = null;

// Inicializar gestión de recetas
async function initializePrescriptionManager() {
    await loadPatientOptions();
    await loadPrescriptionsList();
    setDefaultDates();
    
    // Configurar el formulario
    document.getElementById('prescriptionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (editingPrescriptionId) {
            updatePrescription();
        } else {
            createPrescriptionWithDiagnosis();
        }
    });
    
    // Configurar búsqueda
    document.getElementById('searchPrescription').addEventListener('input', function() {
        filterPrescriptions(this.value);
    });
    
    // Verificar si hay un paciente seleccionado desde el módulo de pacientes
    checkSelectedPatient();
    
    // Verificar si viene de un diagnóstico específico
    checkDiagnosisSelection();
    
    // Verificar si viene para editar una receta específica
    checkPrescriptionEdit();
}

// Obtener lista de pacientes desde la API
async function getPatients() {
    try {
        const res = await fetch(API_PACIENTES);
        if (!res.ok) {
            throw new Error('Error al cargar pacientes');
        }
        const pacientes = await res.json();
        return pacientes;
    } catch (error) {
        console.error('Error cargando pacientes:', error);
        return [];
    }
}

// Cargar opciones de pacientes en el selector
async function loadPatientOptions() {
    const patientSelect = document.getElementById('patientSelect');
    patientSelect.innerHTML = '<option value="">Seleccionar paciente...</option>';
    
    try {
        const patients = await getPatients();
        
        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient._id;
            option.textContent = `${patient.nombre} ${patient.apellido} (${patient.edad} años)`;
            option.setAttribute('data-patient', JSON.stringify(patient));
            patientSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando opciones de pacientes:', error);
        patientSelect.innerHTML = '<option value="">Error al cargar pacientes</option>';
    }
}

// Verificar si hay un paciente seleccionado desde pacientes
function checkSelectedPatient() {
    const selectedPatientId = localStorage.getItem('selectedPatientForPrescription');
    
    if (selectedPatientId) {
        document.getElementById('patientSelect').value = selectedPatientId;
        showPatientSelectionMessage(selectedPatientId);
        localStorage.removeItem('selectedPatientForPrescription');
    }
}

// Verificar si viene de un diagnóstico específico
function checkDiagnosisSelection() {
    const diagnosisId = localStorage.getItem('prescriptionDiagnosis');
    if (diagnosisId) {
        loadDiagnosisData(diagnosisId);
        localStorage.removeItem('prescriptionDiagnosis');
    }
}

// Verificar si viene para editar una receta específica
function checkPrescriptionEdit() {
    const urlParams = new URLSearchParams(window.location.search);
    const prescriptionId = urlParams.get('prescriptionId');
    if (prescriptionId) {
        editPrescription(prescriptionId);
    }
}

// Mostrar mensaje cuando un paciente es seleccionado automáticamente
async function showPatientSelectionMessage(patientId) {
    try {
        const patients = await getPatients();
        const patient = patients.find(p => p._id === patientId);
        
        if (patient) {
            const form = document.getElementById('prescriptionForm');
            const existingMessage = document.getElementById('patientSelectionMessage');
            
            if (existingMessage) {
                existingMessage.remove();
            }
            
            const messageDiv = document.createElement('div');
            messageDiv.id = 'patientSelectionMessage';
            messageDiv.className = 'alert alert-info alert-dismissible fade show';
            messageDiv.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                <strong>Paciente seleccionado:</strong> ${patient.nombre} ${patient.apellido}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            form.insertBefore(messageDiv, form.firstChild);
            form.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error mostrando mensaje de selección:', error);
    }
}

// Cargar datos del diagnóstico seleccionado
async function loadDiagnosisData(diagnosisId) {
    try {
        const response = await fetch(`${API_DIAGNOSTICOS}/${diagnosisId}`);
        if (response.ok) {
            const diagnosis = await response.json();
            
            // Llenar los campos del diagnóstico
            document.getElementById('diagnosisCode').value = diagnosis.Diagnostico || '';
            document.getElementById('diagnosisDescription').value = diagnosis.descripcion;
            document.getElementById('clinicalFindings').value = diagnosis.sintomas || '';
            document.getElementById('createDiagnosisRecord').checked = false; // Ya existe el diagnóstico
            
            // Mostrar mensaje informativo
            showDiagnosisSelectionMessage(diagnosis);
        }
    } catch (error) {
        console.error('Error cargando diagnóstico:', error);
    }
}

// Mostrar mensaje cuando se selecciona un diagnóstico
function showDiagnosisSelectionMessage(diagnosis) {
    const form = document.getElementById('prescriptionForm');
    const existingMessage = document.getElementById('diagnosisSelectionMessage');
    
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'diagnosisSelectionMessage';
    messageDiv.className = 'alert alert-info alert-dismissible fade show';
    messageDiv.innerHTML = `
        <i class="fas fa-stethoscope me-2"></i>
        <strong>Diagnóstico cargado:</strong> ${diagnosis.descripcion}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    form.insertBefore(messageDiv, form.firstChild);
}

// Establecer fechas por defecto
function setDefaultDates() {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    document.getElementById('prescriptionDate').value = today.toISOString().split('T')[0];
    document.getElementById('prescriptionValidity').value = nextMonth.toISOString().split('T')[0];
}

// Agregar campo de medicamento
function addMedication() {
    const container = document.getElementById('medicationsContainer');
    const newMedication = document.createElement('div');
    newMedication.className = 'medication-item border p-3 mb-3 rounded';
    newMedication.innerHTML = `
        <div class="row">
            <div class="col-md-6 mb-2">
                <input type="text" class="form-control medication-name" placeholder="Nombre del medicamento *" required>
            </div>
            <div class="col-md-3 mb-2">
                <input type="text" class="form-control medication-dose" placeholder="Dosis *" required>
            </div>
            <div class="col-md-3 mb-2">
                <select class="form-select medication-frequency" required>
                    <option value="">Frecuencia...</option>
                    <option value="Cada 8 horas">Cada 8 horas</option>
                    <option value="Cada 12 horas">Cada 12 horas</option>
                    <option value="Una vez al día">Una vez al día</option>
                    <option value="Dos veces al día">Dos veces al día</option>
                    <option value="Tres veces al día">Tres veces al día</option>
                    <option value="Cuando sea necesario">Cuando sea necesario</option>
                    <option value="Cada 24 horas">Cada 24 horas</option>
                    <option value="Cada 48 horas">Cada 48 horas</option>
                    <option value="Una vez por semana">Una vez por semana</option>
                </select>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-2">
                <input type="number" class="form-control medication-duration" placeholder="Duración (días)" min="1">
            </div>
            <div class="col-md-6 mb-2">
                <input type="text" class="form-control medication-instructions" placeholder="Instrucciones especiales">
            </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger remove-medication" onclick="removeMedication(this)">
            <i class="fas fa-times"></i> Eliminar
        </button>
    `;
    container.appendChild(newMedication);
}

// Remover campo de medicamento
function removeMedication(button) {
    const medicationItems = document.querySelectorAll('.medication-item');
    if (medicationItems.length > 1) {
        button.closest('.medication-item').remove();
    } else {
        alert('Debe haber al menos un medicamento en la receta.');
    }
}

// Obtener medicamentos del formulario
function getMedicationsFromForm() {
    const medications = [];
    const medicationItems = document.querySelectorAll('.medication-item');
    
    medicationItems.forEach(item => {
        const name = item.querySelector('.medication-name').value;
        const dose = item.querySelector('.medication-dose').value;
        const frequency = item.querySelector('.medication-frequency').value;
        const duration = item.querySelector('.medication-duration').value;
        const instructions = item.querySelector('.medication-instructions').value;
        
        if (name || dose || frequency) {
            medications.push({
                name,
                dose,
                frequency,
                duration: duration || '',
                specialInstructions: instructions || ''
            });
        }
    });
    
    return medications;
}

// Crear receta con diagnóstico integrado
async function createPrescriptionWithDiagnosis() {
    const patientId = document.getElementById('patientSelect').value;
    const prescriptionDate = document.getElementById('prescriptionDate').value;
    const prescriptionValidity = document.getElementById('prescriptionValidity').value;
    const generalInstructions = document.getElementById('prescriptionInstructions').value;
    const doctorNotes = document.getElementById('doctorNotes').value;
    
    // Datos del diagnóstico
    const diagnosisCode = document.getElementById('diagnosisCode').value;
    const diagnosisDescription = document.getElementById('diagnosisDescription').value;
    const clinicalFindings = document.getElementById('clinicalFindings').value;
    const createDiagnosisRecord = document.getElementById('createDiagnosisRecord').checked;
    
    if (!patientId) {
        alert('Por favor, seleccione un paciente.');
        return;
    }
    
    if (!diagnosisDescription) {
        alert('Por favor, ingrese una descripción del diagnóstico.');
        return;
    }
    
    const medications = getMedicationsFromForm();
    if (medications.length === 0) {
        alert('Por favor, agregue al menos un medicamento.');
        return;
    }
    
    const invalidMedication = medications.find(med => !med.name || !med.dose || !med.frequency);
    if (invalidMedication) {
        alert('Por favor, complete todos los campos obligatorios para cada medicamento.');
        return;
    }
    
    try {
        const patientSelect = document.getElementById('patientSelect');
        const selectedOption = patientSelect.options[patientSelect.selectedIndex];
        const patientData = JSON.parse(selectedOption.getAttribute('data-patient'));
        
        // Crear diagnóstico si está marcada la opción
        let diagnosisId = null;
        if (createDiagnosisRecord) {
            const nuevoDiagnostico = {
                pacienteId: patientId,
                pacienteNombre: patientData.nombre,
                pacienteApellido: patientData.apellido,
                pacienteEdad: patientData.edad,
                pacienteGenero: patientData.genero,
                fechaDiagnostico: prescriptionDate,
                tipo: 'Definitivo',
                Diagnostico: diagnosisCode,
                descripcion: diagnosisDescription,
                sintomas: clinicalFindings,
                planTratamiento: `Tratamiento farmacológico: ${medications.map(med => `${med.name} ${med.dose}`).join(', ')}`,
                doctorNombre: getLoggedDoctorName() || "Dr. (sin nombre)",
                estado: 'activo'
            };
            
            const diagnosisResponse = await fetch(API_DIAGNOSTICOS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(nuevoDiagnostico),
            });
            
            if (diagnosisResponse.ok) {
                const diagnosisCreated = await diagnosisResponse.json();
                diagnosisId = diagnosisCreated._id;
            }
        }
        
        // Crear la receta
        const nuevaReceta = {
            pacienteId: patientId,
            pacienteNombre: patientData.nombre,
            pacienteApellido: patientData.apellido,
            pacienteEdad: patientData.edad,
            pacienteGenero: patientData.genero,
            fechaEmision: prescriptionDate,
            fechaValidez: prescriptionValidity,
            diagnostico: {
                Diagnostico: diagnosisCode,
                descripcion: diagnosisDescription,
                hallazgosClinicos: clinicalFindings
            },
            medicamentos: medications.map(med => ({
                nombre: med.name,
                dosis: med.dose,
                frecuencia: med.frequency,
                duracion: med.duration || '',
                instruccionesEspeciales: med.specialInstructions || ''
            })),
            instruccionesGenerales: generalInstructions,
            notasMedico: doctorNotes,
            doctorNombre: getLoggedDoctorName() || "Dr. (sin nombre)",
            diagnosticoId: diagnosisId, // Referencia al diagnóstico completo si se creó
            estado: 'activa'
        };
        
        const response = await fetch(API_RECETAS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nuevaReceta),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear receta');
        }
        
        const recetaCreada = await response.json();
        
        await loadPrescriptionsList();
        resetForm();
        
        alert('Receta emitida correctamente.' + (diagnosisId ? ' Se creó el registro de diagnóstico.' : ''));
        
    } catch (error) {
        console.error('Error creando receta:', error);
        alert('Error al crear la receta: ' + error.message);
    }
}

// Cargar lista de recetas desde MongoDB
async function loadPrescriptionsList() {
    const container = document.getElementById('prescriptionsList');
    container.innerHTML = '<p class="text-center text-muted">Cargando recetas...</p>';
    
    try {
        const response = await fetch(API_RECETAS);
        if (!response.ok) {
            throw new Error('Error al cargar recetas');
        }
        
        prescriptions = await response.json();
        container.innerHTML = '';
        
        if (prescriptions.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay recetas emitidas.</p>';
            return;
        }
        
        // Ordenar recetas por fecha (más recientes primero)
        prescriptions.sort((a, b) => new Date(b.fechaEmision) - new Date(a.fechaEmision));
        
        prescriptions.forEach(prescription => {
            const patientName = `${prescription.pacienteNombre} ${prescription.pacienteApellido}`;
            
            const today = new Date();
            const validityDate = new Date(prescription.fechaValidez);
            const isExpired = validityDate < today;
            const statusClass = isExpired ? 'expired' : 'active';
            const statusText = isExpired ? 'Expirada' : 'Activa';
            
            const prescriptionElement = document.createElement('div');
            prescriptionElement.className = `list-group-item prescription-card ${statusClass}`;
            prescriptionElement.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${patientName}</h5>
                    <small class="${isExpired ? 'status-expired' : 'status-active'}">${statusText}</small>
                </div>
                <p class="mb-1"><strong>Fecha:</strong> ${formatDate(prescription.fechaEmision)}</p>
                <p class="mb-1"><strong>Válida hasta:</strong> ${formatDate(prescription.fechaValidez)}</p>
                <p class="mb-1"><strong>Diagnóstico:</strong> ${prescription.diagnostico?.descripcion || 'No especificado'}</p>
                <p class="mb-1">
                    <strong>Medicamentos:</strong><br>
                    ${prescription.medicamentos.map(med => 
                        `<span class="medication-badge">${med.nombre} ${med.dosis}</span>`
                    ).join('')}
                </p>
                <div class="prescription-actions">
                    <button class="btn btn-sm btn-hospital" onclick="viewPrescriptionDetails('${prescription._id}')">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editPrescription('${prescription._id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline-hospital" onclick="printPrescription('${prescription._id}')">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletePrescription('${prescription._id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            container.appendChild(prescriptionElement);
        });
    } catch (error) {
        console.error('Error cargando recetas:', error);
        container.innerHTML = '<p class="text-center text-muted">Error al cargar recetas.</p>';
    }
}

// Filtrar recetas
function filterPrescriptions(searchTerm) {
    const container = document.getElementById('prescriptionsList');
    const prescriptionCards = container.getElementsByClassName('prescription-card');
    
    for (let card of prescriptionCards) {
        const patientName = card.querySelector('h5').textContent.toLowerCase();
        const medicationsText = card.textContent.toLowerCase();
        
        if (patientName.includes(searchTerm.toLowerCase()) || medicationsText.includes(searchTerm.toLowerCase())) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    }
}

// Ver detalles de receta
async function viewPrescriptionDetails(prescriptionId) {
    try {
        const response = await fetch(`${API_RECETAS}/${prescriptionId}`);
        if (!response.ok) {
            throw new Error('Error al cargar receta');
        }
        
        const prescription = await response.json();
        const patientName = `${prescription.pacienteNombre} ${prescription.pacienteApellido}`;
        
        const patientData = {
            name: prescription.pacienteNombre,
            lastname: prescription.pacienteApellido,
            age: prescription.pacienteEdad,
            gender: prescription.pacienteGenero
        };
        
        const detailsContent = document.getElementById('prescriptionPreviewContent');
        detailsContent.innerHTML = generatePrescriptionPreview(prescription, patientData, patientName);
        
        document.getElementById('prescriptionPreviewSection').classList.remove('hidden');
        document.getElementById('prescriptionPreviewSection').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error cargando detalles de receta:', error);
        alert('Error al cargar los detalles de la receta.');
    }
}

// Editar receta
async function editPrescription(prescriptionId) {
    try {
        const response = await fetch(`${API_RECETAS}/${prescriptionId}`);
        if (!response.ok) {
            throw new Error('Error al cargar receta');
        }
        
        const prescription = await response.json();
        
        // Llenar el formulario con los datos de la receta
        document.getElementById('patientSelect').value = prescription.pacienteId;
        document.getElementById('prescriptionDate').value = prescription.fechaEmision.split('T')[0];
        document.getElementById('prescriptionValidity').value = prescription.fechaValidez.split('T')[0];
        document.getElementById('diagnosisCode').value = prescription.diagnostico?.codigoCIE10 || '';
        document.getElementById('diagnosisDescription').value = prescription.diagnostico?.descripcion || '';
        document.getElementById('clinicalFindings').value = prescription.diagnostico?.hallazgosClinicos || '';
        document.getElementById('prescriptionInstructions').value = prescription.instruccionesGenerales || '';
        document.getElementById('doctorNotes').value = prescription.notasMedico || '';
        
        // Llenar medicamentos
        resetMedicationsForm();
        const container = document.getElementById('medicationsContainer');
        container.innerHTML = '';
        
        prescription.medicamentos.forEach((med, index) => {
            if (index === 0) {
                // Usar el primer elemento existente
                const firstItem = container.querySelector('.medication-item') || addMedication();
                firstItem.querySelector('.medication-name').value = med.nombre;
                firstItem.querySelector('.medication-dose').value = med.dosis;
                firstItem.querySelector('.medication-frequency').value = med.frecuencia;
                firstItem.querySelector('.medication-duration').value = med.duracion || '';
                firstItem.querySelector('.medication-instructions').value = med.instruccionesEspeciales || '';
            } else {
                addMedication();
                const items = container.querySelectorAll('.medication-item');
                const lastItem = items[items.length - 1];
                lastItem.querySelector('.medication-name').value = med.nombre;
                lastItem.querySelector('.medication-dose').value = med.dosis;
                lastItem.querySelector('.medication-frequency').value = med.frecuencia;
                lastItem.querySelector('.medication-duration').value = med.duracion || '';
                lastItem.querySelector('.medication-instructions').value = med.instruccionesEspeciales || '';
            }
        });
        
        // Cambiar a modo edición
        editingPrescriptionId = prescriptionId;
        
        // Cambiar texto del botón
        const submitBtn = document.querySelector('#prescriptionForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Actualizar Receta';
        submitBtn.classList.remove('btn-hospital');
        submitBtn.classList.add('btn-warning');
        
        // Desplazarse al formulario
        document.getElementById('prescriptionForm').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar receta para editar');
    }
}

// Actualizar receta
async function updatePrescription() {
    const patientId = document.getElementById('patientSelect').value;
    const prescriptionDate = document.getElementById('prescriptionDate').value;
    const prescriptionValidity = document.getElementById('prescriptionValidity').value;
    const generalInstructions = document.getElementById('prescriptionInstructions').value;
    const doctorNotes = document.getElementById('doctorNotes').value;
    
    // Datos del diagnóstico
    const diagnosisCode = document.getElementById('diagnosisCode').value;
    const diagnosisDescription = document.getElementById('diagnosisDescription').value;
    const clinicalFindings = document.getElementById('clinicalFindings').value;
    
    if (!patientId) {
        alert('Por favor, seleccione un paciente.');
        return;
    }
    
    if (!diagnosisDescription) {
        alert('Por favor, ingrese una descripción del diagnóstico.');
        return;
    }
    
    const medications = getMedicationsFromForm();
    if (medications.length === 0) {
        alert('Por favor, agregue al menos un medicamento.');
        return;
    }
    
    const invalidMedication = medications.find(med => !med.name || !med.dose || !med.frequency);
    if (invalidMedication) {
        alert('Por favor, complete todos los campos obligatorios para cada medicamento.');
        return;
    }
    
    try {
        const updatedReceta = {
            pacienteId: patientId,
            fechaEmision: prescriptionDate,
            fechaValidez: prescriptionValidity,
            diagnostico: {
                Diagnostico: diagnosisCode,
                descripcion: diagnosisDescription,
                hallazgosClinicos: clinicalFindings
            },
            medicamentos: medications.map(med => ({
                nombre: med.name,
                dosis: med.dose,
                frecuencia: med.frequency,
                duracion: med.duration || '',
                instruccionesEspeciales: med.specialInstructions || ''
            })),
            instruccionesGenerales: generalInstructions,
            notasMedico: doctorNotes
        };
        
        const response = await fetch(`${API_RECETAS}/${editingPrescriptionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedReceta),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar receta');
        }
        
        alert('Receta actualizada correctamente.');
        resetForm();
        await loadPrescriptionsList();
        
    } catch (error) {
        console.error('Error actualizando receta:', error);
        alert('Error al actualizar la receta: ' + error.message);
    }
}

// Vista previa de receta
async function previewPrescription() {
    const patientId = document.getElementById('patientSelect').value;
    const prescriptionDate = document.getElementById('prescriptionDate').value;
    const prescriptionValidity = document.getElementById('prescriptionValidity').value;
    const generalInstructions = document.getElementById('prescriptionInstructions').value;
    const doctorNotes = document.getElementById('doctorNotes').value;
    
    // Datos del diagnóstico
    const diagnosisCode = document.getElementById('diagnosisCode').value;
    const diagnosisDescription = document.getElementById('diagnosisDescription').value;
    const clinicalFindings = document.getElementById('clinicalFindings').value;
    
    if (!patientId) {
        alert('Por favor, seleccione un paciente para generar la vista previa.');
        return;
    }
    
    if (!diagnosisDescription) {
        alert('Por favor, ingrese una descripción del diagnóstico para generar la vista previa.');
        return;
    }
    
    const medications = getMedicationsFromForm();
    if (medications.length === 0) {
        alert('Por favor, agregue al menos un medicamento para generar la vista previa.');
        return;
    }
    
    try {
        const patientSelect = document.getElementById('patientSelect');
        const selectedOption = patientSelect.options[patientSelect.selectedIndex];
        const patient = JSON.parse(selectedOption.getAttribute('data-patient'));
        const patientName = `${patient.nombre} ${patient.apellido}`;
        
        const previewPrescription = {
            fechaEmision: prescriptionDate,
            fechaValidez: prescriptionValidity,
            diagnostico: {
                Diagnostico: diagnosisCode,
                descripcion: diagnosisDescription,
                hallazgosClinicos: clinicalFindings
            },
            medicamentos: medications.map(med => ({
                nombre: med.name,
                dosis: med.dose,
                frecuencia: med.frequency,
                duracion: med.duration || '',
                instruccionesEspeciales: med.specialInstructions || ''
            })),
            instruccionesGenerales: generalInstructions,
            notasMedico: doctorNotes,
            pacienteNombre: patient.nombre,
            pacienteApellido: patient.apellido,
            pacienteEdad: patient.edad,
            pacienteGenero: patient.genero
        };
        
        const detailsContent = document.getElementById('prescriptionPreviewContent');
        detailsContent.innerHTML = generatePrescriptionPreview(previewPrescription, patient, patientName, true);
        
        document.getElementById('prescriptionPreviewSection').classList.remove('hidden');
        document.getElementById('prescriptionPreviewSection').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error generando vista previa:', error);
        alert('Error al generar la vista previa. Por favor, intente nuevamente.');
    }
}

// Generar HTML para vista previa de receta
function generatePrescriptionPreview(prescription, patient, patientName, isPreview = false) {
    return `
        <div class="prescription-preview">
            <div class="prescription-header">
                <h2>HOSPITAL LA PAZ</h2>
                <h4>Servicio de Medicina General</h4>
                <p>Calle Principal 123, Ciudad - Tel: 123-456-7890</p>
                <hr>
                <h3>RECETA MÉDICA</h3>
            </div>
            
            <div class="prescription-details">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Paciente:</strong> ${patientName}</p>
                        <p><strong>Edad:</strong> ${patient.age || patient.edad} años</p>
                        <p><strong>Género:</strong> ${patient.gender || patient.genero}</p>
                    </div>
                    <div class="col-md-6 text-end">
                        <p><strong>Fecha:</strong> ${formatDate(prescription.fechaEmision)}</p>
                        <p><strong>Válida hasta:</strong> ${formatDate(prescription.fechaValidez)}</p>
                    </div>
                </div>
            </div>
            
            <!-- Sección de Diagnóstico -->
            <div class="diagnosis-section">
                <h5>DIAGNÓSTICO:</h5>
                <p><strong>Diagnostico:</strong> ${prescription.diagnostico?.codigoCIE10 || 'No especificado'}</p>
                <p><strong>Descripción:</strong> ${prescription.diagnostico?.descripcion || 'No especificado'}</p>
                ${prescription.diagnostico?.hallazgosClinicos ? `
                    <p><strong>Hallazgos Clínicos:</strong> ${prescription.diagnostico.hallazgosClinicos}</p>
                ` : ''}
            </div>
            
            <div class="prescription-medications">
                <h5>MEDICAMENTOS RECETADOS:</h5>
                ${prescription.medicamentos.map(med => `
                    <div class="medication-row">
                        <div class="medication-name"><strong>${med.nombre} ${med.dosis}</strong></div>
                        <div class="medication-details">
                            ${med.frecuencia}
                            ${med.duracion ? ` por ${med.duracion} días` : ''}
                            ${med.instruccionesEspeciales ? `<br><small><strong>Instrucciones:</strong> ${med.instruccionesEspeciales}</small>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${prescription.instruccionesGenerales ? `
                <div class="prescription-instructions">
                    <h5>INSTRUCCIONES GENERALES:</h5>
                    <p>${prescription.instruccionesGenerales}</p>
                </div>
            ` : ''}
            
            ${prescription.notasMedico ? `
                <div class="doctor-notes">
                    <h5>NOTAS MÉDICAS:</h5>
                    <p>${prescription.notasMedico}</p>
                </div>
            ` : ''}
            
            <div class="prescription-footer">
                <div class="doctor-signature">
                    <p>_________________________</p>
                    <p><strong>${getLoggedDoctorName() || 'Dr. (sin nombre)'}</strong></p>
                    <p>Médico General</p>
                    <p>Lic. MG-12345</p>
                </div>
            </div>
            
            ${isPreview ? `
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>VISTA PREVIA</strong> - Esta es una vista previa. La receta no ha sido guardada.
                </div>
            ` : ''}
        </div>
        
        ${!isPreview ? `
            <div class="text-center mt-3">
                <button class="btn btn-hospital" onclick="printPrescription('${prescription._id}')">
                    <i class="fas fa-print me-1"></i> Imprimir Receta
                </button>
                ${prescription.diagnosticoId ? `
                    <button class="btn btn-outline-hospital" onclick="viewDiagnosis('${prescription.diagnosticoId}')">
                        <i class="fas fa-stethoscope me-1"></i> Ver Diagnóstico Completo
                    </button>
                ` : ''}
            </div>
        ` : ''}
    `;
}

// Cerrar vista previa
function closePrescriptionPreview() {
    document.getElementById('prescriptionPreviewSection').classList.add('hidden');
}

// Imprimir receta
async function printPrescription(prescriptionId) {
    try {
        const response = await fetch(`${API_RECETAS}/${prescriptionId}`);
        if (!response.ok) {
            throw new Error('Error al cargar receta');
        }
        
        const prescription = await response.json();
        const patientName = `${prescription.pacienteNombre} ${prescription.pacienteApellido}`;
        
        const patientData = {
            name: prescription.pacienteNombre,
            lastname: prescription.pacienteApellido,
            age: prescription.pacienteEdad,
            gender: prescription.pacienteGenero
        };
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receta Médica - ${patientName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .prescription-preview { background: white; border: 2px solid #333; padding: 30px; }
                    .prescription-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                    .prescription-header h2 { color: #2c7db1; margin: 0; }
                    .prescription-header h4 { color: #666; margin: 5px 0; }
                    .medication-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #ccc; }
                    .doctor-signature { margin-top: 50px; border-top: 1px solid #333; padding-top: 10px; display: inline-block; min-width: 200px; }
                    .diagnosis-section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #2c7db1; }
                    @media print { 
                        body { margin: 0; } 
                        .prescription-preview { border: none; padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${generatePrescriptionPreview(prescription, patientData, patientName)}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
    } catch (error) {
        console.error('Error imprimiendo receta:', error);
        alert('Error al imprimir la receta.');
    }
}

// Eliminar receta de MongoDB
async function deletePrescription(prescriptionId, confirm = true) {
    if (confirm && !window.confirm('¿Está seguro de que desea eliminar esta receta?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_RECETAS}/${prescriptionId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar receta');
        }
        
        await loadPrescriptionsList();
        closePrescriptionPreview();
        
        alert('Receta eliminada correctamente.');
    } catch (error) {
        console.error('Error eliminando receta:', error);
        alert('Error al eliminar la receta.');
    }
}

// Función para ver diagnóstico completo
function viewDiagnosis(diagnosisId) {
    window.open(`../Diagnostico/Diagnostico.html?diagnosisId=${diagnosisId}`, '_blank');
}

// Reiniciar formulario de medicamentos
function resetMedicationsForm() {
    const container = document.getElementById('medicationsContainer');
    container.innerHTML = `
        <div class="medication-item border p-3 mb-3 rounded">
            <div class="row">
                <div class="col-md-6 mb-2">
                    <input type="text" class="form-control medication-name" placeholder="Nombre del medicamento *" required>
                </div>
                <div class="col-md-3 mb-2">
                    <input type="text" class="form-control medication-dose" placeholder="Dosis *" required>
                </div>
                <div class="col-md-3 mb-2">
                    <select class="form-select medication-frequency" required>
                        <option value="">Frecuencia...</option>
                        <option value="Cada 8 horas">Cada 8 horas</option>
                        <option value="Cada 12 horas">Cada 12 horas</option>
                        <option value="Una vez al día">Una vez al día</option>
                        <option value="Dos veces al día">Dos veces al día</option>
                        <option value="Tres veces al día">Tres veces al día</option>
                        <option value="Cuando sea necesario">Cuando sea necesario</option>
                    </select>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-2">
                    <input type="number" class="form-control medication-duration" placeholder="Duración (días)" min="1">
                </div>
                <div class="col-md-6 mb-2">
                    <input type="text" class="form-control medication-instructions" placeholder="Instrucciones especiales">
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-medication" onclick="removeMedication(this)">
                <i class="fas fa-times"></i> Eliminar
            </button>
        </div>
    `;
}

// Resetear formulario completo
function resetForm() {
    document.getElementById('prescriptionForm').reset();
    resetMedicationsForm();
    setDefaultDates();
    editingPrescriptionId = null;
    
    // Restaurar botón original
    const submitBtn = document.querySelector('#prescriptionForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-prescription me-1"></i> Emitir Receta con Diagnóstico';
    submitBtn.classList.remove('btn-warning');
    submitBtn.classList.add('btn-hospital');
    
    // Limpiar mensajes
    const patientMessage = document.getElementById('patientSelectionMessage');
    if (patientMessage) {
        patientMessage.remove();
    }
    const diagnosisMessage = document.getElementById('diagnosisSelectionMessage');
    if (diagnosisMessage) {
        diagnosisMessage.remove();
    }
}

// Funciones de utilidad
function formatDate(dateString) {
    if (!dateString) return 'Fecha no especificada';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

function getLoggedDoctorName() {
    try {
        const keys = ['currentDoctor', 'currentUser', 'doctor', 'user'];
        let raw = '';
        for (const k of keys) {
            const v = localStorage.getItem(k) || sessionStorage.getItem(k);
            if (v) { raw = v; break; }
        }
        if (!raw) return '';
        let o = raw;
        try { o = JSON.parse(raw); } catch (_) { }
        const nombre = (o.nombre || o.name || '').toString().trim();
        const apellido = (o.apellido || '').toString().trim();
        const full = [nombre, apellido].filter(Boolean).join(' ');
        return full ? (/^dr\.?/i.test(full) ? full : 'Dr. ' + full) : 'Dr. (sin nombre)';
    } catch (e) {
        return 'Dr. (sin nombre)';
    }
}

// Función de cierre de sesión
function logout() {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        localStorage.removeItem('currentPatient');
        window.location.href = '../DoctorInterface.html';
    }
}

// Inicializar la gestión de recetas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializePrescriptionManager();
    
    // Cargar nombre del doctor
    const doctorName = getLoggedDoctorName();
    if (doctorName) {
        document.querySelectorAll('.doctor-name').forEach(el => {
            el.textContent = doctorName;
        });
    }
});