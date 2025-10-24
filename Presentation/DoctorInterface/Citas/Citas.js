// Citas.js - Funcionalidad específica para gestión de citas con MongoDB

const API_CITAS = '/api/citas';
let medicalAppointments = [];

// Inicializar gestión de citas
async function initializeAppointmentManager() {
    await loadPatientOptions();
    await loadScheduledAppointments();
    
    // Configurar el formulario
    document.getElementById('appointmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        scheduleAppointment();
    });
    
    // Establecer la fecha mínima como hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').setAttribute('min', today);
    
    // Verificar si hay un paciente seleccionado desde el módulo de pacientes
    checkSelectedPatient();
}

// Obtener lista de pacientes desde la API
async function getPatients() {
    try {
        const res = await fetch("/api/pacientes");
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
    const selectedPatientId = localStorage.getItem('selectedPatientForAppointment');
    
    if (selectedPatientId) {
        document.getElementById('patientSelect').value = selectedPatientId;
        showPatientSelectionMessage(selectedPatientId);
        localStorage.removeItem('selectedPatientForAppointment');
    }
}

// Mostrar mensaje cuando un paciente es seleccionado automáticamente
async function showPatientSelectionMessage(patientId) {
    try {
        const patients = await getPatients();
        const patient = patients.find(p => p._id === patientId);
        
        if (patient) {
            const form = document.getElementById('appointmentForm');
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

// Cargar citas programadas desde MongoDB
async function loadScheduledAppointments() {
    const container = document.getElementById('scheduledAppointments');
    container.innerHTML = '<p class="text-center text-muted">Cargando citas...</p>';
    
    try {
        const response = await fetch(API_CITAS);
        if (!response.ok) {
            throw new Error('Error al cargar citas');
        }
        
        medicalAppointments = await response.json();
        container.innerHTML = '';
        
        if (medicalAppointments.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay citas programadas.</p>';
            return;
        }
        
        // Ordenar citas por fecha y hora
        medicalAppointments.sort((a, b) => {
            const dateA = new Date(Date.parse(a.fechaCita));
            const dateB = new Date(Date.parse(b.fechaCita));
            return dateA - dateB;
        });
        
        medicalAppointments.forEach(appointment => {
            const patientName = `${appointment.pacienteNombre} ${appointment.pacienteApellido}`;
            const appointmentDate = new Date(appointment.fechaCita);
            const today = new Date();
            const isPast = appointmentDate < today;
            const statusClass = isPast ? 'past' : 'upcoming';
            
            const appointmentElement = document.createElement('div');
            appointmentElement.className = `list-group-item appointment-card ${statusClass}`;
            appointmentElement.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${patientName}</h5>
                    <small class="${isPast ? 'text-muted' : 'text-success'}">${formatAppointmentDate(appointment.fechaCita)}</small>
                </div>
                <p class="mb-1"><strong>Hora:</strong> ${appointment.horaCita}</p>
                <p class="mb-1"><strong>Estado:</strong> 
                    <span class="badge ${getStatusBadgeClass(appointment.estado)}">${appointment.estado}</span>
                </p>
                <p class="mb-1">${appointment.motivo || 'Sin motivo especificado'}</p>
                <div class="appointment-actions">
                    <button class="btn btn-sm btn-hospital" onclick="editExistingAppointment('${appointment._id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="changeAppointmentStatus('${appointment._id}')">
                        <i class="fas fa-sync"></i> Cambiar Estado
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelScheduledAppointment('${appointment._id}')">
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

// Programar una nueva cita en MongoDB
async function scheduleAppointment() {
    const patientId = document.getElementById('patientSelect').value;
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const reason = document.getElementById('appointmentReason').value;
    
    if (!patientId || !date || !time) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }
    
    try {
        // Obtener información del paciente seleccionado
        const patientSelect = document.getElementById('patientSelect');
        const selectedOption = patientSelect.options[patientSelect.selectedIndex];
        const patientData = JSON.parse(selectedOption.getAttribute('data-patient'));
        
        const nuevaCita = {
            pacienteId: patientId,
            pacienteNombre: patientData.nombre,
            pacienteApellido: patientData.apellido,
            pacienteEdad: patientData.edad,
            pacienteGenero: patientData.genero,
            pacienteEmail: patientData.email,
            fechaCita: date,
            horaCita: time,
            motivo: reason,
            estado: 'programada',
            doctorNombre: getLoggedDoctorName() || "Dr. (sin nombre)"
        };
        
        const response = await fetch(API_CITAS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nuevaCita),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear cita');
        }
        
        await loadScheduledAppointments();
        
        // Reiniciar formulario
        document.getElementById('appointmentForm').reset();
        
        // Remover mensaje de selección si existe
        const messageDiv = document.getElementById('patientSelectionMessage');
        if (messageDiv) {
            messageDiv.remove();
        }
        
        alert('Cita agendada correctamente.');
        
    } catch (error) {
        console.error('Error creando cita:', error);
        alert('Error al crear la cita: ' + error.message);
    }
}

// Editar cita existente
async function editExistingAppointment(appointmentId) {
    try {
        const response = await fetch(`${API_CITAS}/${appointmentId}`);
        if (!response.ok) {
            throw new Error('Error al cargar cita');
        }
        
        const appointment = await response.json();
        
        // Llenar el formulario con los datos de la cita
        document.getElementById('patientSelect').value = appointment.pacienteId;
        document.getElementById('appointmentDate').value = appointment.fechaCita.split('T')[0];
        document.getElementById('appointmentTime').value = appointment.horaCita;
        document.getElementById('appointmentReason').value = appointment.motivo || '';
        
        // Eliminar la cita existente (para reemplazarla)
        await cancelScheduledAppointment(appointmentId, false);
        
        // Desplazarse al formulario
        document.getElementById('appointmentForm').scrollIntoView({ behavior: 'smooth' });
        
        alert('Cita cargada para edición. Complete los cambios y haga clic en "Agendar Cita".');
    } catch (error) {
        console.error('Error cargando cita para editar:', error);
        alert('Error al cargar la cita para editar.');
    }
}

// Cambiar estado de la cita
async function changeAppointmentStatus(appointmentId) {
    try {
        const response = await fetch(`${API_CITAS}/${appointmentId}`);
        if (!response.ok) {
            throw new Error('Error al cargar cita');
        }
        
        const appointment = await response.json();
        
        const nuevoEstado = prompt(
            `Cambiar estado de la cita para ${appointment.pacienteNombre} ${appointment.pacienteApellido}:\n\n` +
            '1. programada\n' +
            '2. completada\n' +
            '3. cancelada\n' +
            '4. reprogramada\n\n' +
            'Ingrese el nuevo estado:',
            appointment.estado
        );
        
        if (nuevoEstado && ['programada', 'completada', 'cancelada', 'reprogramada'].includes(nuevoEstado.toLowerCase())) {
            const updateResponse = await fetch(`${API_CITAS}/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ estado: nuevoEstado.toLowerCase() }),
            });
            
            if (!updateResponse.ok) {
                throw new Error('Error al actualizar cita');
            }
            
            await loadScheduledAppointments();
            alert('Estado de la cita actualizado correctamente.');
        } else if (nuevoEstado) {
            alert('Estado no válido. Debe ser: programada, completada, cancelada o reprogramada.');
        }
    } catch (error) {
        console.error('Error cambiando estado de cita:', error);
        alert('Error al cambiar el estado de la cita.');
    }
}

// Cancelar cita programada en MongoDB
async function cancelScheduledAppointment(appointmentId, confirm = true) {
    if (confirm && !window.confirm('¿Está seguro de que desea cancelar esta cita?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_CITAS}/${appointmentId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar cita');
        }
        
        await loadScheduledAppointments();
        
        if (confirm) {
            alert('Cita cancelada correctamente.');
        }
    } catch (error) {
        console.error('Error eliminando cita:', error);
        alert('Error al eliminar la cita.');
    }
}

// Obtener clase CSS para el badge de estado
function getStatusBadgeClass(status) {
    switch (status) {
        case 'programada':
            return 'bg-primary';
        case 'completada':
            return 'bg-success';
        case 'cancelada':
            return 'bg-danger';
        case 'reprogramada':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
}

// Formatear fecha para mostrar

function formatAppointmentDate(dateString){
  if(!dateString) return '';
  const iso = String(dateString).split('T')[0]; // 'YYYY-MM-DD'
  const [y,m,d] = iso.includes('-') ? iso.split('-').map(Number) : iso.split('/').reverse().map(Number);
  const dt = new Date(Date.UTC(y, (m||1)-1, d||1));
  return dt.toLocaleDateString('es-ES', { weekday:'short', year:'numeric', month:'short', day:'numeric', timeZone:'UTC' });
}

// Función de cierre de sesión
function logout() {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        localStorage.removeItem('currentPatient');
        window.location.href = '/index.html';
    }
}

// Inicializar la gestión de citas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    
    initializeAppointmentManager();
});


function getLoggedDoctorName(){
  try{
    const keys=['currentDoctor','currentUser','doctor','user'];
    let raw='';
    for(const k of keys){
      const v=localStorage.getItem(k)||sessionStorage.getItem(k);
      if(v){ raw=v; break; }
    }
    if(!raw) return '';
    let o=raw;
    try{ o=JSON.parse(raw);}catch(_){}
    const nombre = (o.nombre||o.name||'').toString().trim();
    const apellido = (o.apellido||'').toString().trim();
    const full = [nombre, apellido].filter(Boolean).join(' ');
    return full ? ( /^dr\.?/i.test(full) ? full : 'Dr. ' + full ) : '';
  }catch(e){ return ''; }
}
