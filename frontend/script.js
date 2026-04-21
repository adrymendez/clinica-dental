/* ======================= DATOS INICIALES Y ELEMENTOS DEL DOM ======================= */
const API_URL = "https://clinica-dental-gyyo.onrender.com/api";
const horariosOcupados = {
    '2026-02-18': ['09:00', '14:00', '16:00'],
    '2026-02-19': ['10:00', '15:00'],
    '2026-02-20': ['09:00', '11:00', '13:00', '17:00'],
    '2026-02-21': ['14:00', '16:30'],
};

const formularioCita = document.getElementById('formularioCita');
const ctaButton = document.getElementById('ctaButton');
const navCita = document.getElementById('navCita');
const hamburger = document.getElementById('hamburger');
const nav = document.querySelector('.nav');
const modalExito = document.getElementById('modalExito');
const closeModal = document.getElementById('closeModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const mensajeConfirmacion = document.getElementById('mensajeConfirmacion');

const inputNombre = document.getElementById('nombre');
const inputTelefono = document.getElementById('telefono');
const inputEmail = document.getElementById('email');
const inputServicio = document.getElementById('servicio');
const inputMedico = document.getElementById('medico');
const inputFecha = document.getElementById('fecha');
const inputHora = document.getElementById('hora');

// Elementos admin
const tablaCitasBody = document.querySelector('#tablaCitas tbody');
const exportCsvBtn = document.getElementById('exportCsv');
const clearAllBtn = document.getElementById('clearAll');
const filterMedico = document.getElementById('filterMedico');
const formAddDoctor = document.getElementById('formAddDoctor');
const inputNewDoctor = document.getElementById('newDoctor');
const listaMedicos = document.getElementById('listaMedicos');

let medicos = [];
let citas = [];

/* ======================= FUNCIONES DE UTILIDAD ======================= */

// Obtener fecha mínima (hoy)
function obtenerFechaMinima() {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
}

// Obtener fecha máxima (3 meses adelante)
function obtenerFechaMaxima() {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() + 3);
    return fecha.toISOString().split('T')[0];
}

// Verificar si es domingo
function esDomingo(fechaString) {
    const fecha = new Date(fechaString + 'T00:00:00');
    return fecha.getDay() === 0;
}

