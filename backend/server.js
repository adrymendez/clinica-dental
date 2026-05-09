import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import ExcelJS from 'exceljs';

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida. El backend no puede iniciar sin DB persistente.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

const WHATSAPP_MODE = (process.env.WHATSAPP_MODE || 'wa_me').toLowerCase();
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const SECRETARIA_TEL = process.env.SECRETARIA_TEL || '+18095298188';

function normalizarTelefonoDO(telefono = '') {
  const digits = String(telefono).replace(/\D/g, '');

  if (digits.length === 10 && /^8(09|29|49)/.test(digits)) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && /^1(809|829|849)/.test(digits)) {
    return `+${digits}`;
  }

  if (digits.length === 12 && /^1(809|829|849)/.test(digits)) {
    return `+${digits}`;
  }

  return null;
}

function buildWhatsAppLink(telefono, mensaje) {
  const normalized = normalizarTelefonoDO(telefono);
  if (!normalized) return null;
  const telWa = normalized.replace('+', '');
  const encodedMessage = encodeURIComponent(mensaje);
  return `https://wa.me/${telWa}?text=${encodedMessage}`;
}

async function enviarWhatsApp(telefono, mensaje) {
  const telNormalized = normalizarTelefonoDO(telefono);
  if (!telNormalized) {
    console.warn(`[WA] Teléfono inválido, no se envía mensaje: ${telefono}`);
    return { ok: false, mode: WHATSAPP_MODE, reason: 'telefono_invalido' };
  }

  if (WHATSAPP_MODE === 'cloud') {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('[WA] Modo cloud activo sin WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID');
      return { ok: false, mode: 'cloud', reason: 'config_incompleta' };
    }

    try {
      const to = telNormalized.replace('+', '');
      const url = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: mensaje }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (body?.error?.code === 131030 || body?.error?.error_subcode === 2494010) {
          console.warn('[WA] Número no autorizado en modo desarrollo');
        }
        console.error('[WA][CLOUD] Error API:', body);
        return { ok: false, mode: 'cloud', reason: 'api_error', detail: body, tel: to };
      }

      const messageId = body?.messages?.[0]?.id || null;
      console.log('[WA][CLOUD] Enviado a:', to);
      console.log('[WA][CLOUD] Message ID:', messageId);
      return { ok: true, mode: 'cloud', tel: to, messageId, detail: body };
    } catch (error) {
      console.error('[WA] Excepción enviando por Cloud API:', error);
      return { ok: false, mode: 'cloud', reason: 'exception', detail: String(error?.message || error) };
    }
  }

  const waLink = buildWhatsAppLink(telNormalized, mensaje);
  console.log('[WA] Modo wa.me requiere envío manual');
  console.log(`[WA] Link generado: ${waLink}`);
  return { ok: true, mode: 'wa_me', tel: telNormalized, waLink };
}

function generarMensajeConfirmacion(cita) {
  return `Hola ${cita.nombre}, tu cita en la clínica dental ha sido registrada correctamente.
📅 Fecha: ${cita.fecha}
⏰ Hora: ${cita.hora}

Si hay algún error en tus datos, por favor comunícate con la secretaria:
📞 Tel: ${SECRETARIA_TEL}

Gracias por confiar en nosotros.`;
}

function generarMensajeActualizacion(cita) {
  return `Hola ${cita.nombre}, tu cita ha sido actualizada correctamente.
📅 Nueva fecha: ${cita.fecha}
⏰ Nueva hora: ${cita.hora}

Si necesitas hacer algún cambio adicional, contáctanos:
📞 Tel: ${SECRETARIA_TEL}`;
}

function generarMensajeRecordatorio(cita) {
  return `Recordatorio: Hola ${cita.nombre}, tienes una cita en 1 hora.
📅 Fecha: ${cita.fecha}
⏰ Hora: ${cita.hora}

Te esperamos.`;
}

