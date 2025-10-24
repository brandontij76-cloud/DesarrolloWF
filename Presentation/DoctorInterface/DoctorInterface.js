// DoctorInterface.js - Funcionalidad específica para médicos con MongoDB

// URLs de las APIs
const API_CITAS = '/api/citas';
const API_PACIENTES = '/api/pacientes';
const API_RECETAS = '/api/recetas';

// Variables globales
let doctorPatients = [];
let doctorAppointments = [];
let doctorPrescriptions = [];

// Inicializar interfaz de médico
async function initializeDoctorInterface() {
    try {
        await loadDoctorDashboardStats();
        await loadTodayAppointments();
        await loadDoctorPatients();
        await loadDoctorAppointments();
        await loadDoctorPrescriptions();
        
        console.log('Interfaz de médico inicializada correctamente');
    } catch (error) {
        console.error('Error inicializando interfaz:', error);
        showErrorNotification('Error al cargar los datos. Por favor, recargue la página.');
    }
}

// Cargar estadísticas del dashboard
async function loadDoctorDashboardStats() {
    try {
        console.log('Cargando estadísticas del dashboard...');
        
        // Cargar total de pacientes
        const patientsResponse = await fetch(API_PACIENTES);
        if (patientsResponse.ok) {
            const pacientes = await patientsResponse.json();
            document.getElementById('total-patients').textContent = pacientes.length || 0;
        } else {
            console.warn('Error cargando pacientes para estadísticas');
        }
        
        // Cargar citas de hoy - usando enfoque alternativo si el endpoint especial falla
        let citasHoy = [];
        try {
            const todayResponse = await fetch(`${API_CITAS}/hoy`);
            if (todayResponse.ok) {
                citasHoy = await todayResponse.json();
            } else {
                // Si falla el endpoint específico, intentar con el general y filtrar
                console.warn('Endpoint /hoy no disponible, usando filtrado local');
                const allAppointmentsResponse = await fetch(API_CITAS);
                if (allAppointmentsResponse.ok) {
                    const allAppointments = await allAppointmentsResponse.json();
                    const today = new Date().toISOString().split('T')[0];
                    citasHoy = allAppointments.filter(appointment => 
                        appointment.fechaCita && appointment.fechaCita.split('T')[0] === today
                    );
                }
            }
        } catch (error) {
            console.warn('Error cargando citas de hoy:', error);
        }
        
        document.getElementById('total-appointments').textContent = citasHoy.length;
        
        // Calcular tareas pendientes (citas de hoy no completadas)
        const pendientes = citasHoy.filter(cita => 
            cita.estado === 'programada' || cita.estado === 'en_progreso'
        ).length;
        document.getElementById('pending-tasks').textContent = pendientes;
        
        // Cargar total de recetas
        try {
            const prescriptionsResponse = await fetch(API_RECETAS);
            if (prescriptionsResponse.ok) {
                const recetas = await prescriptionsResponse.json();
                document.getElementById('total-prescriptions').textContent = recetas.length || 0;
            }
        } catch (error) {
            console.warn('Error cargando recetas:', error);
            document.getElementById('total-prescriptions').textContent = '0';
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Establecer valores por defecto en caso de error
        document.getElementById('total-patients').textContent = '0';
        document.getElementById('total-appointments').textContent = '0';
        document.getElementById('total-prescriptions').textContent = '0';
        document.getElementById('pending-tasks').textContent = '0';
    }
}

// Cargar citas para hoy desde MongoDB
async function loadTodayAppointments() {
    const container = document.getElementById('today-appointments-list');
    const loading = document.getElementById('today-appointments-loading');
    const empty = document.getElementById('today-appointments-empty');
    
    try {
        // Mostrar estado de carga
        loading.style.display = 'block';
        container.style.display = 'none';
        empty.style.display = 'none';
        
        let todayAppointments = [];
        
        // Intentar múltiples enfoques para obtener las citas de hoy
        try {
            // Enfoque 1: Endpoint específico para hoy
            const response = await fetch(`${API_CITAS}/hoy`);
            if (response.ok) {
                todayAppointments = await response.json();
                console.log('Citas de hoy cargadas via endpoint /hoy:', todayAppointments.length);
            } else {
                throw new Error(`Endpoint /hoy no disponible: ${response.status}`);
            }
        } catch (endpointError) {
            console.warn('Error con endpoint /hoy, intentando enfoque alternativo:', endpointError);
            
            // Enfoque 2: Obtener todas las citas y filtrar localmente
            try {
                const allAppointmentsResponse = await fetch(API_CITAS);
                if (allAppointmentsResponse.ok) {
                    const allAppointments = await allAppointmentsResponse.json();
                    const today = new Date().toISOString().split('T')[0];
                    
                    todayAppointments = allAppointments.filter(appointment => {
                        if (!appointment.fechaCita) return false;
                        
                        // Manejar diferentes formatos de fecha
                        const appointmentDate = new Date(appointment.fechaCita);
                        const todayDate = new Date();
                        
                        return (
                            appointmentDate.getDate() === todayDate.getDate() &&
                            appointmentDate.getMonth() === todayDate.getMonth() &&
                            appointmentDate.getFullYear() === todayDate.getFullYear()
                        );
                    });
                    
                    console.log('Citas de hoy filtradas localmente:', todayAppointments.length);
                } else {
                    throw new Error('No se pudieron cargar las citas');
                }
            } catch (filterError) {
                console.error('Error en enfoque alternativo:', filterError);
                throw new Error('No se pudieron cargar las citas de hoy');
            }
        }
        
        // Ocultar estado de carga
        loading.style.display = 'none';
        
        if (todayAppointments.length === 0) {
            empty.style.display = 'block';
            return;
        }
        
        // Mostrar contenedor de citas
        container.style.display = 'block';
        container.innerHTML = '';
        
        // Ordenar citas por hora
        todayAppointments.sort((a, b) => {
            return (a.horaCita || '').localeCompare(b.horaCita || '');
        });
        
        // Mostrar cada cita
        todayAppointments.forEach(appointment => {
            const appointmentElement = createAppointmentElement(appointment);
            container.appendChild(appointmentElement);
        });
        
    } catch (error) {
        console.error('Error cargando citas de hoy:', error);
        loading.style.display = 'none';
        
        // Mostrar mensaje de error específico
        container.innerHTML = `
            <div class="alert alert-warning text-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>No se pudieron cargar las citas de hoy</strong>
                <p class="mb-0 mt-2">${error.message}</p>
                <button class="btn btn-sm btn-hospital mt-2" onclick="loadTodayAppointments()">
                    <i class="fas fa-redo me-1"></i> Reintentar
                </button>
            </div>
        `;
        container.style.display = 'block';
    }
}

// Función auxiliar para crear elementos de cita
function createAppointmentElement(appointment) {
    const appointmentElement = document.createElement('div');
    const patientName = `${appointment.pacienteNombre || ''} ${appointment.pacienteApellido || ''}`.trim() || 'Paciente no especificado';
    const appointmentTime = appointment.horaCita || 'Hora no especificada';
    const appointmentReason = appointment.motivo || 'Consulta médica';
    const doctorName = appointment.doctorNombre || 'Dr. Juan Pérez';
    const status = appointment.estado || 'programada';
    
    appointmentElement.className = `list-group-item list-group-item-action ${getAppointmentStatusClass(status)}`;
    appointmentElement.innerHTML = `
        <div class="d-flex w-100 justify-content-between align-items-start">
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${patientName}</h6>
                    <span class="badge ${getStatusBadgeClass(status)}">${status}</span>
                </div>
                <div class="mb-2">
                    <i class="fas fa-clock me-1 text-muted"></i>
                    <strong>${formatTime(appointmentTime)}</strong>
                </div>
                <p class="mb-1">${appointmentReason}</p>
                <small class="text-muted">
                    <i class="fas fa-user-md me-1"></i>${doctorName}
                </small>
            </div>
            <div class="btn-group-vertical ms-3">
                <button class="btn btn-sm btn-outline-hospital" onclick="startAppointment('${appointment._id}')" ${status !== 'programada' ? 'disabled' : ''}>
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="rescheduleAppointment('${appointment._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelTodayAppointment('${appointment._id}')" ${status === 'cancelada' ? 'disabled' : ''}>
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    return appointmentElement;
}

// Función para refrescar las citas de hoy
async function refreshTodayAppointments() {
    console.log('Actualizando citas de hoy...');
    await loadTodayAppointments();
    await loadDoctorDashboardStats();
}

// Cargar pacientes del médico desde MongoDB
async function loadDoctorPatients() {
    const container = document.getElementById('doctor-patients-list');
    if (!container) return;
    
    try {
        const response = await fetch(API_PACIENTES);
        if (!response.ok) {
            throw new Error('Error al cargar pacientes');
        }
        
        doctorPatients = await response.json();
        container.innerHTML = '';
        
        if (doctorPatients.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No tiene pacientes asignados.</p>';
            return;
        }
        
        // Mostrar solo los primeros 6 pacientes en la vista rápida
        const patientsToShow = doctorPatients.slice(0, 6);
        
        patientsToShow.forEach(patient => {
            const patientElement = document.createElement('div');
            patientElement.className = 'col-md-4 mb-4';
            patientElement.innerHTML = `
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${patient.nombre} ${patient.apellido}</h5>
                        <p class="card-text">Edad: ${patient.edad} años</p>
                        <p class="card-text">Género: ${patient.genero || 'No especificado'}</p>
                        <p class="card-text">
                            <small class="text-muted">Tel: ${patient.telefono || 'No disponible'}</small>
                        </p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-hospital" onclick="viewPatientDetails('${patient._id}')">
                            Ver detalles
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(patientElement);
        });
        
        // Si hay más pacientes, mostrar un mensaje
        if (doctorPatients.length > 6) {
            const morePatientsElement = document.createElement('div');
            morePatientsElement.className = 'col-12 text-center mt-3';
            morePatientsElement.innerHTML = `
                <p class="text-muted">Y ${doctorPatients.length - 6} pacientes más...</p>
                <a href="Pacientes/Pacientes.html" class="btn btn-outline-hospital">Ver todos los pacientes</a>
            `;
            container.appendChild(morePatientsElement);
        }
        
    } catch (error) {
        console.error('Error cargando pacientes:', error);
        container.innerHTML = '<p class="text-center text-muted">Error al cargar pacientes.</p>';
    }
}