// Validar email
function esEmailValido(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validar teléfono (solo números y caracteres permitidos)
function esTelefonoValido(telefono) {
    const regex = /^[0-9+\-\s()]+$/;
    return regex.test(telefono) && telefono.replace(/\D/g, '').length >= 7;
}

// Obtener horarios disponibles
function obtenerHorariosDisponibles(fecha) {
    const horariosBase = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    // Combina horarios ocupados predefinidos con citas guardadas en localStorage
    const ocupados = new Set();
    if (horariosOcupados[fecha]) {
        horariosOcupados[fecha].forEach(h => ocupados.add(h));
    }

    citas.forEach(c => {
        if (c.fecha === fecha && c.hora) ocupados.add(c.hora);
    });

    return horariosBase.filter(hora => !ocupados.has(hora));
}

/* ======================= VALIDACIÓN DE CAMPOS ======================= */

function validarNombre() {
    const valor = inputNombre.value.trim();
    const grupo = inputNombre.closest('.form-group');
    const error = document.getElementById('errorNombre');

    if (valor === '') {
        grupo.classList.add('error');
        error.textContent = 'El nombre completo es obligatorio';
        error.classList.add('show');
        return false;
    }

    if (valor.length < 3) {
        grupo.classList.add('error');
        error.textContent = 'El nombre debe tener al menos 3 caracteres';
        error.classList.add('show');
        return false;
    }

    grupo.classList.remove('error');
    error.textContent = '';
    error.classList.remove('show');
    return true;
}

function validarTelefono() {
    const valor = inputTelefono.value.trim();
    const grupo = inputTelefono.closest('.form-group');
    const error = document.getElementById('errorTelefono');

    if (valor === '') {
        grupo.classList.add('error');
        error.textContent = 'El teléfono es obligatorio';
        error.classList.add('show');
        return false;
    }

    if (!esTelefonoValido(valor)) {
        grupo.classList.add('error');
        error.textContent = 'Ingresa un teléfono válido';
        error.classList.add('show');
        return false;
    }

    grupo.classList.remove('error');
    error.textContent = '';
    error.classList.remove('show');
    return true;
}

function validarEmail() {
    const valor = inputEmail.value.trim();
    const grupo = inputEmail.closest('.form-group');
    const error = document.getElementById('errorEmail');

    if (valor === '') {
        grupo.classList.add('error');
        error.textContent = 'El correo electrónico es obligatorio';
        error.classList.add('show');
        return false;
    }

    if (!esEmailValido(valor)) {
        grupo.classList.add('error');
        error.textContent = 'Ingresa un correo electrónico válido';
        error.classList.add('show');
        return false;
    }

    grupo.classList.remove('error');
    error.textContent = '';
    error.classList.remove('show');
    return true;
}

function validarServicio() {
    const valor = inputServicio.value;
    const grupo = inputServicio.closest('.form-group');
    const error = document.getElementById('errorServicio');

    if (valor === '') {
        grupo.classList.add('error');
        error.textContent = 'Selecciona un servicio';
        error.classList.add('show');
        return false;
    }

    grupo.classList.remove('error');
    error.textContent = '';
    error.classList.remove('show');
    return true;
}

function validarMedico() {
    const valor = inputMedico.value;
    const grupo = inputMedico.closest('.form-group');
    const error = document.getElementById('errorMedico');

    if (valor === '') {
        grupo.classList.add('error');
        error.textContent = 'Selecciona un médico';
        error.classList.add('show');
        return false;
    }

    grupo.classList.remove('error');
    error.textContent = '';
    error.classList.remove('show');
    return true;
}

function validarFecha() {
    const valor = inputFecha.value;
    const grupo = inputFecha.closest('.form-group');
    const error = document.getElementById('errorFecha');

    if (valor === '') {
        grupo.classList.add('error');
        error.textContent = 'La fecha es obligatoria';
        error.classList.add('show');
        return false;
    }

    if (esDomingo(valor)) {
        grupo.classList.add('error');
        error.textContent = 'No está disponible el domingo. Elige otro día';
        error.classList.add('show');
        return false;
    }

    grupo.classList.remove('error');
    error.textContent = '';
    error.classList.remove('show');
    return true;
}

function validarHora() {
    const valor = inputHora.value;
    const fecha = inputFecha.value;
    const grupo = inputHora.closest('.form-group');
    const error = document.getElementById('errorHora');

    if (valor === '') {
        grupo.classList.add('error');
        error.textContent = 'La hora es obligatoria';
        error.classList.add('show');
        return false;
    }

    const horariosDisponibles = obtenerHorariosDisponibles(fecha);
    if (!horariosDisponibles.includes(valor)) {
        grupo.classList.add('error');
        error.textContent = 'Esta hora no está disponible. Elige otra';
        error.classList.add('show');
        return false;
    }

    grupo.classList.remove('error');
    error.textContent = '';
    error.classList.remove('show');
    return true;
}

/* ======================= VALIDACIÓN EN TIEMPO REAL ======================= */

inputNombre.addEventListener('blur', validarNombre);
inputNombre.addEventListener('input', function() {
    if (this.closest('.form-group').classList.contains('error')) {
        validarNombre();
    }
});

inputTelefono.addEventListener('blur', validarTelefono);
inputTelefono.addEventListener('input', function() {
    if (this.closest('.form-group').classList.contains('error')) {
        validarTelefono();
    }
});

inputEmail.addEventListener('blur', validarEmail);
inputEmail.addEventListener('input', function() {
    if (this.closest('.form-group').classList.contains('error')) {
        validarEmail();
    }
});

inputServicio.addEventListener('change', validarServicio);
inputMedico.addEventListener('change', validarMedico);
inputMedico.addEventListener('blur', validarMedico);

inputFecha.addEventListener('change', function() {
    validarFecha();
    actualizarHorasDisponibles();
});

inputHora.addEventListener('change', validarHora);

/* ======================= ACTUALIZAR HORAS DISPONIBLES ======================= */

function actualizarHorasDisponibles() {
    const fecha = inputFecha.value;

    if (!fecha) {
        inputHora.innerHTML = '<option value="">Primero selecciona una fecha</option>';
        inputHora.disabled = true;
        return;
    }

    const horariosDisponibles = obtenerHorariosDisponibles(fecha);
    const horaActual = inputHora.value;

    let html = '<option value="">Selecciona una hora</option>';
    horariosDisponibles.forEach(hora => {
        const selected = hora === horaActual ? 'selected' : '';
        html += `<option value="${hora}" ${selected}>${hora}</option>`;
    });

    inputHora.innerHTML = html;
    inputHora.disabled = false;

    if (horaActual && !horariosDisponibles.includes(horaActual)) {
        inputHora.value = '';
    }
}

/* ======================= CONFIGURAR RANGO DE FECHAS ======================= */

function configurarRangoFechas() {
    const fechaMinima = obtenerFechaMinima();
    const fechaMaxima = obtenerFechaMaxima();

    inputFecha.setAttribute('min', fechaMinima);
    inputFecha.setAttribute('max', fechaMaxima);
}

/* ======================= ENVÍO DEL FORMULARIO ======================= */

formularioCita.addEventListener('submit', function(e) {
    e.preventDefault();

    // Validar todos los campos
    const nombreValido = validarNombre();
    const telefonoValido = validarTelefono();
    const emailValido = validarEmail();
    const servicioValido = validarServicio();
    const medicoValido = validarMedico();
    const fechaValida = validarFecha();
    const horaValida = validarHora();

    if (!nombreValido || !telefonoValido || !emailValido || !servicioValido || !medicoValido || !fechaValida || !horaValida) {
        animarError();
        return;
    }

    // Enviar formulario
    enviarFormulario();
});

function animarError() {
    const gruposError = formularioCita.querySelectorAll('.form-group.error');
    gruposError.forEach((grupo, index) => {
        setTimeout(() => {
            grupo.style.animation = 'none';
            setTimeout(() => {
                grupo.style.animation = 'slideUp 0.3s ease-out';
            }, 10);
        }, index * 100);
    });
}
async function enviarFormulario() {
    const datos = {
        nombre: inputNombre.value.trim(),
        telefono: inputTelefono.value.trim(),
        email: inputEmail.value.trim(),
        servicio: inputServicio.value,
        medico: inputMedico.value,
        fecha: inputFecha.value,
        hora: inputHora.value,
    };

    try {
        const res = await fetch(`${API_URL}/citas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        const data = await res.json();

        citas.push(data);

        mostrarModalExito(data);
        formularioCita.reset();

    } catch (error) {
        console.error(error);
        alert("Error guardando cita ❌");
    }
}

function mostrarModalExito(datos) {
    const fechaFormato = new Date(datos.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    mensajeConfirmacion.innerHTML = `
        <strong>¡Cita confirmada con éxito!</strong><br><br>
        <strong>Datos de tu cita:</strong><br>
        Paciente: ${datos.nombre}<br>
        Servicio: ${datos.servicio}<br>
        Fecha: ${fechaFormato}<br>
        Hora: ${datos.hora}<br><br>
        Nos pondremos en contacto al ${datos.telefono} para confirmar.<br>
        <em>¡Gracias por confiar en nosotros!</em>
    `;

    modalExito.classList.add('show');
}

/* ======================= MANEJO DEL MODAL ======================= */

closeModal.addEventListener('click', function() {
    modalExito.classList.remove('show');
});

closeModalBtn.addEventListener('click', function() {
    modalExito.classList.remove('show');
});

modalExito.addEventListener('click', function(e) {
    if (e.target === modalExito) {
        modalExito.classList.remove('show');
    }
});

/* ======================= MENÚ HAMBURGUESA ======================= */

hamburger.addEventListener('click', function() {
    nav.classList.toggle('active');
});

// Cerrar menú al hacer click en un link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
        nav.classList.remove('active');
    });
});

/* ======================= BOTONES CTA ======================= */

function abrirFormularioCitas() {
    document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
    inputNombre.focus();
}

ctaButton.addEventListener('click', abrirFormularioCitas);
navCita.addEventListener('click', abrirFormularioCitas);

/* ======================= SCROLL SUAVE MEJORADO ======================= */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            const elemento = document.querySelector(href);
            const offsetTop = elemento.offsetTop - 80;

            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });

            if (nav.classList.contains('active')) {
                nav.classList.remove('active');
            }
        }
    });
});

/* ======================= ANIMACIONES AL SCROLL ======================= */

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'slideUp 0.6s ease-out forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.servicio-card').forEach(card => {
    card.style.opacity = '0';
    observer.observe(card);
});

/* ======================= INICIALIZACIÓN ======================= */

window.addEventListener('load', function() {
    configurarRangoFechas();
    actualizarHorasDisponibles();

    // Agregar animaciones de entrada a elementos principales
    const elementos = document.querySelectorAll('.hero-content, .servicios-grid');
    elementos.forEach(elemento => {
        elemento.style.animation = 'fadeIn 0.8s ease-out';
    });
});

/* ======================= MANEJO DE ERRORES Y PREVENCIÓN DE SPAM ======================= */

let ultimoEnvioProcesado = 0;
const tiempoMinimoEntreEnvios = 1000; // 1 segundo mínimo entre envíos

formularioCita.addEventListener('submit', function(e) {
    const ahora = Date.now();

    if (ahora - ultimoEnvioProcesado < tiempoMinimoEntreEnvios) {
        e.preventDefault();
        return;
    }

    ultimoEnvioProcesado = ahora;
});

/* ======================= VALIDACIÓN AL CARGAR LA PÁGINA ======================= */

window.addEventListener('DOMContentLoaded', function() {
    // Validar integridad del formulario
    const camposRequeridos = formularioCita.querySelectorAll('[required]');
    console.log(`Formulario cargado con ${camposRequeridos.length} campos requeridos`);

    // Log de horarios ocupados de prueba
    console.log('Horarios ocupados de prueba:', horariosOcupados);
});

/* ======================= ACCESIBILIDAD ======================= */

// Permitir envío con Enter en los campos del formulario
formularioCita.querySelectorAll('input, select').forEach((campo, index, campos) => {
    campo.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this === campos[campos.length - 1]) {
            formularioCita.dispatchEvent(new Event('submit'));
        }
    });
});

/* ======================= ALMACENAMIENTO Y ADMIN ======================= */

function guardarCitas() {
    localStorage.setItem('citas', JSON.stringify(citas));
}

function cargarCitas() {
    try {
        const raw = localStorage.getItem('citas');
        citas = raw ? JSON.parse(raw) : [];
    } catch (e) {
        citas = [];
    }
}

function guardarMedicos() {
    localStorage.setItem('medicos', JSON.stringify(medicos));
}

function cargarMedicos() {
    try {
        const raw = localStorage.getItem('medicos');
        medicos = raw ? JSON.parse(raw) : [];
    } catch (e) {
        medicos = [];
    }

    // Si no hay médicos, agregar algunos por defecto
    if (!medicos || medicos.length === 0) {
        medicos = ['Dr. Ana Pérez', 'Dr. Carlos Gómez', 'Dra. Laura Molina'];
        guardarMedicos();
    }
}

function renderDoctorSelects() {
    // Form select
    inputMedico.innerHTML = '<option value="">Selecciona un médico</option>';
    medicos.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        inputMedico.appendChild(opt);
    });

    // Filter select
    filterMedico.innerHTML = '<option value="">Todos los médicos</option>';
    medicos.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        filterMedico.appendChild(opt);
    });
}

function renderDoctorsList() {
    listaMedicos.innerHTML = '';
    medicos.forEach((m, idx) => {
        const li = document.createElement('li');
        li.textContent = m;
        const btn = document.createElement('button');
        btn.title = 'Eliminar médico';
        btn.innerHTML = '✖';
        btn.addEventListener('click', () => {
            if (confirm(`Eliminar "${m}"? Esto no eliminará citas existentes.`)) {
                medicos.splice(idx, 1);
                guardarMedicos();
                renderDoctorSelects();
                renderDoctorsList();
            }
        });
        li.appendChild(btn);
        listaMedicos.appendChild(li);
    });
}

formAddDoctor && formAddDoctor.addEventListener('submit', function(e) {
    e.preventDefault();
    const nombre = inputNewDoctor.value.trim();
    if (!nombre) return;
    if (medicos.includes(nombre)) {
        alert('El médico ya existe');
        return;
    }
    medicos.push(nombre);
    guardarMedicos();
    renderDoctorSelects();
    renderDoctorsList();
    inputNewDoctor.value = '';
});

function renderCitasTable() {
    if (!tablaCitasBody) return;
    const filtro = filterMedico ? filterMedico.value : '';
    tablaCitasBody.innerHTML = '';
    const lista = citas.slice().sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
    lista.forEach((cita, idx) => {
        if (filtro && cita.medico !== filtro) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cita.nombre}</td>
            <td>${cita.telefono}</td>
            <td>${cita.email}</td>
            <td>${cita.servicio}</td>
            <td>${cita.medico || ''}</td>
            <td>${cita.fecha}</td>
            <td>${cita.hora}</td>
            <td><button class="modal-button small" data-idx="${idx}">Eliminar</button></td>
        `;
        const btn = tr.querySelector('button');
        btn.addEventListener('click', function() {
            if (confirm('Eliminar esta cita?')) {
                const realIndex = citas.findIndex(x => x.id === cita.id);
                if (realIndex > -1) {
                    citas.splice(realIndex, 1);
                    guardarCitas();
                    renderCitasTable();
                    actualizarHorasDisponibles();
                }
            }
        });
        tablaCitasBody.appendChild(tr);
    });
}

function exportCitasCSV() {
    if (!citas || citas.length === 0) return alert('No hay citas para exportar');
    const headers = ['Paciente','Teléfono','Correo','Servicio','Médico','Fecha','Hora'];
    const rows = citas.map(c => [c.nombre, c.telefono, c.email, c.servicio, c.medico, c.fecha, c.hora]);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
        csv += r.map(field => `"${String(field || '').replace(/"/g,'""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const hoy = new Date().toISOString().split('T')[0];
    a.download = `citas-${hoy}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCitasCSV);

if (clearAllBtn) clearAllBtn.addEventListener('click', function() {
    if (!confirm('Eliminar todas las citas guardadas? Esta acción no puede deshacerse.')) return;
    citas = [];
    guardarCitas();
    renderCitasTable();
    actualizarHorasDisponibles();
});

if (filterMedico) filterMedico.addEventListener('change', renderCitasTable);

/* ======================= INICIALIZACIÓN EXTENDIDA ======================= */

function inicializarApp() {
    cargarMedicos();
    cargarCitas();
    renderDoctorSelects();
    renderDoctorsList();
    renderCitasTable();
    configurarRangoFechas();
    actualizarHorasDisponibles();
}

window.addEventListener('load', inicializarApp);

/* ======================= LOGIN ADMIN Y ÁREA PACIENTE ======================= */

const modalAdminLogin = document.getElementById('modalAdminLogin');
const closeAdminModal = document.getElementById('closeAdminModal');
const formAdminLogin = document.getElementById('formAdminLogin');
const adminPassInput = document.getElementById('adminPass');
const adminLogoutBtn = document.getElementById('adminLogout');
const adminNavLink = document.querySelector('a[href="#admin"]');

const formBuscarPaciente = document.getElementById('formBuscarPaciente');
const buscarEmailInput = document.getElementById('buscarEmail');
const resultadosPacienteDiv = document.getElementById('resultadosPaciente');
const listaCitasPaciente = document.getElementById('listaCitasPaciente');

const ADMIN_PASSWORD = 'admin123'; // cambiar si se desea

function openAdminModal() {
    if (!modalAdminLogin) return;
    modalAdminLogin.classList.add('show');
    setTimeout(() => adminPassInput && adminPassInput.focus(), 50);
}

function closeAdminLoginModal() {
    if (!modalAdminLogin) return;
    modalAdminLogin.classList.remove('show');
    if (adminPassInput) adminPassInput.value = '';
}

closeAdminModal && closeAdminModal.addEventListener('click', closeAdminLoginModal);

formAdminLogin && formAdminLogin.addEventListener('submit', function(e) {
    e.preventDefault();
    const pass = adminPassInput.value || '';
    if (pass === ADMIN_PASSWORD) {
        sessionStorage.setItem('isAdmin', '1');
        closeAdminLoginModal();
        showAdminSection();
        document.getElementById('admin').scrollIntoView({ behavior: 'smooth' });
    } else {
        adminPassInput.classList.add('error');
        setTimeout(() => adminPassInput.classList.remove('error'), 600);
        alert('Contraseña incorrecta');
    }
});

function showAdminSection() {
    const el = document.getElementById('admin');
    if (!el) return;
    el.classList.remove('hidden');
    renderCitasTable();
    renderDoctorSelects();
}

function hideAdminSection() {
    const el = document.getElementById('admin');
    if (!el) return;
    el.classList.add('hidden');
}

adminNavLink && adminNavLink.addEventListener('click', function(e) {
    e.preventDefault();
    if (sessionStorage.getItem('isAdmin')) {
        showAdminSection();
        document.getElementById('admin').scrollIntoView({ behavior: 'smooth' });
    } else {
        openAdminModal();
    }
});

adminLogoutBtn && adminLogoutBtn.addEventListener('click', function() {
    if (!confirm('Cerrar sesión de administrador?')) return;
    sessionStorage.removeItem('isAdmin');
    hideAdminSection();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Mostrar admin si ya hay sesión
if (sessionStorage.getItem('isAdmin')) {
    showAdminSection();
}

/* ======================= BÚSQUEDA PACIENTE */

formBuscarPaciente && formBuscarPaciente.addEventListener('submit', function(e) {
    e.preventDefault();
    const q = (buscarEmailInput.value || '').trim().toLowerCase();
    if (!q) {
        alert('Ingresa tu correo electrónico o teléfono para buscar tus citas.');
        return;
    }

    const resultados = citas.filter(c => {
        return (c.email && c.email.toLowerCase() === q) || (c.telefono && c.telefono.replace(/\D/g,'').includes(q.replace(/\D/g,'')));
    });

    listaCitasPaciente.innerHTML = '';
    if (resultados.length === 0) {
        listaCitasPaciente.innerHTML = '<p>No se encontraron citas para ese contacto.</p>';
    } else {
        resultados.sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
        resultados.forEach(r => {
            const div = document.createElement('div');
            div.style.padding = '12px';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
            div.innerHTML = `<strong>${r.servicio} con ${r.medico || ''}</strong><br>${r.fecha} · ${r.hora}<br>${r.nombre} · ${r.telefono}`;
            listaCitasPaciente.appendChild(div);
        });
    }

    resultadosPacienteDiv.style.display = 'block';
    resultadosPacienteDiv.scrollIntoView({ behavior: 'smooth' });
});




//////////////////////////////API_URL///////////////////////////////////


const API_URL = 'https://clinica-dental-gyyo.onrender.com/api';

// Cargar citas desde BD
async function cargarCitasDesdeBD() {
  const res = await fetch(`${API_URL}/citas`);
  citas = await res.json();
}

// Guardar cita en BD
async function guardarCitaEnBD(datos) {
  const res = await fetch(`${API_URL}/citas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  if (!res.ok) throw new Error('No se pudo guardar la cita');
  const out = await res.json();
  return out.id;
}