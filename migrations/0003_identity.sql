-- LHB-52: identidad al crear el perfil. Nombre, apellido, género y fecha de nacimiento; los cuatro son privados salvo lo que se arma con ellos
-- (display_name: nombre y la inicial del apellido). Nullable: los perfiles que ya existen quedan con null y completan su identidad en su próxima entrada a Mi Hoja.
-- Ninguna fila existente se rellena. 0001 y 0002 se quedan como se aplicaron.
-- age_ok_at se queda: ahora se sella cuando la fecha de nacimiento muestra 21 años o más.

ALTER TABLE profiles ADD COLUMN first_name TEXT;
ALTER TABLE profiles ADD COLUMN last_name TEXT;
ALTER TABLE profiles ADD COLUMN gender TEXT CHECK (gender IS NULL OR gender IN ('M', 'F'));
ALTER TABLE profiles ADD COLUMN birth_date TEXT CHECK (birth_date IS NULL OR birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
