-- LHB-24 (revisión 3): Clerk maneja las cuentas y las sesiones. 0001 se queda como se aplicó; esto lo reemplaza.
-- Las tablas de 0001 solo se aplicaron en lhb-preview y nunca se usaron (sin filas).
-- mihoja se recrea porque su llave apuntaba a users(id); ahora es el id de usuario de Clerk (sub).

DROP TABLE IF EXISTS mihoja;
DROP TABLE IF EXISTS login_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- Perfil público (pasaporte). handle en minúsculas, único. age_ok_at: cuándo confirmó que tiene 21 años o más.
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  favorite_brand TEXT,
  avatar_key TEXT,
  age_ok_at TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Una Mi Hoja por usuario de Clerk; doc es el JSON del cliente (lhb_mihoja_v1), schema su versión, rev para sincronizar.
CREATE TABLE mihoja (
  user_id TEXT PRIMARY KEY,
  doc TEXT NOT NULL,
  schema INTEGER NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
