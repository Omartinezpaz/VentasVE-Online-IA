-- Política para permitir que cualquiera (público) vea los negocios
-- Esto es necesario para que la tienda online funcione sin autenticación previa
CREATE POLICY "Public Read Access" ON "Business"
FOR SELECT
TO public
USING (true);

-- Política para permitir acceso total al rol de servicio (backend/dashboard interno)
-- Aunque service_role suele tener bypass, esto elimina la alerta de "Sin política"
CREATE POLICY "Service Role Full Access" ON "Business"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Repetir para User si es necesario, o al menos lectura autenticada
ALTER TABLE "StoreUser" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON "StoreUser"
FOR SELECT
TO public
USING (auth.uid()::text = id); -- Esto asumiendo que usáramos Supabase Auth, si no, usar service_role

CREATE POLICY "Service Role Full Access User" ON "StoreUser"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
