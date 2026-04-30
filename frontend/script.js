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
const linkUbicacion = document.getElementById('linkUbicacion');
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
const inputNewDoctorEspecialidad = document.getElementById('newDoctorEspecialidad');
const listaMedicos = document.getElementById('listaMedicos');
const formEditarCita = document.getElementById('formEditarCita');
const editNombre = document.getElementById('editNombre');
const editTelefono = document.getElementById('editTelefono');
const editFecha = document.getElementById('editFecha');
const editHora = document.getElementById('editHora');
const btnGuardarCitaAdmin = document.getElementById('btnGuardarCitaAdmin');
const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');

const formAddServicio = document.getElementById('formAddServicio');
const inputNewServicio = document.getElementById('newServicio');
const listaServicios = document.getElementById('listaServicios');

// UX visual
const toastContainer = document.getElementById('toastContainer');
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmModalCancel = document.getElementById('confirmModalCancel');
const confirmModalAccept = document.getElementById('confirmModalAccept');
const closeConfirmModal = document.getElementById('closeConfirmModal');

let medicos = [];
let servicios = [];
let citas = [];
let citaEditandoId = null;

/* ======================= UX: TOAST + MODAL CONFIRMACIÓN ======================= */

function showToast(message, type = 'success', timeout = 3200) {
    if (!toastContainer) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 220);
    }, timeout);
}

function confirmAction({ title = 'Confirmar acción', message = '¿Deseas continuar?' }) {
    return new Promise((resolve) => {
        if (!confirmModal) {
            resolve(window.confirm(message));
            return;
        }

        confirmModalTitle.textContent = title;
        confirmModalMessage.textContent = message;
        confirmModal.classList.add('show');

        const onAccept = () => cleanup(true);
        const onCancel = () => cleanup(false);

        function cleanup(result) {
            confirmModal.classList.remove('show');
            confirmModalAccept?.removeEventListener('click', onAccept);
            confirmModalCancel?.removeEventListener('click', onCancel);
            closeConfirmModal?.removeEventListener('click', onCancel);
            confirmModal?.removeEventListener('click', backdropHandler);
            resolve(result);
        }

        function backdropHandler(e) {
            if (e.target === confirmModal) onCancel();
        }

        confirmModalAccept?.addEventListener('click', onAccept);
        confirmModalCancel?.addEventListener('click', onCancel);
        closeConfirmModal?.addEventListener('click', onCancel);
        confirmModal?.addEventListener('click', backdropHandler);
    });
}

/* ======================= FUNCIONES API ======================= */

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, options);
    let payload = {};
    try {
        payload = await response.json();
    } catch {
        payload = {};
    }

    if (!response.ok) {
        const errMsg = payload?.error || `Error HTTP ${response.status}`;
        throw new Error(errMsg);
    }

    if (payload?.ok === false) {
        throw new Error(payload?.error || 'Error en respuesta del servidor');
    }

    return payload?.data !== undefined ? payload.data : payload;
}

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
function obtenerHorariosDisponibles(fecha, opciones = {}) {
    const { excluirCitaId = null, incluirHora = null } = opciones;
    const horariosBase = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    // Combina horarios ocupados predefinidos con citas from database
    const ocupados = new Set();
    if (horariosOcupados[fecha]) {
        horariosOcupados[fecha].forEach(h => ocupados.add(h));
    }

    citas.forEach(c => {
        if (!c || !c.fecha || !c.hora) return;
        if (String(c.id) === String(excluirCitaId)) return;
        if (c.fecha === fecha) ocupados.add(c.hora);
    });

    const disponibles = horariosBase.filter(hora => !ocupados.has(hora));

    if (incluirHora && !disponibles.includes(incluirHora) && horariosBase.includes(incluirHora)) {
        disponibles.push(incluirHora);
        disponibles.sort();
    }

    return disponibles;
}

