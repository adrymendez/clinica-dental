# TODO - Producción Pro (Cloud API + Tracking + Admin)

- [ ] Backend `server.js`
  - [ ] Validar configuración crítica al iniciar (`WHATSAPP_MODE`, token, phone number id).
  - [ ] Unificar logs profesionales:
    - [ ] `[WA][SEND]`
    - [ ] `[WA][ERROR]`
    - [ ] `[WA][WEBHOOK]`
    - [ ] `[WA][REMINDER]`
  - [ ] Soporte templates WhatsApp:
    - [ ] `enviarTemplateConfirmacion(cita)`
    - [ ] `enviarTemplateRecordatorio(cita)`
    - [ ] fallback a texto normal.
  - [ ] Tracking en respuestas y DB:
    - [ ] guardar `whatsapp_message_id`
    - [ ] guardar `whatsapp_status`
    - [ ] guardar `whatsapp_error` cuando aplique.
  - [ ] Webhook inteligente:
    - [ ] procesar `messages` entrantes
    - [ ] procesar `statuses` (`sent`, `delivered`, `read`, `failed`)
    - [ ] actualizar estado por `message_id`.
  - [ ] Endpoint admin de reenvío:
    - [ ] `POST /api/citas/:id/reenviar-whatsapp`
  - [ ] Manejo errores Meta:
    - [ ] `131047` número no permitido
    - [ ] `100` token inválido

- [ ] Base de datos
  - [ ] `ALTER TABLE citas ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT`
  - [ ] `ALTER TABLE citas ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'pendiente'`
  - [ ] `ALTER TABLE citas ADD COLUMN IF NOT EXISTS whatsapp_error TEXT`

- [ ] Frontend `index.html`
  - [ ] Extender tabla admin con columnas:
    - [ ] estado WhatsApp
    - [ ] message_id
  - [ ] Agregar acción: `Reenviar WhatsApp`

- [ ] Frontend `script.js`
  - [ ] Renderizar status y message_id por cita
  - [ ] Botón `Reenviar WhatsApp` por fila (fetch endpoint admin)
  - [ ] Mantener compatibilidad wa.me sin romper editar/eliminar

- [ ] Pruebas completas
  - [ ] API happy/error/edge (incluyendo reenvío y webhook inteligente)
  - [ ] Scheduler robusto (citas sin teléfono, omitidas con log)
  - [ ] UI admin (estado + reenvío + regresión completa)
