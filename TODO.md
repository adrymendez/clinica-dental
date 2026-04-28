# TODO - Refactorización completa clínica dental

## 1) Backend (server.js)
- [x] Unificar respuestas JSON a formato `{ ok: true, data }` y `{ ok: false, error }` en endpoints CRUD de médicos y citas.
- [x] Implementar `PUT /api/medicos/:id` con:
  - [x] validación de ID entero positivo
  - [x] validación de nombre no vacío
  - [x] validación y normalización de especialidad
  - [x] control de duplicados case-insensitive + trim
  - [x] retorno del médico actualizado
- [x] Mejorar validaciones en `POST /api/medicos`, `POST /api/citas`, `PUT /api/citas/:id`.
- [x] Asegurar init DB:
  - [x] tabla `medicos`
  - [x] tabla `citas`
  - [x] índice único `idx_medicos_nombre_unique` sobre `LOWER(TRIM(nombre))`.

## 2) SQL
- [x] Crear archivo SQL con script de creación/verificación de tablas e índice único.

## 3) Frontend JS (script.js)
- [ ] Eliminar completamente `MEDICOS_FALLBACK` y cualquier fallback/localStorage de médicos.
- [ ] Cargar médicos exclusivamente desde `/api/medicos`.
- [ ] Completar CRUD médicos desde admin:
  - [ ] crear (POST)
  - [ ] editar (PUT)
  - [ ] eliminar (DELETE)
- [ ] UI de edición de médicos (nombre + especialidad) en lista admin.
- [ ] Reemplazar `alert()` por mensajes visuales de feedback.
- [ ] Mantener edición de citas y asegurar refresco automático de datos.

## 4) Frontend HTML (index.html)
- [ ] Mejorar panel admin de médicos (inputs y acciones editar/eliminar con especialidad).
- [ ] Agregar sección de ubicación con iframe de Google Maps.
- [ ] Agregar redes sociales (WhatsApp, Instagram, Facebook).
- [ ] Mejorar footer profesional (dirección, teléfono, redes, copyright).

## 5) Frontend CSS (styles.css)
- [ ] Agregar estilos para:
  - [ ] mapa responsive
  - [ ] iconos/redes con hover
  - [ ] feedback visual éxito/error
  - [ ] panel admin mejorado de médicos
- [ ] Mantener estilo base y paleta actual.

## 6) Verificación final
- [ ] Revisar consistencia de nombres de campos frontend/backend.
- [ ] Revisar funcionamiento de médicos dinámicos en:
  - [ ] select del formulario
  - [ ] filtro admin
  - [ ] lista admin
- [ ] Confirmar ausencia total de médicos hardcodeados.