// Cargar citas del médico desde MongoDB
async function loadDoctorAppointments() {
    const container = document.getElementById('doctor-appointments-list');
    if (!container) return;
    
    try {
        const response = await fetch(API_CITAS);
        if (!response.ok) {
            throw new Error('Error al cargar citas');
        }
        
        doctorAppointments = await response.json();
        container.innerHTML = '';
        
        if (doctorAppointments.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No tiene citas programadas.</p>';
            return;
        }
        
        // Ordenar citas por fecha (más recientes primero)
        doctorAppointments.sort((a, b) => new Date(b.fechaCita) - new Date(a.fechaCita));
        
        // Mostrar solo las próximas 5 citas
        const upcomingAppointments = doctorAppointments
            .filter(appointment => new Date(appointment.fechaCita) >= new Date())
            .slice(0, 5);
        
        if (upcomingAppointments.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No tiene citas futuras programadas.</p>';
            return;
        }
        
        upcomingAppointments.forEach(appointment => {
            const appointmentDate = new Date(appointment.fechaCita);
            const isToday = isSameDay(appointmentDate, new Date());
            
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'list-group-item';
            appointmentElement.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${appointment.pacienteNombre} ${appointment.pacienteApellido}</h5>
                    <small class="${isToday ? 'text-danger' : 'text-muted'}">
                        ${formatAppointmentDate(appointment.fechaCita)} a las ${appointment.horaCita}
                    </small>
                </div>
                <p class="mb-1">Motivo: ${appointment.motivo || 'Consulta médica'}</p>
                <p class="mb-1">
                    Estado: <span class="badge ${getStatusBadgeClass(appointment.estado)}">${appointment.estado}</span>
                </p>
                <div class="btn-group mt-2">
                    <button class="btn btn-sm btn-hospital" onclick="editAppointment('${appointment._id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline-hospital" onclick="cancelAppointment('${appointment._id}')" ${appointment.estado === 'cancelada' ? 'disabled' : ''}>
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            `;
            container.appendChild(appointmentElement);
        });
        
    } catch (error) {
        console.error('Error cargando citas:', error);
        container.innerHTML = '<p class="text-center text-muted">Error al cargar citas.</p>';
    }
}

// Cargar recetas del médico desde MongoDB
async function loadDoctorPrescriptions() {
    const container = document.getElementById('doctor-prescriptions-list');
    if (!container) return;
    
    try {
        const response = await fetch(API_RECETAS);
        if (!response.ok) {
            throw new Error('Error al cargar recetas');
        }
        
        doctorPrescriptions = await response.json();
        container.innerHTML = '';
        
        if (doctorPrescriptions.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No ha emitido recetas.</p>';
            return;
        }
        
        // Mostrar solo las últimas 5 recetas
        const recentPrescriptions = doctorPrescriptions.slice(0, 5);
        
        recentPrescriptions.forEach(prescription => {
            const prescriptionElement = document.createElement('div');
            prescriptionElement.className = 'list-group-item';
            prescriptionElement.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${prescription.pacienteNombre} ${prescription.pacienteApellido}</h5>
                    <small>${formatDate(prescription.fechaEmision)}</small>
                </div>
                <p class="mb-1"><strong>Medicamento:</strong> ${prescription.medicamento}</p>
                <p class="mb-1"><strong>Dosis:</strong> ${prescription.dosis}</p>
                <p class="mb-1"><strong>Instrucciones:</strong> ${prescription.instrucciones}</p>
                <div class="btn-group mt-2">
                    <button class="btn btn-sm btn-hospital" onclick="renewPrescription('${prescription._id}')">
                        <i class="fas fa-sync"></i> Renovar
                    </button>
                    <button class="btn btn-sm btn-outline-hospital" onclick="viewPrescription('${prescription._id}')">
                        <i class="fas fa-eye"></i> Ver
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

// Funciones para manejar citas de hoy
async function startAppointment(appointmentId) {
    try {
        const response = await fetch(`${API_CITAS}/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ estado: 'en_progreso' }),
        });
        
        if (!response.ok) {
            throw new Error('Error al iniciar cita');
        }
        
        alert('Cita iniciada. Redirigiendo a consulta...');
        // En una implementación real, aquí redirigirías a la pantalla de consulta
        // window.location.href = `Consulta.html?cita=${appointmentId}`;
        
        // Actualizar la lista de citas
        await refreshTodayAppointments();
        
    } catch (error) {
        console.error('Error iniciando cita:', error);
        alert('Error al iniciar la cita: ' + error.message);
    }
}