function parsearFechaHoraSeguro(fecha, hora) {
  if (!fecha || !hora) return null;
  const iso = `${fecha}T${hora}:00`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

async function procesarRecordatorios() {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() + 55 * 60 * 1000);
  const hasta = new Date(ahora.getTime() + 65 * 60 * 1000);

  try {
    const result = await pool.query(`
      SELECT id, nombre, telefono, fecha, hora, recordatorio_enviado
      FROM citas
      WHERE COALESCE(recordatorio_enviado, false) = false
      ORDER BY id ASC
    `);

    for (const cita of result.rows) {
      const citaDate = parsearFechaHoraSeguro(cita.fecha, cita.hora);
      if (!citaDate) {
        console.warn(`[WA][REMINDER] Cita ${cita.id} con fecha/hora inválida: ${cita.fecha} ${cita.hora}`);
        continue;
      }

      if (citaDate >= desde && citaDate <= hasta) {
        const mensaje = generarMensajeRecordatorio(cita);
        const waResult = await enviarWhatsApp(cita.telefono, mensaje);

        if (waResult.ok) {
          await pool.query(
            'UPDATE citas SET recordatorio_enviado = true WHERE id = $1',
            [cita.id]
          );
          console.log(`[WA][REMINDER] Recordatorio enviado para cita ${cita.id}`);
        } else {
          console.error(`[WA][REMINDER] Falló envío para cita ${cita.id}.`, waResult);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error procesando recordatorios:', error);
  }
}

const trimOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });
const fail = (res, error, status = 400) => res.status(status).json({ ok: false, error });

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS citas (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT,
      servicio TEXT NOT NULL,
      medico TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      recordatorio_enviado BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT false
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS medicos (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      especialidad TEXT
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_medicos_nombre_unique
    ON medicos (LOWER(TRIM(nombre)))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS servicios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_servicios_nombre_unique
    ON servicios (LOWER(TRIM(nombre)))
  `);

  console.log('✅ Tabla "citas" lista');
  console.log('✅ Tabla "medicos" lista');
  console.log('✅ Índice único de médicos listo');
  console.log('✅ Tabla "servicios" lista');
  console.log('✅ Índice único de servicios listo');
}

app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW() as now');
    res.json({
      ok: true,
      db: 'connected',
      timestamp: dbCheck.rows[0].now
    });
  } catch (error) {
    console.error('❌ Error en healthcheck:', error);
    res.status(500).json({ ok: false, db: 'error', error: 'Database unavailable' });
  }
});

app.get('/api/medicos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medicos ORDER BY id DESC');
    return ok(res, result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo médicos:', error);
    return fail(res, 'Error al obtener médicos', 500);
  }
});

app.post('/api/medicos', async (req, res) => {
  const nombre = trimOrNull(req.body?.nombre);
  const especialidad = trimOrNull(req.body?.especialidad);

  if (!nombre) {
    return fail(res, 'El nombre del médico es obligatorio', 400);
  }

  try {
    const duplicate = await pool.query(
      'SELECT id FROM medicos WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1',
      [nombre]
    );

    if (duplicate.rowCount > 0) {
      return fail(res, 'Ya existe un médico con ese nombre', 409);
    }

    const result = await pool.query(
      'INSERT INTO medicos (nombre, especialidad) VALUES ($1, $2) RETURNING *',
      [nombre, especialidad]
    );

    return ok(res, result.rows[0], 201);
  } catch (error) {
    console.error('❌ Error guardando médico:', error);
    return fail(res, 'Error al guardar médico', 500);
  }
});

app.put('/api/medicos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const nombre = trimOrNull(req.body?.nombre);
  const especialidad = trimOrNull(req.body?.especialidad);

  if (!Number.isInteger(id) || id <= 0) {
    return fail(res, 'ID de médico inválido', 400);
  }

  if (!nombre) {
    return fail(res, 'El nombre del médico es obligatorio', 400);
  }

  try {
    const duplicate = await pool.query(
      `SELECT id FROM medicos 
       WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
       AND id <> $2
       LIMIT 1`,
      [nombre, id]
    );

    if (duplicate.rowCount > 0) {
      return fail(res, 'Ya existe otro médico con ese nombre', 409);
    }

    const result = await pool.query(
      `UPDATE medicos
       SET nombre = $1, especialidad = $2
       WHERE id = $3
       RETURNING *`,
      [nombre, especialidad, id]
    );

    if (result.rowCount === 0) {
      return fail(res, 'Médico no encontrado', 404);
    }

    return ok(res, result.rows[0]);
  } catch (error) {
    console.error('❌ Error actualizando médico:', error);
    return fail(res, 'Error al actualizar médico', 500);
  }
});

app.delete('/api/medicos/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return fail(res, 'ID de médico inválido', 400);
  }

  try {
    const result = await pool.query(
      'DELETE FROM medicos WHERE id = $1 RETURNING id, nombre',
      [id]
    );

    if (result.rowCount === 0) {
      return fail(res, 'Médico no encontrado', 404);
    }

    return ok(res, { mensaje: 'Médico eliminado correctamente', medico: result.rows[0] });
  } catch (error) {
    console.error('❌ Error eliminando médico:', error);
    return fail(res, 'Error al eliminar médico', 500);
  }
});

app.get('/api/servicios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM servicios ORDER BY id DESC');
    return ok(res, result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo servicios:', error);
    return fail(res, 'Error al obtener servicios', 500);
  }
});

app.post('/api/servicios', async (req, res) => {
  const nombre = trimOrNull(req.body?.nombre);

  if (!nombre) {
    return fail(res, 'El nombre del servicio es obligatorio', 400);
  }

  try {
    const duplicate = await pool.query(
      'SELECT id FROM servicios WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1',
      [nombre]
    );

    if (duplicate.rowCount > 0) {
      return fail(res, 'Ya existe un servicio con ese nombre', 409);
    }

    const result = await pool.query(
      'INSERT INTO servicios (nombre) VALUES ($1) RETURNING *',
      [nombre]
    );

    return ok(res, result.rows[0], 201);
  } catch (error) {
    console.error('❌ Error guardando servicio:', error);
    return fail(res, 'Error al guardar servicio', 500);
  }
});

app.put('/api/servicios/:id', async (req, res) => {
  const id = Number(req.params.id);
  const nombre = trimOrNull(req.body?.nombre);

  if (!Number.isInteger(id) || id <= 0) {
    return fail(res, 'ID de servicio inválido', 400);
  }

  if (!nombre) {
    return fail(res, 'El nombre del servicio es obligatorio', 400);
  }

  try {
    const duplicate = await pool.query(
      `SELECT id FROM servicios
       WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
       AND id <> $2
       LIMIT 1`,
      [nombre, id]
    );

    if (duplicate.rowCount > 0) {
      return fail(res, 'Ya existe otro servicio con ese nombre', 409);
    }

    const result = await pool.query(
      `UPDATE servicios
       SET nombre = $1
       WHERE id = $2
       RETURNING *`,
      [nombre, id]
    );

    if (result.rowCount === 0) {
      return fail(res, 'Servicio no encontrado', 404);
    }

    return ok(res, result.rows[0]);
  } catch (error) {
    console.error('❌ Error actualizando servicio:', error);
    return fail(res, 'Error al actualizar servicio', 500);
  }
});

app.delete('/api/servicios/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return fail(res, 'ID de servicio inválido', 400);
  }

  try {
    const result = await pool.query(
      'DELETE FROM servicios WHERE id = $1 RETURNING id, nombre',
      [id]
    );

    if (result.rowCount === 0) {
      return fail(res, 'Servicio no encontrado', 404);
    }

    return ok(res, { mensaje: 'Servicio eliminado correctamente', servicio: result.rows[0] });
  } catch (error) {
    console.error('❌ Error eliminando servicio:', error);
    return fail(res, 'Error al eliminar servicio', 500);
  }
});

app.get('/api/citas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM citas ORDER BY id DESC');
    return ok(res, result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo citas:', error);
    return fail(res, 'No se pudieron obtener las citas', 500);
  }
});

app.post('/api/citas', async (req, res) => {
  try {
    const nombre = trimOrNull(req.body?.nombre);
    const telefono = trimOrNull(req.body?.telefono);
    const email = trimOrNull(req.body?.email);
    const servicio = trimOrNull(req.body?.servicio);
    const medico = trimOrNull(req.body?.medico);
    const fecha = trimOrNull(req.body?.fecha);
    const hora = trimOrNull(req.body?.hora);

    if (!nombre || !telefono || !servicio || !medico || !fecha || !hora) {
      return fail(res, 'Faltan campos obligatorios para crear la cita', 400);
    }

    const telefonoNormalizado = normalizarTelefonoDO(telefono);
    if (!telefonoNormalizado) {
      return fail(res, 'Teléfono inválido. Debe ser un número dominicano válido con código país +1.', 400);
    }

    const result = await pool.query(
      `INSERT INTO citas (nombre, telefono, email, servicio, medico, fecha, hora)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre, telefonoNormalizado, email, servicio, medico, fecha, hora]
    );

    const citaCreada = result.rows[0];
    let waResult = null;

    try {
      const mensaje = generarMensajeConfirmacion(citaCreada);
      waResult = await enviarWhatsApp(citaCreada.telefono, mensaje);
      if (!waResult.ok) {
        console.error('[WA][POST] No se pudo enviar confirmación:', waResult);
      } else {
        console.log(`[WA][POST] Confirmación enviada para cita ${citaCreada.id}`);
      }
    } catch (waError) {
      console.error('[WA][POST] Error inesperado en envío de WhatsApp:', waError);
    }

    return ok(res, {
      ...citaCreada,
      waMode: WHATSAPP_MODE,
      waLink: waResult?.waLink || null
    }, 201);
  } catch (error) {
    console.error('❌ Error guardando cita:', error);
    return fail(res, 'No se pudo guardar la cita', 500);
  }
});

