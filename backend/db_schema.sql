-- Schema base para clínica dental (PostgreSQL)

CREATE TABLE IF NOT EXISTS medicos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  especialidad TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_medicos_nombre_unique
ON medicos (LOWER(TRIM(nombre)));

CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  servicio TEXT NOT NULL,
  medico TEXT NOT NULL,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  recordatorio_enviado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE citas
ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT false;