async function rescheduleAppointment(appointmentId) {
    const nuevaFecha = prompt('Ingrese la nueva fecha (YYYY-MM-DD):');
    const nuevaHora = prompt('Ingrese la nueva hora (HH:MM):');
    
    if (nuevaFecha && nuevaHora) {
        try {
            const response = await fetch(`${API_CITAS}/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    fechaCita: nuevaFecha,
                    horaCita: nuevaHora,
                    estado: 'reprogramada'
                }),
            });
            
            if (!response.ok) {
                throw new Error('Error al reprogramar cita');
            }
            
            alert('Cita reprogramada correctamente.');
            await refreshTodayAppointments();
            
        } catch (error) {
            console.error('Error reprogramando cita:', error);
            alert('Error al reprogramar la cita: ' + error.message);
        }
    }
}

async function cancelTodayAppointment(appointmentId) {
    if (confirm('¿Está seguro de que desea cancelar esta cita?')) {
        try {
            const response = await fetch(`${API_CITAS}/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ estado: 'cancelada' }),
            });
            
            if (!response.ok) {
                throw new Error('Error al cancelar cita');
            }
            
            alert('Cita cancelada correctamente.');
            await refreshTodayAppointments();
            
        } catch (error) {
            console.error('Error cancelando cita:', error);
            alert('Error al cancelar la cita: ' + error.message);
        }
    }
}

