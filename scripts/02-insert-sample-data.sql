-- Beispiel Fahrzeuge einfügen
INSERT INTO vehicles (license_plate, brand, model) VALUES
('B-MW 1234', 'BMW', '3er'),
('B-VW 5678', 'Volkswagen', 'Golf'),
('B-MB 9012', 'Mercedes-Benz', 'C-Klasse'),
('B-AU 3456', 'Audi', 'A4'),
('B-OP 7890', 'Opel', 'Astra')
ON CONFLICT (license_plate) DO NOTHING;

-- Beispiel Admin-Benutzer (Passwort wird über Supabase Auth verwaltet)
-- Dieser SQL-Code erstellt nur die Benutzerprofile
-- Die eigentliche Authentifizierung erfolgt über Supabase Auth
