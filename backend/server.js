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

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS citas (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT NOT NULL,
      servicio TEXT NOT NULL,
      medico TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ Tabla "citas" lista');
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

app.get('/api/citas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM citas ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo citas:', error);
    res.status(500).json({ error: 'No se pudieron obtener las citas' });
  }
});

app.post('/api/citas', async (req, res) => {
  try {
    const { nombre, telefono, email, servicio, medico, fecha, hora } = req.body;

    if (!nombre || !telefono || !email || !servicio || !medico || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para crear la cita' });
    }

    const result = await pool.query(
      `INSERT INTO citas (nombre, telefono, email, servicio, medico, fecha, hora)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre, telefono, email, servicio, medico, fecha, hora]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error guardando cita:', error);
    res.status(500).json({ error: 'No se pudo guardar la cita' });
  }
});

app.delete('/api/citas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const result = await pool.query('DELETE FROM citas WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    res.json({ mensaje: 'Cita eliminada', id });
  } catch (error) {
    console.error('❌ Error eliminando cita:', error);
    res.status(500).json({ error: 'No se pudo eliminar la cita' });
  }
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
    app.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));
  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error);
    process.exit(1);
  }
}

startServer();