function esHoraPasada(fecha, hora) {
    if (!fecha || !hora) return false;
    const ahora = new Date();
    const fechaHora = new Date(`${fecha}T${hora}:00`);
    return fechaHora.getTime() < ahora.getTime();
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

    if (esHoraPasada(fecha, valor)) {
        grupo.classList.add('error');
        error.textContent = 'No puedes seleccionar una hora pasada';
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
        const backendData = await apiRequest('/citas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (backendData.waMode === 'wa_me' && backendData.waLink) {
            window.open(backendData.waLink, '_blank');
        }

        const datosCompletos = { ...datos, id: backendData.id, waLink: backendData.waLink || null };
        mostrarModalExito(datosCompletos);
        formularioCita.reset();
        await cargarCitasDesdeBD();
        showToast('Cita guardada correctamente', 'success');
    } catch (error) {
        console.error("ERROR:", error);
        showToast(error.message || 'Error guardando cita', 'error');
    }
}

function mostrarModalExito(datos) {
    const fechaFormato = new Date(datos.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const botonWhatsApp = datos.waLink
        ? `<br><a href="${datos.waLink}" target="_blank" class="modal-button">Enviar por WhatsApp</a>`
        : '';

    mensajeConfirmacion.innerHTML = `
        <strong>¡Cita confirmada con éxito!</strong><br><br>
        <strong>Datos de tu cita:</strong><br>
        Paciente: ${datos.nombre}<br>
        Servicio: ${datos.servicio}<br>
        Fecha: ${fechaFormato}<br>
        Hora: ${datos.hora}<br><br>
        Nos pondremos en contacto al ${datos.telefono} para confirmar.<br>
        <em>¡Gracias por confiar en nosotros!</em>
        ${botonWhatsApp}
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

const UBICACION_MAPS_URL = "https://www.google.com/maps/place/Centro+Odontol%C3%B3gico+Dr.+Miguel+M%C3%A9ndez/@18.4507466,-69.3084637,19.75z/data=!4m6!3m5!1s0x8eaf608c49b1027b:0xb2ee10c64bfa8785!8m2!3d18.450905!4d-69.3088157!16s%2Fg%2F11c6cz4gzf?entry=ttu&g_ep=EgoyMDI2MDQyNi4wIKXMDSoASAFQAw%3D%3D";

if (linkUbicacion) {
    linkUbicacion.addEventListener('click', function(e) {
        e.preventDefault();
        window.open(UBICACION_MAPS_URL, '_blank');
    });
}

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
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
};

const revealCards = document.querySelectorAll('.servicio-card.reveal');

if ('IntersectionObserver' in window && revealCards.length) {
    const observer = new IntersectionObserver(function(entries, obs) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealCards.forEach(card => {
        observer.observe(card);
    });
}

if (typeof Swiper !== 'undefined') {
    new Swiper('.servicios-slider', {
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 1,
        loop: true,
        speed: 480,
        spaceBetween: 20,
        coverflowEffect: {
            rotate: 0,
            stretch: 0,
            depth: 120,
            modifier: 1.25,
            slideShadows: false
        },
        pagination: {
            el: '.servicios-swiper-pagination',
            clickable: true
        },
        navigation: {
            nextEl: '.servicios-swiper-next',
            prevEl: '.servicios-swiper-prev'
        },
        breakpoints: {
            640: {
                slidesPerView: 1.2,
                spaceBetween: 18
            },
            768: {
                slidesPerView: 2,
                spaceBetween: 20
            },
            1024: {
                slidesPerView: 3,
                spaceBetween: 26
            }
        }
    });
}

/* ======================= INICIALIZACIÓN ======================= */

window.addEventListener('load', function() {
    configurarRangoFechas();
    actualizarHorasDisponibles();

    const elementos = document.querySelectorAll('.hero-content, .servicios-slider');
    elementos.forEach(elemento => {
        elemento.style.animation = 'fadeIn 0.8s ease-out';
    });
});

/* ======================= VALIDACIÓN AL CARGAR LA PÁGINA ======================= */

window.addEventListener('DOMContentLoaded', function() {
    const camposRequeridos = formularioCita.querySelectorAll('[required]');
    console.log(`Formulario cargado con ${camposRequeridos.length} campos requeridos`);
    console.log('Horarios ocupados de prueba:', horariosOcupados);
});

/* ======================= ACCESIBILIDAD ======================= */

formularioCita.querySelectorAll('input, select').forEach((campo, index, campos) => {
    campo.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this === campos[campos.length - 1]) {
            formularioCita.dispatchEvent(new Event('submit'));
        }
    });
});

/* ======================= CARGAR CITAS DESDE BASE DE DATOS ======================= */
async function cargarCitasDesdeBD() {
    try {
        citas = await apiRequest('/citas');
        renderCitasTable();
        actualizarHorasDisponibles();
    } catch (error) {
        console.error('Error cargando citas desde BD:', error);
        citas = [];
        showToast('Error cargando citas', 'error');
    }
}

/* ======================= MÓDULO MÉDICOS (SOLO BACKEND) ======================= */

function mapMedicosBackendToUI(lista) {
    return (lista || []).map((m) => ({
        id: Number(m.id),
        nombre: String(m.nombre || '').trim(),
        especialidad: m.especialidad ? String(m.especialidad).trim() : ''
    }));
}

async function cargarMedicos() {
    try {
        const data = await apiRequest('/medicos');
        medicos = mapMedicosBackendToUI(Array.isArray(data) ? data : []);
        renderDoctorSelects();
        renderDoctorsList();
    } catch (error) {
        console.error('Error cargando médicos desde API:', error);
        medicos = [];
        renderDoctorSelects();
        renderDoctorsList();
        showToast(error.message || 'No se pudieron cargar los médicos', 'error');
    }
}

function renderDoctorSelects() {
    inputMedico.innerHTML = '<option value="">Selecciona un médico</option>';
    medicos.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.nombre; // requerido para compatibilidad backend de citas
        opt.textContent = m.especialidad ? `${m.nombre} — ${m.especialidad}` : m.nombre;
        inputMedico.appendChild(opt);
    });

    if (filterMedico) {
        const seleccionado = filterMedico.value;
        filterMedico.innerHTML = '<option value="">Todos los médicos</option>';
        medicos.forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m.nombre;
            opt.textContent = m.especialidad ? `${m.nombre} — ${m.especialidad}` : m.nombre;
            filterMedico.appendChild(opt);
        });
        if ([...filterMedico.options].some(o => o.value === seleccionado)) {
            filterMedico.value = seleccionado;
        }
    }
}

function createDoctorViewItem(medico) {
    const li = document.createElement('li');
    li.className = 'doctor-item';

    const info = document.createElement('div');
    info.className = 'doctor-main-info';

    const name = document.createElement('strong');
    name.textContent = medico.nombre;

    const spec = document.createElement('span');
    spec.className = 'doctor-specialty';
    spec.textContent = medico.especialidad || 'Sin especialidad';

    info.appendChild(name);
    info.appendChild(spec);

    const actions = document.createElement('div');
    actions.className = 'doctor-actions';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'modal-button small';
    btnEdit.textContent = 'Editar';
    btnEdit.addEventListener('click', () => enableDoctorInlineEdit(li, medico));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'modal-button small danger';
    btnDelete.textContent = 'Eliminar';
    btnDelete.addEventListener('click', async () => {
        const okDelete = await confirmAction({
            title: 'Eliminar médico',
            message: `¿Deseas eliminar a "${medico.nombre}"?`
        });
        if (!okDelete) return;

        try {
            await apiRequest(`/medicos/${medico.id}`, { method: 'DELETE' });
            await cargarMedicos();
            showToast('Médico eliminado correctamente', 'success');
        } catch (error) {
            console.error('Error eliminando médico:', error);
            showToast(error.message || 'No se pudo eliminar el médico', 'error');
        }
    });

    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);

    li.appendChild(info);
    li.appendChild(actions);

    return li;
}

function enableDoctorInlineEdit(container, medico) {
    container.innerHTML = '';
    container.classList.add('editing');

    const editWrap = document.createElement('div');
    editWrap.className = 'doctor-inline-edit';

    const inputNombreEdit = document.createElement('input');
    inputNombreEdit.type = 'text';
    inputNombreEdit.value = medico.nombre;
    inputNombreEdit.placeholder = 'Nombre';

    const inputEspecialidadEdit = document.createElement('input');
    inputEspecialidadEdit.type = 'text';
    inputEspecialidadEdit.value = medico.especialidad || '';
    inputEspecialidadEdit.placeholder = 'Especialidad';

    const actions = document.createElement('div');
    actions.className = 'doctor-actions';

    const btnSave = document.createElement('button');
    btnSave.className = 'modal-button small';
    btnSave.textContent = 'Guardar';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-button small';
    btnCancel.textContent = 'Cancelar';

    btnSave.addEventListener('click', async () => {
        const nombre = inputNombreEdit.value.trim();
        const especialidad = inputEspecialidadEdit.value.trim();

        if (!nombre) {
            showToast('El nombre del médico es obligatorio', 'error');
            return;
        }

        const duplicado = medicos.some((m) => m.id !== medico.id && m.nombre.toLowerCase() === nombre.toLowerCase());
        if (duplicado) {
            showToast('Ya existe otro médico con ese nombre', 'error');
            return;
        }

        try {
            await apiRequest(`/medicos/${medico.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, especialidad: especialidad || null })
            });

            await cargarMedicos();
            showToast('Médico actualizado correctamente', 'success');
        } catch (error) {
            console.error('Error actualizando médico:', error);
            showToast(error.message || 'No se pudo actualizar el médico', 'error');
        }
    });

    btnCancel.addEventListener('click', () => {
        renderDoctorsList();
    });

    actions.appendChild(btnSave);
    actions.appendChild(btnCancel);

    editWrap.appendChild(inputNombreEdit);
    editWrap.appendChild(inputEspecialidadEdit);
    editWrap.appendChild(actions);

    container.appendChild(editWrap);
}

