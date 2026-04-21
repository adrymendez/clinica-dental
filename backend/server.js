import express from 'express';
import cors from 'cors';
import pkg from 'pg';

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// conexión
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// crear tabla REAL (igual al frontend)
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS citas (
      id SERIAL PRIMARY KEY,
      nombre TEXT,
      telefono TEXT,
      email TEXT,
      servicio TEXT,
      medico TEXT,
      fecha TEXT,
      hora TEXT
    )
  `);
  console.log("✅ Tabla lista");
})();

// GET
app.get('/api/citas', async (req, res) => {
  const result = await pool.query('SELECT * FROM citas ORDER BY id DESC');
  res.json(result.rows);
});

// POST (ALINEADO)
app.post('/api/citas', async (req, res) => {
  const { nombre, telefono, email, servicio, medico, fecha, hora } = req.body;

  const result = await pool.query(
    `INSERT INTO citas (nombre, telefono, email, servicio, medico, fecha, hora)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [nombre, telefono, email, servicio, medico, fecha, hora]
  );

  res.json(result.rows[0]);
});

// DELETE
app.delete('/api/citas/:id', async (req, res) => {
  await pool.query('DELETE FROM citas WHERE id = $1', [req.params.id]);
  res.json({ mensaje: 'Cita eliminada' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Servidor corriendo"));