app.put('/api/citas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return fail(res, 'ID inválido', 400);
    }

    const nombre = trimOrNull(req.body?.nombre);
    const telefono = trimOrNull(req.body?.telefono);
    const fecha = trimOrNull(req.body?.fecha);
    const hora = trimOrNull(req.body?.hora);

    if (!nombre || !telefono || !fecha || !hora) {
      return fail(res, 'Faltan campos obligatorios para actualizar la cita', 400);
    }

    const telefonoNormalizado = normalizarTelefonoDO(telefono);
    if (!telefonoNormalizado) {
      return fail(res, 'Teléfono inválido. Debe ser un número dominicano válido con código país +1.', 400);
    }

    const result = await pool.query(
      `UPDATE citas
       SET nombre = $1, telefono = $2, fecha = $3, hora = $4
       WHERE id = $5
       RETURNING *`,
      [nombre, telefonoNormalizado, fecha, hora, id]
    );

    if (result.rowCount === 0) {
      return fail(res, 'Cita no encontrada', 404);
    }

    const citaActualizada = result.rows[0];
    let waResult = null;

    try {
      const mensaje = generarMensajeActualizacion(citaActualizada);
      waResult = await enviarWhatsApp(citaActualizada.telefono, mensaje);
      if (!waResult.ok) {
        console.error('[WA][PUT] No se pudo enviar actualización:', waResult);
      } else {
        console.log(`[WA][PUT] Confirmación de actualización enviada para cita ${citaActualizada.id}`);
      }
    } catch (waError) {
      console.error('[WA][PUT] Error inesperado en envío de WhatsApp:', waError);
    }

    return ok(res, {
      ...citaActualizada,
      waMode: WHATSAPP_MODE,
      waLink: waResult?.waLink || null
    });
  } catch (error) {
    console.error('❌ Error actualizando cita:', error);
    return fail(res, 'No se pudo actualizar la cita', 500);
  }
});