function renderDoctorsList() {
    if (!listaMedicos) return;
    listaMedicos.innerHTML = '';

    if (!medicos.length) {
        const empty = document.createElement('li');
        empty.className = 'doctor-item-empty';
        empty.textContent = 'No hay médicos registrados.';
        listaMedicos.appendChild(empty);
        return;
    }

    medicos.forEach((m) => {
        listaMedicos.appendChild(createDoctorViewItem(m));
    });
}

async function guardarMedico() {
    const nombre = (inputNewDoctor?.value || '').trim();
    const especialidad = (inputNewDoctorEspecialidad?.value || '').trim();

    if (!nombre) {
        showToast('Debes ingresar el nombre del médico', 'error');
        return;
    }

    const existe = medicos.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) {
        showToast('El médico ya existe', 'error');
        return;
    }

    await apiRequest('/medicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, especialidad: especialidad || null })
    });

    await cargarMedicos();
    inputNewDoctor.value = '';
    if (inputNewDoctorEspecialidad) inputNewDoctorEspecialidad.value = '';
    showToast('Médico agregado correctamente', 'success');
}

formAddDoctor && formAddDoctor.addEventListener('submit', async function(e) {
    e.preventDefault();
    try {
        await guardarMedico();
    } catch (error) {
        console.error('Error guardando médico:', error);
        showToast(error.message || 'No se pudo guardar el médico', 'error');
    }
});

