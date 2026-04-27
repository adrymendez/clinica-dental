# TODO - Implementar edición de citas (Admin)

- [ ] Crear endpoint `PUT /api/citas/:id` en `backend/server.js`.
- [ ] Agregar formulario de edición en panel admin (`frontend/index.html`) con campos:
  - [ ] nombre
  - [ ] telefono
  - [ ] fecha
  - [ ] hora
  - [ ] botón dinámico ("Guardar cita" / "Guardar cambios")
- [ ] Actualizar `frontend/script.js`:
  - [ ] Crear variable global `citaEditandoId`.
  - [ ] Agregar botón `Editar` en cada fila de la tabla.
  - [ ] Implementar función `editarCita(cita)`.
  - [ ] Implementar función `actualizarCita(id)` con `fetch` `PUT`.
  - [ ] Reutilizar formulario para crear/editar y refrescar lista sin recargar página.
- [ ] Ajustar validación de hora:
  - [ ] Bloquear horas pasadas al crear cita.
  - [ ] Permitir hora original en modo edición aunque ya haya pasado.
- [ ] Realizar pruebas básicas del flujo editar (backend + frontend).
