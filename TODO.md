# TODO - Hardening Producción (Validación + WhatsApp + Recordatorios)

- [ ] Backend `server.js`
  - [ ] Endurecer `normalizarTelefonoDO(telefono)`:
    - [ ] aceptar formatos locales/internacionales.
    - [ ] guardar SIEMPRE `+1809XXXXXXX`.
    - [ ] retornar `400` si inválido.
  - [ ] Usar teléfono normalizado en `POST /api/citas`.
  - [ ] Usar teléfono normalizado en `PUT /api/citas/:id`.
  - [ ] Mantener `WHATSAPP_MODE=wa_me|cloud`.
  - [ ] Ajustar `buildWhatsAppLink(telefono, mensaje)`.
  - [ ] En wa.me log obligatorio: `Modo wa.me requiere envío manual`.
  - [ ] Mantener cloud con `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`.
  - [ ] Mensajes dinámicos:
    - [ ] `generarMensajeConfirmacion(cita)`
    - [ ] `generarMensajeActualizacion(cita)`
    - [ ] `generarMensajeRecordatorio(cita)`
    - [ ] usar tel secretaria `8095298188`.
  - [ ] Recordatorios robustos:
    - [ ] ventana 55–65 min.
    - [ ] parseo seguro fecha/hora TEXT.
    - [ ] evitar duplicados con `recordatorio_enviado`.

- [ ] Base de datos
  - [ ] Mantener compatibilidad actual.
  - [ ] Dejar nota de futura migración a `DATE/TIME`.

- [ ] Frontend `script.js`
  - [ ] Botón “WhatsApp” en tabla admin.
  - [ ] Abrir wa.me con mensaje prellenado.
  - [ ] No romper Editar / Eliminar.

- [ ] Pruebas
  - [ ] Backend (happy/error/edge) con curl.
  - [ ] UI (tabla admin + WhatsApp + regresión).
  - [ ] Corregir ejemplos curl para Windows CMD.