/* ======================= MÓDULO SERVICIOS (SOLO BACKEND) ======================= */

function mapServiciosBackendToUI(lista) {
    return (lista || []).map((s) => ({
        id: Number(s.id),
        nombre: String(s.nombre || '').trim()
    }));
}

async function cargarServicios() {
    try {
        const data = await apiRequest('/servicios');
        servicios = mapServiciosBackendToUI(Array.isArray(data) ? data : []);
        renderServiciosSelect();
        renderServiciosList();
    } catch (error) {
        console.error('Error cargando servicios desde API:', error);
        servicios = [];
        renderServiciosSelect();
        renderServiciosList();
        showToast(error.message || 'No se pudieron cargar los servicios', 'error');
    }
}

function renderServiciosSelect() {
    if (!inputServicio) return;
    const seleccionado = inputServicio.value;
    inputServicio.innerHTML = '<option value="">Selecciona un servicio</option>';

    servicios.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.nombre;
        opt.textContent = s.nombre;
        inputServicio.appendChild(opt);
    });

    if ([...inputServicio.options].some((o) => o.value === seleccionado)) {
        inputServicio.value = seleccionado;
    }
}

function createServicioViewItem(servicio) {
    const li = document.createElement('li');
    li.className = 'doctor-item';

    const info = document.createElement('div');
    info.className = 'doctor-main-info';

    const name = document.createElement('strong');
    name.textContent = servicio.nombre;
    info.appendChild(name);

    const actions = document.createElement('div');
    actions.className = 'doctor-actions';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'modal-button small';
    btnEdit.textContent = 'Editar';
    btnEdit.addEventListener('click', () => enableServicioInlineEdit(li, servicio));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'modal-button small danger';
    btnDelete.textContent = 'Eliminar';
    btnDelete.addEventListener('click', async () => {
        const okDelete = await confirmAction({
            title: 'Eliminar servicio',
            message: `¿Deseas eliminar "${servicio.nombre}"?`
        });
        if (!okDelete) return;

        try {
            await apiRequest(`/servicios/${servicio.id}`, { method: 'DELETE' });
            await cargarServicios();
            showToast('Servicio eliminado correctamente', 'success');
        } catch (error) {
            console.error('Error eliminando servicio:', error);
            showToast(error.message || 'No se pudo eliminar el servicio', 'error');
        }
    });

    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);

    li.appendChild(info);
    li.appendChild(actions);

    return li;
}

