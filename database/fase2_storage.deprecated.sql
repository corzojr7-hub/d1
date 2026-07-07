-- -------------------------------------------------------------
-- APP 2: Fase 2 - Aislamiento Total de Archivos (Storage RLS)
-- -------------------------------------------------------------

-- 1. (Saltado: storage.objects ya tiene RLS por defecto, y altera el owner genera error en algunos entornos)

-- 2. Limpieza estricta: Borramos políticas previas o permisivas
DROP POLICY IF EXISTS "Allow authenticated select waste" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert waste" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update waste" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete waste" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated select handover" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert handover" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update handover" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete handover" ON storage.objects;

-- Borramos políticas generales si las hubiera (nombres generados en versiones previas)
DROP POLICY IF EXISTS "Give users access to own folder 1qaz" ON storage.objects;

-- 3. Aislamiento de Inserción: Solo puedes subir archivos en la ruta "tu_codigo_de_tienda/..."
CREATE POLICY "storage_insert_own_store" ON storage.objects FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND public.is_active_app_user() 
    AND bucket_id IN ('waste-evidence', 'handover_photos')
    AND name LIKE (public.current_store_code() || '/%')
);

-- 4. Aislamiento de Lectura: Solo puedes descargar/ver archivos en la ruta "tu_codigo_de_tienda/..."
CREATE POLICY "storage_select_own_store" ON storage.objects FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND public.is_active_app_user() 
    AND bucket_id IN ('waste-evidence', 'handover_photos')
    AND name LIKE (public.current_store_code() || '/%')
);

-- 5. Privilegio Maestro: Los administradores pueden ver y gestionar todos los archivos
CREATE POLICY "storage_admin_all" ON storage.objects FOR ALL
USING (
    auth.uid() IS NOT NULL 
    AND public.current_app_role() = 'admin'
);

-- LISTO: Archivos de evidencia blindados por tienda.
