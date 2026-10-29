-- LHB-62: bloquear. Una fila por par: blocker_id bloqueó a blocked_id. Un bloqueo esconde a cada uno del otro en todas partes (perfil, búsqueda, listas, feed)
-- y no deja seguir en ninguna dirección; quien bloquea lo deshace desde "Bloqueados" en Editar perfil, y deshacerlo no devuelve los seguir.
-- La persona bloqueada no se entera. Los dos lados son user_id de profiles; si se borra un perfil, sus filas se van de los dos lados (ON DELETE CASCADE),
-- y borrar la cuenta (LHB-34) también las borra por la lista de functions/_lib/account.js.
-- Nada se rellena: tabla nueva. 0001 a 0006 se quedan como se aplicaron.
-- Orden: el código que conoce esta tabla sale ANTES de aplicarla; sin ella, bloquear queda apagado y nadie está bloqueado.

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- quién me bloqueó (la llave primaria ya sirve para a quién bloqueé yo)
CREATE INDEX IF NOT EXISTS blocks_by_blocked ON blocks (blocked_id);