function enableServicioInlineEdit(container, servicio) {
    container.innerHTML = '';
    container.classList.add('editing');

    const editWrap = document.createElement('div');
    editWrap.className = 'doctor-inline-edit';

    const inputNombreEdit = document.createElement('input');
    inputNombreEdit.type = 'text';
    inputNombreEdit.value = servicio.nombre;
    inputNombreEdit.placeholder = 'Nombre del servicio';

    const actions = document.createElement('div');
    actions.className = 'doctor-actions';

    const btnSave = document.createElement('button');
    btnSave.className = 'modal-button small';
    btnSave.textContent = 'Guardar';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-button small';
    btnCancel.textContent = 'Cancelar';

    btnSave.addEventListener('click', async () => {
        const nombre = inputNombreEdit.value.trim();

        if (!nombre) {
            showToast('El nombre del servicio es obligatorio', 'error');
            return;
        }

        const duplicado = servicios.some((s) => s.id !== servicio.id && s.nombre.toLowerCase() === nombre.toLowerCase());
        if (duplicado) {
            showToast('Ya existe otro servicio con ese nombre', 'error');
            return;
        }

        try {
            await apiRequest(`/servicios/${servicio.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre })
            });

            await cargarServicios();
            showToast('Servicio actualizado correctamente', 'success');
        } catch (error) {
            console.error('Error actualizando servicio:', error);
            showToast(error.message || 'No se pudo actualizar el servicio', 'error');
        }
    });

    btnCancel.addEventListener('click', () => {
        renderServiciosList();
    });

    actions.appendChild(btnSave);
    actions.appendChild(btnCancel);

    editWrap.appendChild(inputNombreEdit);
    editWrap.appendChild(actions);

    container.appendChild(editWrap);
}

function renderServiciosList() {
    if (!listaServicios) return;
    listaServicios.innerHTML = '';

    if (!servicios.length) {
        const empty = document.createElement('li');
        empty.className = 'doctor-item-empty';
        empty.textContent = 'No hay servicios registrados.';
        listaServicios.appendChild(empty);
        return;
    }

    servicios.forEach((s) => {
        listaServicios.appendChild(createServicioViewItem(s));
    });
}

async function guardarServicio() {
    const nombre = (inputNewServicio?.value || '').trim();

    if (!nombre) {
        showToast('Debes ingresar el nombre del servicio', 'error');
        return;
    }

    const existe = servicios.some((s) => s.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) {
        showToast('El servicio ya existe', 'error');
        return;
    }

    await apiRequest('/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
    });

    await cargarServicios();
    inputNewServicio.value = '';
    showToast('Servicio agregado correctamente', 'success');
}

formAddServicio && formAddServicio.addEventListener('submit', async function(e) {
    e.preventDefault();
    try {
        await guardarServicio();
    } catch (error) {
        console.error('Error guardando servicio:', error);
        showToast(error.message || 'No se pudo guardar el servicio', 'error');
    }
});

/* ======================= ADMIN CITAS ======================= */

function resetFormularioEdicionAdmin() {
    if (!formEditarCita) return;
    formEditarCita.reset();
    citaEditandoId = null;
    if (btnGuardarCitaAdmin) btnGuardarCitaAdmin.textContent = 'Guardar cita';
    if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'none';
}

function renderHorasEdicion(cita = null) {
    if (!editHora || !editFecha) return;
    const fechaSeleccionada = editFecha.value;
    if (!fechaSeleccionada) {
        editHora.innerHTML = '';
        return;
    }

    const excluirCitaId = cita ? cita.id : citaEditandoId;
    const horaOriginal = cita ? cita.hora : editHora.value;
    const horarios = obtenerHorariosDisponibles(fechaSeleccionada, {
        excluirCitaId,
        incluirHora: horaOriginal || null
    });

    const horaActual = editHora.value || horaOriginal || '';
    let html = '';
    horarios.forEach(h => {
        const selected = h === horaActual ? 'selected' : '';
        html += `<option value="${h}" ${selected}>${h}</option>`;
    });

    if (!html && horaActual) {
        html = `<option value="${horaActual}" selected>${horaActual}</option>`;
    }

    editHora.innerHTML = html;
}

function editarCita(cita) {
    if (!formEditarCita || !cita) return;
    citaEditandoId = cita.id;
    editNombre.value = cita.nombre || '';
    editTelefono.value = cita.telefono || '';
    editFecha.value = cita.fecha || '';
    renderHorasEdicion(cita);
    if (cita.hora && editHora) editHora.value = cita.hora;
    if (btnGuardarCitaAdmin) btnGuardarCitaAdmin.textContent = 'Guardar cambios';
    if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'inline-block';
    formEditarCita.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function actualizarCita(id) {
    const payload = {
        nombre: editNombre.value.trim(),
        telefono: editTelefono.value.trim(),
        fecha: editFecha.value,
        hora: editHora.value
    };

    if (!payload.nombre || !payload.telefono || !payload.fecha || !payload.hora) {
        showToast('Completa nombre, teléfono, fecha y hora para editar la cita.', 'error');
        return;
    }

    if (esHoraPasada(payload.fecha, payload.hora)) {
        const citaActual = citas.find(c => String(c.id) === String(id));
        const mantieneHoraOriginal = citaActual?.hora === payload.hora && citaActual?.fecha === payload.fecha;
        if (!mantieneHoraOriginal) {
            showToast('No puedes asignar una hora pasada al editar una cita.', 'error');
            return;
        }
    }

    try {
        const body = await apiRequest(`/citas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (body.waMode === 'wa_me' && body.waLink) {
            window.open(body.waLink, '_blank');
        }

        resetFormularioEdicionAdmin();
        await cargarCitasDesdeBD();
        showToast('Cita actualizada correctamente', 'success');
    } catch (error) {
        console.error('Error actualizando cita:', error);
        showToast(error.message || 'Error actualizando cita', 'error');
    }
}

function renderCitasTable() {
    if (!tablaCitasBody) return;
    const filtro = filterMedico ? filterMedico.value : '';
    tablaCitasBody.innerHTML = '';
    const lista = citas.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

    lista.forEach((cita) => {
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
            <td>
                <button class="modal-button small btn-editar">Editar</button>
                <button class="modal-button small btn-eliminar">Eliminar</button>
            </td>
        `;

        const btnEditar = tr.querySelector('.btn-editar');
        const btnEliminar = tr.querySelector('.btn-eliminar');

        btnEditar.addEventListener('click', function() {
            editarCita(cita);
        });

        btnEliminar.addEventListener('click', async function() {
            const okDelete = await confirmAction({
                title: 'Eliminar cita',
                message: `¿Deseas eliminar la cita de "${cita.nombre}"?`
            });
            if (!okDelete) return;

            try {
                await apiRequest(`/citas/${cita.id}`, { method: 'DELETE' });
                if (String(citaEditandoId) === String(cita.id)) resetFormularioEdicionAdmin();
                await cargarCitasDesdeBD();
                showToast('Cita eliminada correctamente', 'success');
            } catch (error) {
                console.error(error);
                showToast(error.message || 'Error eliminando cita', 'error');
            }
        });

        tablaCitasBody.appendChild(tr);
    });
}

async function exportCitasCSV() {
    try {
        const response = await fetch(`${API_URL}/reporte`, { method: 'GET' });
        if (!response.ok) throw new Error(`Error descargando reporte: ${response.status}`);

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition') || '';
        let fileName = 'reporte.xlsx';
        const fileNameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)["']?/i);
        if (fileNameMatch && fileNameMatch[1]) {
            fileName = decodeURIComponent(fileNameMatch[1].trim());
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showToast('Reporte descargado correctamente', 'success');
    } catch (error) {
        console.error('Error exportando reporte:', error);
        showToast('No se pudo descargar el reporte. Intenta de nuevo.', 'error');
    }
}

if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCitasCSV);

if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async function() {
        const okDelete = await confirmAction({
            title: 'Eliminar todas las citas',
            message: 'Esta acción no puede deshacerse. ¿Deseas continuar?'
        });
        if (!okDelete) return;

        try {
            const lista = await apiRequest('/citas');
            for (let c of lista) {
                await apiRequest(`/citas/${c.id}`, { method: 'DELETE' });
            }
            await cargarCitasDesdeBD();
            showToast('Todas las citas fueron eliminadas', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error eliminando citas', 'error');
        }
    });
}

if (filterMedico) filterMedico.addEventListener('change', renderCitasTable);

if (formEditarCita) {
    formEditarCita.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (citaEditandoId == null) {
            showToast('Selecciona una cita con el botón "Editar" antes de guardar cambios.', 'error');
            return;
        }

        await actualizarCita(citaEditandoId);
    });
}

if (btnCancelarEdicion) {
    btnCancelarEdicion.addEventListener('click', function() {
        resetFormularioEdicionAdmin();
    });
}

if (editFecha) {
    editFecha.addEventListener('change', function() {
        renderHorasEdicion();
    });
}

/* ======================= INICIALIZACIÓN EXTENDIDA ======================= */

async function inicializarApp() {
    await cargarMedicos();
    await cargarServicios();
    await cargarCitasDesdeBD();
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

const ADMIN_PASSWORD = 'admin123';

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
        showToast('Sesión de administrador iniciada', 'success');
    } else {
        adminPassInput.classList.add('error');
        setTimeout(() => adminPassInput.classList.remove('error'), 600);
        showToast('Contraseña incorrecta', 'error');
    }
});

function showAdminSection() {
    const el = document.getElementById('admin');
    if (!el) return;
    el.classList.remove('hidden');
    renderCitasTable();
    renderDoctorSelects();
    renderDoctorsList();
    renderServiciosList();
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

adminLogoutBtn && adminLogoutBtn.addEventListener('click', async function() {
    const okLogout = await confirmAction({
        title: 'Cerrar sesión',
        message: '¿Deseas cerrar sesión de administrador?'
    });
    if (!okLogout) return;

    sessionStorage.removeItem('isAdmin');
    hideAdminSection();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Sesión cerrada', 'success');
});

if (sessionStorage.getItem('isAdmin')) {
    showAdminSection();
}

/* ======================= BÚSQUEDA PACIENTE ======================= */

formBuscarPaciente && formBuscarPaciente.addEventListener('submit', function(e) {
    e.preventDefault();
    const q = (buscarEmailInput.value || '').trim().toLowerCase();
    if (!q) {
        showToast('Ingresa tu correo electrónico o teléfono para buscar tus citas.', 'error');
        return;
    }

    const resultados = citas.filter(c => {
        return (c.email && c.email.toLowerCase() === q) ||
            (c.telefono && c.telefono.replace(/\D/g, '').includes(q.replace(/\D/g, '')));
    });

    listaCitasPaciente.innerHTML = '';
    if (resultados.length === 0) {
        listaCitasPaciente.innerHTML = '<p>No se encontraron citas para ese contacto.</p>';
    } else {
        resultados
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
            .forEach(r => {
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
