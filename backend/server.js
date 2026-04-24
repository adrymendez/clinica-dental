import express from 'express';
import cors from 'cors';
import pkg from 'pg';

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
