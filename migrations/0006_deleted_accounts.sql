-- LHB-34: las cuentas borradas. Una sesion que todavia vive despues de borrar la cuenta (un token de Clerk dura 60 s y se verifica sin preguntarle a Clerk)
-- no puede volver a crear el perfil ni anotar una revision de @: esas escrituras miran esta tabla en la misma sentencia.
-- Se guarda el SHA-256 de 'lhb-deleted:' + el id, nunca el id: despues de borrar no queda ninguna fila con el id de la persona.
-- Sin esta tabla, borrar una cuenta contesta 503 not-ready y no borra nada. 0001 a 0005 se quedan como se aplicaron.
CREATE TABLE deleted_accounts (
  id_hash TEXT PRIMARY KEY,
  deleted_at TEXT NOT NULL
);