// Función para mostrar sección específica en el panel médico
function showDoctorSection(sectionId) {
    // Ocultar todas las secciones
    const sections = document.querySelectorAll('.doctor-content-section');
    sections.forEach(section => section.classList.add('hidden'));
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionId).classList.remove('hidden');
}

// Funciones de utilidad
function getStatusBadgeClass(status) {
    switch (status) {
        case 'programada':
            return 'bg-primary';
        case 'en_progreso':
            return 'bg-warning';
        case 'completada':
            return 'bg-success';
        case 'cancelada':
            return 'bg-danger';
        case 'reprogramada':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

function getAppointmentStatusClass(status) {
    switch (status) {
        case 'programada':
            return '';
        case 'en_progreso':
            return 'list-group-item-warning';
        case 'completada':
            return 'list-group-item-success';
        case 'cancelada':
            return 'list-group-item-danger';
        case 'reprogramada':
            return 'list-group-item-info';
        default:
            return '';
    }
}

function formatAppointmentDate(dateString) {
    if (!dateString) return 'Fecha no especificada';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (isSameDay(date, today)) {
        return 'Hoy';
    } else if (isSameDay(date, tomorrow)) {
        return 'Mañana';
    } else {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    }
}

function formatTime(timeString) {
    if (!timeString) return '--:--';
    // Asumiendo que timeString está en formato "HH:MM"
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
}

function formatDate(dateString) {
    if (!dateString) return 'Fecha no especificada';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

// Función para mostrar notificaciones de error
function showErrorNotification(message) {
    // Crear notificación toast de Bootstrap
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toastElement = document.createElement('div');
    toastElement.className = 'toast align-items-center text-white bg-danger border-0';
    toastElement.setAttribute('role', 'alert');
    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastElement);
    
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Eliminar el toast después de que se oculte
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

// Funciones de acción para el médico
function viewPatientDetails(patientId) {
    alert(`Ver detalles del paciente con ID: ${patientId}`);
    // En una implementación real, esto cargaría una vista detallada del paciente
}

function editAppointment(appointmentId) {
    alert(`Editar cita con ID: ${appointmentId}`);
    // En una implementación real, esto abriría un formulario para editar la cita
}

function cancelAppointment(appointmentId) {
    if (confirm('¿Está seguro de que desea cancelar esta cita?')) {
        alert(`Cita con ID: ${appointmentId} cancelada`);
        // En una implementación real, esto eliminaría la cita y actualizaría la UI
    }
}

function renewPrescription(prescriptionId) {
    alert(`Renovar receta con ID: ${prescriptionId}`);
    // En una implementación real, esto crearía una nueva receta basada en la anterior
}

function viewPrescription(prescriptionId) {
    alert(`Ver receta con ID: ${prescriptionId}`);
    // En una implementación real, esto mostraría los detalles completos de la receta
}

// Función de cierre de sesión
function logout() {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        localStorage.removeItem('currentPatient');
        window.location.href = '/index.html';
    }
}
// Inicializar la interfaz cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeDoctorInterface();
});

