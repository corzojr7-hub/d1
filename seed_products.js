require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaWxnYnR2a3Rlbm5jbXpqbGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc4MTM3NCwiZXhwIjoyMDk2MzU3Mzc0fQ.brejmSjPnJXgLddUuiMDDFOlN8pq577yTP5k_3qGhiQ';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const filePath = 'C:\\Users\\corzo\\Downloads\\Conteo Extraordinarios VCIO- SAN-ANTONIO-14-ABRIL-2026 (2).xlsx';

async function seed() {
  try {
    const workbook = xlsx.readFile(filePath);
    let validRows = [];
    
    // Buscar en la hoja EAN primero, o en todas
    for (const sheetName of workbook.SheetNames) {
      if (sheetName !== 'EAN') continue;
      
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] && String(row[0]).trim() !== '' && String(row[0]).trim() !== 'Código EAN/UPC') {
          validRows.push({
            barcode_id: String(row[0]).trim(),
            material_code: String(row[1] || '').trim(),
            name: String(row[2] || '').trim(),
            category: 'General',
            unit: 'UNDS'
          });
        }
      }
    }
    
    console.log(`Listo para insertar ${validRows.length} productos.`);
    
    // Insertar en lotes de 1000
    const batchSize = 1000;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      console.log(`Insertando lote ${i/batchSize + 1} (${batch.length} registros)...`);
      
      const { error } = await supabase.from('products').upsert(batch, { onConflict: 'barcode_id' });
      
      if (error) {
        console.error("Error insertando lote:", error);
        return;
      }
    }
    
    console.log("¡Todos los productos insertados exitosamente!");
  } catch (error) {
    console.error("Error:", error);
  }
}

seed();
