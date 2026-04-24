# TODO - Actualizar botón Exportar para documento backend

- [x] Revisar implementación actual de exportación en `frontend/script.js`.
- [x] Confirmar endpoint nuevo de documento en backend (`GET /api/reporte`).
- [x] Reemplazar exportación CSV local por descarga binaria desde backend:
  - [x] Consumir `${API_URL}/reporte`.
  - [x] Leer respuesta con `response.blob()`.
  - [x] Extraer `filename` desde `Content-Disposition`.
  - [x] Aplicar fallback a `reporte.xlsx` si no hay header.
  - [x] Descargar con `URL.createObjectURL(blob)` + `<a>` dinámico.
  - [x] Manejar errores con `console.error` + `alert`.
- [x] Validar que el botón con id `exportCsv` mantenga su listener.
- [x] Marcar tareas completadas y entregar cambios finales.
