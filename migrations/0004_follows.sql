-- LHB-56: seguir a otras personas (estilo Instagram: una sola vía, sin aprobación). Una fila por par: follower_id sigue a followee_id.
-- Los dos lados son user_id de profiles; si se borra un perfil, sus filas desaparecen de los dos lados (ON DELETE CASCADE). Los conteos se calculan de esta tabla, no se guardan.
-- Nada se rellena: tabla nueva. 0001 a 0003 se quedan como se aplicaron.

CREATE TABLE follows (
  follower_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  followee_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

-- quién me sigue (por fecha, la más nueva primero) y a quién sigo
CREATE INDEX follows_by_followee ON follows (followee_id, created_at DESC);
CREATE INDEX follows_by_follower ON follows (follower_id, created_at DESC);
