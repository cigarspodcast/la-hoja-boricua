-- LHB-63: la revision del @ mientras se escribe (GET /api/handle). Un renglon por cada revision que llega a la base; solo sirve para poner un tope por cuenta y se poda solo (los de mas de un minuto no cuentan y se borran en la proxima revision de esa cuenta).
-- Sin llave a profiles: quien revisa su @ en el registro todavia no tiene perfil. 0001 a 0004 se quedan como se aplicaron.
CREATE TABLE handle_checks (
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX handle_checks_by_user ON handle_checks (user_id, created_at);
