# TODO - Sincronización de Médicos (PostgreSQL + Render)

- [ ] Fase 1 — Backend `backend/server.js`
  - [ ] Crear tabla `medicos` en `initDatabase`:
    - [ ] `id SERIAL PRIMARY KEY`
    - [ ] `nombre TEXT NOT NULL`
    - [ ] `especialidad TEXT`
  - [ ] Agregar endpoint `GET /api/medicos` leyendo PostgreSQL (`ORDER BY id DESC`)
  - [ ] Agregar endpoint `POST /api/medicos` para alta desde admin
  - [ ] Validación manual endpoint desplegado Render:
    - [ ] `https://clinica-dental-gyyo.onrender.com/api/medicos`

- [ ] Fase 2 — Frontend `frontend/script.js` (híbrido temporal con fallback)
  - [ ] Reemplazar `cargarMedicos()` para priorizar API de Render
  - [ ] Agregar `console.log(data)` de diagnóstico en carga de médicos
  - [ ] Crear/ajustar render dinámico de médicos desde backend en:
    - [ ] select de formulario (`#medico`)
    - [ ] filtro admin (`#filterMedico`)
    - [ ] listado admin (`#listaMedicos`)
  - [ ] Mantener fallback temporal local únicamente si API falla o vacía

- [ ] Fase 3 — Admin sincronizado
  - [ ] Cambiar submit de `formAddDoctor` para usar `POST /api/medicos`
  - [ ] Después de guardar médico ejecutar recarga:
    - [ ] `await guardarMedico();`
    - [ ] `await cargarMedicos();`
  - [ ] Verificar que admin y pacientes ven la misma lista tras alta

- [ ] Fase 4 — Migración final sin hardcodeo/localStorage
  - [ ] Eliminar arrays hardcodeados de médicos
  - [ ] Eliminar uso persistente de `localStorage` para médicos
  - [ ] Dejar médicos únicamente en PostgreSQL vía backend Render

- [ ] Diagnóstico obligatorio
  - [ ] Confirmar que frontend NO apunta a localhost
  - [ ] Confirmar que backend activo es Render
  - [ ] Confirmar que no hay endpoint alterno para médicos en el proyecto
