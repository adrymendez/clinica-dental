# TODO - Servicios dinámicos (CRUD completo)

- [x] Confirmar plan con el usuario
- [ ] Backend: crear tabla `servicios` + índice único case-insensitive
- [ ] Backend: implementar endpoints `/api/servicios` (GET, POST, PUT, DELETE)
- [ ] Frontend HTML: quitar servicios hardcodeados del `<select id="servicio">`
- [ ] Frontend HTML: agregar sección admin de servicios (`formAddServicio`, `newServicio`, `listaServicios`)
- [ ] Frontend JS: agregar estado global y funciones `cargarServicios`, `renderServiciosSelect`, `renderServiciosList`
- [ ] Frontend JS: implementar crear/editar/eliminar servicios con recarga automática `await cargarServicios()`
- [ ] Frontend JS: evitar duplicados y mostrar mensajes visuales (sin `alert()`)
- [ ] Inicialización: cargar servicios al arrancar app
- [ ] Revisión final de consistencia