app.delete('/api/citas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return fail(res, 'ID inválido', 400);
    }

    const result = await pool.query('DELETE FROM citas WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return fail(res, 'Cita no encontrada', 404);
    }

    return ok(res, { mensaje: 'Cita eliminada', id });
  } catch (error) {
    console.error('❌ Error eliminando cita:', error);
    return fail(res, 'No se pudo eliminar la cita', 500);
  }
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  console.log('[WA][WEBHOOK] Evento recibido:');
  console.log(JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.get('/api/reporte', async (req, res) => {
  const requestTs = new Date();
  const isoTs = requestTs.toISOString();
  console.log(`[REPORTE] Inicio generación Excel | ts=${isoTs} | ip=${req.ip}`);

  try {
    const result = await pool.query(`
      SELECT id, nombre, telefono, fecha
      FROM citas
      ORDER BY to_date(fecha, 'YYYY-MM-DD') DESC, id DESC
    `);

    const citas = result.rows;
    console.log(`[REPORTE] Registros consultados: ${citas.length}`);

    // Se crea SIEMPRE un workbook nuevo por request
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Clínica Dental';
    workbook.created = requestTs;

    const worksheet = workbook.addWorksheet('Reporte Citas');

    const yyyy = requestTs.getFullYear();
    const mm = String(requestTs.getMonth() + 1).padStart(2, '0');
    const dd = String(requestTs.getDate()).padStart(2, '0');
    const fechaArchivo = `${yyyy}-${mm}-${dd}`;
    const timestampArchivo = requestTs.getTime();
    const fileName = `reporte_citas_${fechaArchivo}_${timestampArchivo}.xlsx`;

    console.log(`[REPORTE] Archivo a generar: ${fileName}`);

    const fechaGeneracion = requestTs.toLocaleString('es-DO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'Reporte de Citas - Clínica Dental';
    worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF0B1F3A' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = `Fecha de generación: ${fechaGeneracion}`;
    worksheet.getCell('A2').font = { size: 11, italic: true, color: { argb: 'FF4A5568' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]);

    const headerRowIndex = 4;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = ['ID', 'Nombre del Paciente', 'Teléfono', 'Fecha de Cita'];

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A5F' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0B7C3' } },
        left: { style: 'thin', color: { argb: 'FFB0B7C3' } },
        bottom: { style: 'thin', color: { argb: 'FFB0B7C3' } },
        right: { style: 'thin', color: { argb: 'FFB0B7C3' } }
      };
    });
    headerRow.height = 22;

    for (const cita of citas) {
      const fechaObj = new Date(`${cita.fecha}T00:00:00`);
      const fechaFormateada = Number.isNaN(fechaObj.getTime())
        ? cita.fecha
        : fechaObj.toLocaleDateString('es-DO');

      const row = worksheet.addRow([
        cita.id,
        cita.nombre,
        cita.telefono,
        fechaFormateada
      ]);

      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
      });
    }

    worksheet.addRow([]);
    const totalRow = worksheet.addRow(['', '', 'TOTAL DE CITAS:', citas.length]);
    totalRow.getCell(3).font = { bold: true, size: 12, color: { argb: 'FF0B1F3A' } };
    totalRow.getCell(4).font = { bold: true, size: 12, color: { argb: 'FF0B1F3A' } };
    totalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.eachCell((cell) => {
      if (cell.value !== null && cell.value !== '') {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
        };
      }
    });

    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value == null ? '' : String(cell.value);
        maxLength = Math.max(maxLength, value.length + 2);
      });
      column.width = Math.min(maxLength, 40);
    });

    worksheet.autoFilter = {
      from: `A${headerRowIndex}`,
      to: `D${headerRowIndex}`
    };

    worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    await workbook.xlsx.write(res);
    console.log(`[REPORTE] Fin generación Excel | archivo=${fileName} | registros=${citas.length}`);
    res.end();
  } catch (error) {
    console.error('❌ Error generando reporte Excel:', error);
    res.status(500).json({ error: 'No se pudo generar el reporte Excel' });
  }
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initDatabase();

    setInterval(() => {
      procesarRecordatorios().catch((error) => {
        console.error('❌ Error en ciclo de recordatorios:', error);
      });
    }, 60 * 1000);

    console.log(`🟢 Scheduler de recordatorios iniciado (cada 1 minuto) | modo WA: ${WHATSAPP_MODE}`);
    app.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));
  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error);
    process.exit(1);
  }
}

startServer();
