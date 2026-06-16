const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../database/consolidated_schema.sql');
let content = fs.readFileSync(filePath, 'utf8');

// remove all create policy "Allow authenticated select"... lines
content = content.replace(/create policy "Allow authenticated[^"]*".*/gi, '');

// insert the drop loop
const dropLoop = `
-- ---------------------------------------------------------------------------
-- Limpieza Inicial de Políticas Inseguras (Drop)
-- ---------------------------------------------------------------------------
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND (policyname LIKE 'Allow authenticated%' OR policyname LIKE 'profiles_%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;
`;

content = content.replace('-- (Limpieza de policies antigua removida del script consolidado)', dropLoop);

// Also remove Allow public read handover photos
content = content.replace(/create policy "Allow public read handover photos"[^;]+;/gi, '');

fs.writeFileSync(filePath, content);
console.log('Cleaned file successfully');
