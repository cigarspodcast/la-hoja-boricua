-- LHB-115: el idioma de la cuenta, 'es' o 'en'; NULL hasta que se escoja. LHB-116: el dueño ya la aplicó a lhb-preview y a lhb-prod el 2026-10-30.
ALTER TABLE profiles ADD COLUMN lang TEXT CHECK (lang IS NULL OR lang IN ('es', 'en'));
