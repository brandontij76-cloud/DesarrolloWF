// Agrega esto al inicio de PacienteH.js para debug
console.log('=== INICIANDO PORTAL PACIENTE ===');
console.log('currentUser en localStorage:', localStorage.getItem('currentUser'));
console.log('currentPatient en localStorage:', localStorage.getItem('currentPatient'));

const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    console.error('❌ NO HAY USUARIO EN LOCALSTORAGE');
} else {
    console.log('✅ Usuario encontrado:', currentUser);
}
// PacienteH.js - Portal del Paciente (SOLO LECTURA)
let currentPatient = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializePatientPortal();
});

// Verificar autenticación del paciente
function checkAuthentication() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        alert('No hay sesión activa. Por favor, inicie sesión.');
        window.location.href = '/index.html';
        return;
    }
    
    if (currentUser.rol !== 'paciente') {
        alert('Acceso denegado. Esta sección es solo para pacientes.');
        window.location.href = '/index.html';
        return;
    }
}

async function initializePatientPortal() {
    initNotifications();
    await loadPatientData();
    await loadAllPatientData();
    setupEventListeners();
}

// Cargar datos del paciente actual desde MongoDB
async function loadPatientData() {
    try {
        // Obtener el usuario actual del localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser || !currentUser.email) {
            console.error('No hay usuario logueado');
            window.location.href = '/index.html';
            return;
        }

        console.log('Buscando paciente con email:', currentUser.email);

        // Buscar paciente por email en MongoDB
        const response = await fetch(`/api/pacientes/email/${currentUser.email}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paciente no encontrado. Contacte al administrador.');
            } else {
                throw new Error('Error del servidor al cargar datos');
            }
        }
        
        currentPatient = await response.json();
        console.log('Paciente encontrado:', currentPatient);
        
        // Guardar también en localStorage para uso futuro
        localStorage.setItem('currentPatient', JSON.stringify(currentPatient));
        
        updatePatientInfo();
        
    } catch (error) {
        console.error('Error cargando datos del paciente:', error);
        alert('Error: ' + error.message);
        window.location.href = '/index.html';
    }
}

// Actualizar información del paciente en la UI
function updatePatientInfo() {
    if (!currentPatient) return;
    
    document.getElementById('patient-name').textContent = 
        `${currentPatient.nombre} ${currentPatient.apellido}`;
    document.getElementById('patient-age').textContent = 
        `${currentPatient.edad} años`;
    document.getElementById('patient-gender').textContent = currentPatient.genero || 'No especificado';
    document.getElementById('patient-phone').textContent = currentPatient.telefono || 'No especificado';
    document.getElementById('patient-email').textContent = currentPatient.email || 'No especificado';
    document.getElementById('user-display-name').textContent = 
        `${currentPatient.nombre} ${currentPatient.apellido}`;
}

// Cargar todos los datos del paciente
async function loadAllPatientData() {
    if (!currentPatient) return;
    
    await loadPatientPrescriptions();
    await loadPatientAppointments();
    await loadPatientDiagnoses();
    updateSummaryCards();
}

// Cargar recetas del paciente desde MongoDB
async function loadPatientPrescriptions() {
    try {
        if (!currentPatient || !currentPatient._id) return;
        
        const response = await fetch(`/api/recetas/paciente/${currentPatient._id}`);
        
        if (!response.ok) {
            // Si no hay recetas, mostrar mensaje apropiado
            if (response.status === 404) {
                document.getElementById('prescriptions-list').innerHTML = 
                    '<p class="text-center text-muted">No tiene recetas registradas</p>';
                return;
            }
            throw new Error('Error al cargar recetas');
        }
        
        const prescriptions = await response.json();
        renderPrescriptions(prescriptions);
        renderMiniPrescriptions(prescriptions);
        updatePatientDebug(`${currentPatient.nombre||''} ${currentPatient.apellido||''}`.trim(), prescriptions.length, null);
        
    } catch (error) {
        console.error('Error cargando recetas:', error);
        document.getElementById('prescriptions-list').innerHTML = 
            '<p class="text-center text-muted">No se pudieron cargar las recetas</p>';
    }
}

// Cargar citas del paciente desde MongoDB
async function loadPatientAppointments() {
    try {
        if (!currentPatient || !currentPatient._id) return;
        
        const response = await fetch(`/api/citas/paciente/${currentPatient._id}`);
        
        if (!response.ok) {
            // Si no hay citas, mostrar mensaje apropiado
            if (response.status === 404) {
                document.getElementById('appointments-list').innerHTML = 
                    '<p class="text-center text-muted">No tiene citas programadas</p>';
                return;
            }
            throw new Error('Error al cargar citas');
        }
        
        const appointments = await response.json();
        renderAppointments(appointments);
        renderMiniAppointments(appointments);
        updatePatientDebug(`${currentPatient.nombre||''} ${currentPatient.apellido||''}`.trim(), null, appointments.length);
        
    } catch (error) {
        console.error('Error cargando citas:', error);
        document.getElementById('appointments-list').innerHTML = 
            '<p class="text-center text-muted">No se pudieron cargar las citas</p>';
    }
}

// Cargar diagnósticos del paciente desde MongoDB
async function loadPatientDiagnoses() {
    try {
        if (!currentPatient || !currentPatient._id) return;
        
        const response = await fetch(`/api/diagnosticos/paciente/${currentPatient._id}`);
        
        if (!response.ok) {
            // Si no hay diagnósticos, mostrar mensaje apropiado
            if (response.status === 404) {
                document.getElementById('diagnoses-list').innerHTML = 
                    '<p class="text-center text-muted">No tiene diagnósticos registrados</p>';
                return;
            }
            throw new Error('Error al cargar diagnósticos');
        }
        
        const diagnoses = await response.json();
        renderDiagnoses(diagnoses);
        
    } catch (error) {
        console.error('Error cargando diagnósticos:', error);
        document.getElementById('diagnoses-list').innerHTML = 
            '<p class="text-center text-muted">No se pudieron cargar los diagnósticos</p>';
    }
}

// Renderizar recetas (SOLO LECTURA)

// ===== Helper: render diagnosis section (robusto a distintas formas) =====
function renderDiagnosis(prescription){
  try{
    const d = (prescription && prescription.diagnostico) ? prescription.diagnostico : {};
    const code = (d.codigoCIE10 || prescription.codigoCIE10 || prescription.cie10 || '').toString().trim();
    const desc = (d.descripcion || prescription.diagnosticoDescripcion || prescription.diagnosticoTexto || prescription.diagnostico || '').toString().trim();
    const hall = (d.hallazgosClinicos || prescription.hallazgosClinicos || prescription.hallazgos || '').toString().trim();
    if(!code && !desc && !hall) return '';
    return `
      <hr class="my-3">
      <div class="mt-2">
        <h6>Diagnóstico</h6>
        ${desc ? `<div class="mb-1"><strong>Descripción:</strong> ${desc}</div>` : ''}
        ${code ? `<div class="mb-1"><strong>CIE-10:</strong> ${code}</div>` : ''}
        ${hall ? `<div class="mb-1"><strong>Hallazgos clínicos:</strong> ${hall}</div>` : ''}
      </div>
    `;
  }catch(e){ console.warn('No se pudo renderizar diagnóstico', e); return ''; }
}
function renderPrescriptions(prescriptions) {
    const container = document.getElementById('prescriptions-list');
    
    if (!prescriptions || prescriptions.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No tiene recetas registradas</p>';
        return;
    }
    
    prescriptions.sort((a, b) => new Date(b.fechaEmision) - new Date(a.fechaEmision));
    
    container.innerHTML = prescriptions.map(prescription => {
        const isExpired = new Date(prescription.fechaValidez) < new Date();
        const statusClass = isExpired ? 'expired' : 'active';
        const statusText = isExpired ? 'Expirada' : 'Activa';
        
        return `
            <div class="prescription-card ${statusClass} border p-3 mb-3 rounded read-only-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="mb-1">Receta del ${formatDate(prescription.fechaEmision)}</h5>
                        <p class="mb-1"><strong>Válida hasta:</strong> ${formatDate(prescription.fechaValidez)}</p>
                        <p class="mb-1"><strong>Médico:</strong> ${prescription.doctorNombre || 'No especificado'}</p>
                        <span class="badge ${isExpired ? 'bg-danger' : 'bg-success'} status-badge">${statusText}</span>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6>Medicamentos Recetados:</h6>
                    ${(prescription.medicamentos && prescription.medicamentos.length > 0) ? 
                        prescription.medicamentos.map(med => `
                            <div class="medication-item border-bottom pb-2 mb-2">
                                <strong>${med.nombre} ${med.dosis}</strong><br>
                                <small class="text-muted">${med.frecuencia} ${med.duracion ? `por ${med.duracion}` : ''}</small>
                                ${med.instruccionesEspeciales ? `<br><small><em>Instrucciones: ${med.instruccionesEspeciales}</em></small>` : ''}
                            </div>
                        `).join('') : 
                        '<p class="text-muted">No se especificaron medicamentos</p>'
                    }
                </div>
                
                ${renderDiagnosis(prescription)}
                
                ${prescription.instruccionesGenerales ? `
                    <div class="mt-2 p-2 bg-light rounded">
                        <strong>Instrucciones generales:</strong> ${prescription.instruccionesGenerales}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Renderizar citas (SOLO LECTURA)
function renderAppointments(appointments) {
    const container = document.getElementById('appointments-list');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No tiene citas programadas</p>';
        return;
    }
    
    appointments.sort((a, b) => new Date(a.fechaCita) - new Date(b.fechaCita));
    
    container.innerHTML = appointments.map(appointment => {
        const appointmentDate = new Date(appointment.fechaCita);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let statusClass = 'upcoming';
        let statusText = appointment.estado || 'Programada';
        
        if (appointmentDate < today) {
            statusClass = 'past';
            statusText = 'Completada';
        } else if (appointmentDate.getTime() === today.getTime()) {
            statusClass = 'today';
            statusText = 'Hoy';
        }
        
        return `
            <div class="appointment-card ${statusClass} border p-3 mb-3 rounded read-only-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="mb-1">${formatDate(appointment.fechaCita)}</h5>
                        <p class="mb-1"><strong>Hora:</strong> ${appointment.horaCita || 'No especificada'}</p>
                        <p class="mb-1"><strong>Médico:</strong> ${appointment.doctorNombre || 'No especificado'}</p>
                        <p class="mb-1"><strong>Motivo:</strong> ${appointment.motivo || 'Consulta general'}</p>
                        <p class="mb-1"><strong>Estado:</strong> ${appointment.estado || 'Programada'}</p>
                    </div>
                    <span class="badge ${getAppointmentBadgeClass(statusClass)} status-badge">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Renderizar diagnósticos (SOLO LECTURA)
function renderDiagnoses(diagnoses) {
    const container = document.getElementById('diagnoses-list');
    
    if (!diagnoses || diagnoses.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No tiene diagnósticos registrados</p>';
        return;
    }
    
    diagnoses.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    container.innerHTML = diagnoses.map(diagnosis => `
        <div class="diagnosis-card border p-3 mb-3 rounded read-only-card">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h5 class="mb-1">Consulta del ${formatDate(diagnosis.fecha)}</h5>
                    <p class="mb-1"><strong>Médico:</strong> ${diagnosis.doctorNombre || 'No especificado'}</p>
                </div>
            </div>
            
            <div class="mt-3">
                <div class="mb-3">
                    <h6 class="text-primary">Diagnóstico Principal:</h6>
                    <p class="mb-2 p-2 bg-light rounded">${diagnosis.diagnostico || 'No especificado'}</p>
                </div>
                
                <div class="mb-3">
                    <h6 class="text-success">Tratamiento Indicado:</h6>
                    <p class="mb-2 p-2 bg-light rounded">${diagnosis.tratamiento || 'No especificado'}</p>
                </div>
                
                ${diagnosis.observaciones ? `
                    <div class="mb-3">
                        <h6 class="text-info">Observaciones Médicas:</h6>
                        <p class="mb-0 p-2 bg-light rounded">${diagnosis.observaciones}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Actualizar tarjetas de resumen
function updateSummaryCards() {
    if (!currentPatient) return;
    
    // Contar recetas activas
    const recetasActivas = document.querySelectorAll('.prescription-card.active').length;
    document.getElementById('total-recetas').textContent = recetasActivas;
    
    // Contar citas próximas
    const citasProximas = document.querySelectorAll('.appointment-card.upcoming, .appointment-card.today').length;
    document.getElementById('total-citas').textContent = citasProximas;
    
    // Contar diagnósticos
    const totalDiagnosticos = document.querySelectorAll('.diagnosis-card').length;
    document.getElementById('total-diagnosticos').textContent = totalDiagnosticos;
    
    // Contar doctores únicos
    const doctores = new Set();
    document.querySelectorAll('.prescription-card, .appointment-card, .diagnosis-card').forEach(card => {
        const doctorText = card.textContent.match(/Médico:\s*([^\n<]+)/);
        if (doctorText && doctorText[1]) {
            doctores.add(doctorText[1].trim());
        }
    });
    document.getElementById('total-doctores').textContent = doctores.size;
    
    // Actualizar próxima cita en el resumen
    const nextAppointment = document.querySelector('.appointment-card.upcoming, .appointment-card.today');
    if (nextAppointment) {
        const date = nextAppointment.querySelector('h5').textContent;
        const doctorMatch = nextAppointment.textContent.match(/Médico:\s*([^\n<]+)/);
        const doctor = doctorMatch ? doctorMatch[1].trim() : '';
        
        document.getElementById('next-appointment-date').textContent = date;
        document.getElementById('next-appointment-doctor').textContent = doctor ? `Con ${doctor}` : '';
    }
    
    // Actualizar última receta
    const lastPrescription = document.querySelector('.prescription-card');
    if (lastPrescription) {
        const date = lastPrescription.querySelector('h5').textContent.replace('Receta del ', '');
        const doctorMatch = lastPrescription.textContent.match(/Médico:\s*([^\n<]+)/);
        const doctor = doctorMatch ? doctorMatch[1].trim() : '';
        
        document.getElementById('last-prescription-date').textContent = date;
        document.getElementById('last-prescription-doctor').textContent = doctor ? `Por ${doctor}` : '';
    }
    
    // Actualizar último diagnóstico
    const lastDiagnosis = document.querySelector('.diagnosis-card');
    if (lastDiagnosis) {
        const date = lastDiagnosis.querySelector('h5').textContent.replace('Consulta del ', '');
        const doctorMatch = lastDiagnosis.textContent.match(/Médico:\s*([^\n<]+)/);
        const doctor = doctorMatch ? doctorMatch[1].trim() : '';
        
        document.getElementById('last-diagnosis-date').textContent = date;
        document.getElementById('last-diagnosis-doctor').textContent = doctor ? `Por ${doctor}` : '';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda en tiempo real
    document.getElementById('search-prescriptions').addEventListener('input', function(e) {
        filterItems('prescriptions-list', e.target.value);
    });
    
    document.getElementById('search-appointments').addEventListener('input', function(e) {
        filterItems('appointments-list', e.target.value);
    });
    
    document.getElementById('search-diagnoses').addEventListener('input', function(e) {
        filterItems('diagnoses-list', e.target.value);
    });
}

// Filtrar items en listas
function filterItems(containerId, searchTerm) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.prescription-card, .appointment-card, .diagnosis-card');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm.toLowerCase())) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Mostrar sección específica
function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(`${sectionName}-section`).style.display = 'block';
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Funciones auxiliares
function formatDate(dateString) {
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    } catch (error) {
        return 'Fecha no disponible';
    }
}

function getAppointmentBadgeClass(status) {
    switch (status) {
        case 'past': return 'bg-secondary';
        case 'today': return 'bg-success';
        case 'upcoming': return 'bg-warning';
        default: return 'bg-primary';
    }
}

// Cerrar sesión
function logout() {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentPatient');
        window.location.href = '/index.html';
    }
}

// === Notificaciones para el paciente ===
async function renderPatientNotifications(){
  const box = document.getElementById('patientNotifications');
  if(!box) return;
  const items = [];

  // Cargar recetas del paciente
  try{
    const rid = localStorage.getItem('currentPatientId') || (window.currentPatient && window.currentPatient._id);
    if(rid){
      const rxRes = await fetch('/api/recetas?pacienteId='+encodeURIComponent(rid));
      if(rxRes.ok){
        const recetas = await rxRes.json();
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        recetas.forEach(r => {
          if(!r.fechaExpiracion) return;
          const exp = new Date(r.fechaExpiracion);
          const diff = Math.ceil((exp - hoy)/(1000*60*60*24));
          if(diff <= 3 && diff >= 0){
            items.push({type:'warn', title:'Receta por vencer', msg:`Tu receta vence en ${diff} día(s).`, when: exp});
          }
          if(diff < 0){
            items.push({type:'danger', title:'Receta vencida', msg:`Tu receta venció el ${exp.toLocaleDateString()}.`, when: exp});
          }
        });
      }
    }
  }catch(e){ console.warn('notif recetas', e); }

  // Citas próximas del paciente (siguientes 7 días)
  try{
    const pid = localStorage.getItem('currentPatientId') || (window.currentPatient && window.currentPatient._id);
    if(pid){
      const cRes = await fetch('/api/citas?pacienteId='+encodeURIComponent(pid));
      if(cRes.ok){
        const citas = await cRes.json();
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const siete = new Date(hoy.getTime()+7*24*3600*1000);
        citas.forEach(c => {
          const f = new Date(c.fechaCita);
          if(f>=hoy && f<=siete && (c.estado||'').toLowerCase() !== 'cancelada'){
            items.push({type:'info', title:'Próxima cita', msg:`Tienes una cita el ${f.toLocaleDateString()} a las ${c.horaCita}.`, when:f});
          }
        });
      }
    }
  }catch(e){ console.warn('notif citas', e); }

  // Render
  if(items.length === 0){
    box.innerHTML = '';
    return;
  }
  items.sort((a,b)=> (a.when||0)-(b.when||0));
  box.innerHTML = items.map(it => `
    <div class="patient-toast ${it.type||''}">
      <div><strong>${it.title}</strong></div>
      <div>${it.msg}</div>
      <div class="small">Centro Médico - Hospital La Paz</div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', renderPatientNotifications);


// Render mini paneles (Resumen)
function renderMiniPrescriptions(prescriptions){
  const box = document.getElementById('mini-prescriptions');
  if(!box) return;
  if(!prescriptions || prescriptions.length===0){
    box.innerHTML = '<p class="text-muted">No tiene recetas registradas</p>';
    return;
  }
  const top = prescriptions.slice(0,3);
  box.innerHTML = top.map(p => `
    <div class="d-flex justify-content-between border-bottom py-2">
      <div>
        <div class="small"><strong>${formatDate(p.fechaEmision||p.fecha)}</strong></div>
        <div class="small">${p.doctorNombre||'—'}</div>
      </div>
      <span class="badge ${new Date(p.fechaValidez||p.validaHasta) < new Date() ? 'bg-danger':'bg-success'}">
        ${new Date(p.fechaValidez||p.validaHasta) < new Date() ? 'Expirada':'Activa'}
      </span>
    </div>
  `).join('');
}

function renderMiniAppointments(appointments){
  const box = document.getElementById('mini-appointments');
  if(!box) return;
  if(!appointments || appointments.length===0){
    box.innerHTML = '<p class="text-muted">No hay citas programadas</p>';
    return;
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = appointments.filter(a => new Date(a.fechaCita||a.fecha) >= today)
                               .sort((a,b)=> new Date(a.fechaCita||a.fecha) - new Date(b.fechaCita||b.fecha))
                               .slice(0,3);
  if(upcoming.length===0){
    box.innerHTML = '<p class="text-muted">No hay citas programadas</p>';
    return;
  }
  box.innerHTML = upcoming.map(a => `
    <div class="d-flex justify-content-between border-bottom py-2">
      <div>
        <div class="small"><strong>${formatDate(a.fechaCita||a.fecha)}</strong></div>
        <div class="small">Hora: ${a.horaCita||a.hora||'—'}</div>
        <div class="small">Médico: ${a.doctorNombre||'—'}</div>
      </div>
      <span class="badge bg-info">Próx.</span>
    </div>
  `).join('');
}


function matchByPatient(item, patient){
  const pid = normalizeId(patient);
  const itemPid = item.pacienteId || (item.paciente && (item.paciente._id || item.paciente.id)) || item.pacienteID || item.paciente_id || item.idPaciente || item.id_paciente;
  if (String(itemPid||'') === String(pid||'')) return true;
  const email = (patient.email||'').toString().trim().toLowerCase();
  const itemEmail = (item.pacienteEmail||item.emailPaciente||'').toString().trim().toLowerCase();
  if (email && itemEmail && email === itemEmail) return true;
  const full = (`${patient.nombre||''} ${patient.apellido||''}`).trim().toLowerCase();
  const itemName = (item.pacienteNombre||item.nombrePaciente||item.nombre||'').toString().trim().toLowerCase();
  if (full && itemName && itemName === full) return true;
  return false;
}


function updatePatientDebug(name, rxCount, apCount){
  try{
    const on = localStorage.getItem('patientDebug') === '1';
    const box = document.getElementById('patient-debug');
    if(!box) return;
    box.style.display = on ? 'block':'none';
    if(on){
      document.getElementById('dbgName').textContent = name||'-';
      document.getElementById('dbgRx').textContent = rxCount!=null?rxCount:'-';
      document.getElementById('dbgAp').textContent = apCount!=null?apCount:'-';
    }
  }catch(_){}
}


// === Notificaciones (campanita) ===
let notifState = { unread: 0, items: [] };

function setupNotificationBell(){
  try{
    const bell = document.getElementById('notifBell');
    const dd = document.getElementById('notifDropdown');
    const badge = document.getElementById('notifBadge');
    const mark = document.getElementById('notifMarkRead');
    if(!bell || !dd) return;

    // Toggle dropdown
    bell.addEventListener('click', (e)=>{
      e.preventDefault();
      dd.classList.toggle('d-none');
    });
    // Click outside closes
    document.addEventListener('click', (e)=>{
      if(!dd.classList.contains('d-none')){
        const cnt = document.getElementById('notif-container');
        if(cnt && !cnt.contains(e.target)){
          dd.classList.add('d-none');
        }
      }
    });
    // Mark read
    if(mark){
      mark.addEventListener('click', ()=>{
        notifState.unread = 0;
        updateNotifBadge();
      });
    }
  }catch(e){ console.warn('setup bell', e); }
}

function updateNotifBadge(){
  const badge = document.getElementById('notifBadge');
  if(!badge) return;
  const n = notifState.unread||0;
  if(n>0){ badge.textContent = n>9? '9+': String(n); badge.classList.remove('d-none'); }
  else { badge.classList.add('d-none'); }
}

async function refreshNotifications(){
  if(!currentPatient || !currentPatient._id) return;
  const items = [];

  // 1) Citas próximas (hoy y próximos 7 días)
  try{
    const r = await fetch(`/api/citas/paciente/${currentPatient._id}`);
    if(r.ok){
      const citas = await r.json();
      const now = new Date();
      const in7 = new Date(); in7.setDate(in7.getDate()+7);
      citas.forEach(c=>{
        const f = new Date(c.fechaCita || c.fecha);
        if(!isNaN(f)){
          if(f >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && f <= in7){
            items.push({
              type:'cita',
              title:'Cita próxima',
              message:`Tienes una cita el ${formatDate(c.fechaCita||c.fecha)} a las ${c.horaCita||c.hora||'—'}`,
              when:f
            });
          }
        }
      });
    }
  }catch(e){ console.warn('notif citas', e); }

  // 2) Medicamentos / Recetas activas (no vencidas)
  try{
    const r2 = await fetch(`/api/recetas/paciente/${currentPatient._id}`);
    if(r2.ok){
      const recetas = await r2.json();
      const today = new Date(); today.setHours(0,0,0,0);
      recetas.forEach(rx=>{
        const exp = rx.fechaExpiracion ? new Date(rx.fechaExpiracion) : null;
        const meds = Array.isArray(rx.medicamentos)? rx.medicamentos : [];
        const activos = exp ? (exp >= today) : true;
        if(activos && meds.length>0){
          const lista = meds.slice(0,3).map(m=> `${m.nombre||m.medicamento||'Medicamento'} (${m.dosis||m.dosificacion||''})`).join(', ');
          items.push({
            type:'med',
            title:'Medicamentos pendientes',
            message:`Debes tomar: ${lista}${meds.length>3?' y más...':''}`,
            when: exp || today
          });
        }
      });
    }
  }catch(e){ console.warn('notif recetas', e); }

  // Ordenar y limitar
  items.sort((a,b)=> (b.when?.getTime()||0) - (a.when?.getTime()||0));
  notifState.items = items.slice(0,20);
  notifState.unread = notifState.items.length;
  renderNotificationsList();
  updateNotifBadge();
}

function renderNotificationsList(){
  const list = document.getElementById('notifList');
  if(!list) return;
  if(!notifState.items.length){
    list.innerHTML = '<div class="p-3 text-muted">Sin notificaciones</div>';
    return;
  }
  list.innerHTML = notifState.items.map(it=>{
    const badge = it.type==='cita' ? '<span class="badge bg-primary me-2">Cita</span>' : '<span class="badge bg-success me-2">Medicamento</span>';
    return `
      <a href="#" class="list-group-item list-group-item-action notif-item">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${badge}${it.title}</h6>
          <small>${it.when ? formatDate(it.when) : ''}</small>
        </div>
        <p class="mb-1">${it.message}</p>
      </a>
    `;
  }).join('');
}

// Hook into existing init
function initNotifications(){
  setupNotificationBell();
  refreshNotifications();
  // refresco cada 60s
  setInterval(refreshNotifications, 60000);
}
