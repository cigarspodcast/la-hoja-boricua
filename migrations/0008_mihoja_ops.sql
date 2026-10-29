-- LHB-80: las últimas subidas de Mi Hoja que llegaron, en la misma fila: ops es un arreglo JSON de [id, rev], de la más vieja a la más nueva,
-- con a lo sumo OPS_KEEP (functions/_lib/mihoja.js). El id lo inventa el cliente en cada PUT (cabecera X-Op): con él, la pasada siguiente sabe
-- si una subida sin respuesta llegó, y en qué rev (GET /api/mihoja?op=<id>), sin adivinar.
-- Las filas que ya había quedan con ops NULL. Orden: el código sale antes que esta migración (sin la columna, PUT y GET contestan como antes).
-- (0007 es blocks, de LHB-62.)
ALTER TABLE mihoja ADD COLUMN ops TEXT;
