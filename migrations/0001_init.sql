-- LHB-24: cuentas de Mi Hoja. Migraciones solo hacia adelante: un cambio nuevo es un archivo nuevo (0002_...).
-- Fechas en ISO 8601 UTC (texto). Correos en minúsculas.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  google_sub TEXT UNIQUE,
  age_ok_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- D1 guarda solo el SHA-256 del id de sesión; el id va en la cookie.
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Enlaces para entrar por correo: solo el hash, un solo uso.
CREATE TABLE login_tokens (
  hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

-- Una Mi Hoja por cuenta; doc es el JSON del cliente (lhb_mihoja_v1), schema su versión, rev para sincronizar.
CREATE TABLE mihoja (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  doc TEXT NOT NULL,
  schema INTEGER NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