// ---- Mejora: mostrar nombre del doctor ----

document.addEventListener('DOMContentLoaded', function() {
  try {
    const span = document.getElementById('user-display-name');
    const stored = localStorage.getItem('currentDoctor') || localStorage.getItem('currentUser') || '';
    const name = stored ? JSON.parse(stored).nombre || stored.nombre || stored : '';
    if (span && name) {
      span.textContent = 'Dr. ' + name;
      span.style.display = 'inline';
      // si hay algún elemento específico en el navbar, también actualizar
      const target = document.querySelector('#doctorName, .doctor-name, .user-name');
      if (target) target.textContent = 'Dr. ' + name;
    }
  } catch (e) { console.warn('No se pudo resolver nombre de doctor', e); }
});


// === Renderizar nombre del doctor en el navbar (robusto) ===
function loadDoctorName(){
  try {
    const keys = ['currentDoctor','currentUser','doctor','user'];
    let raw = '';
    for (const k of keys){
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v){ raw = v; break; }
    }
    let name = '';
    if (raw){
      try{
        const o = JSON.parse(raw);
        name = [o.nombre, o.apellido].filter(Boolean).join(' ') || o.name || '';
      }catch(_){
        name = raw;
      }
    }
    if (!name) return;
    const finalName = /^dr\.?/i.test(name) ? name : 'Dr. ' + name;
    const sels = ['#doctorNameDisplay','#doctorName','.doctor-name','.user-name','.navbar .user-name'];
    sels.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.textContent = finalName;
    });
  } catch (e) { console.warn('Nombre de doctor no resuelto', e); }
}
document.addEventListener('DOMContentLoaded', loadDoctorName);
