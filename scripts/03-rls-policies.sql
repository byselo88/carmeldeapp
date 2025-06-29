-- Row Level Security aktivieren
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;

-- Policies für users Tabelle
CREATE POLICY "Users können ihr eigenes Profil sehen" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins können alle Benutzer sehen" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

CREATE POLICY "Admins können Benutzer verwalten" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Policies für vehicles Tabelle
CREATE POLICY "Aktive Benutzer können Fahrzeuge sehen" ON vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Policies für vehicle_reports Tabelle
CREATE POLICY "Fahrer können ihre eigenen Berichte sehen" ON vehicle_reports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Fahrer können Berichte erstellen" ON vehicle_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins können alle Berichte sehen" ON vehicle_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Policies für report_photos Tabelle
CREATE POLICY "Benutzer können Fotos ihrer Berichte sehen" ON report_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vehicle_reports 
      WHERE id = report_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Benutzer können Fotos zu ihren Berichten hinzufügen" ON report_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicle_reports 
      WHERE id = report_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins können alle Fotos sehen" ON report_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );
