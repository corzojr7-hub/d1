const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const excelFilePath = "C:\\Users\\corzo\\Downloads\\5. Conteo Extraordinarios (1) (1).xlsx";

if (!fs.existsSync(excelFilePath)) {
  console.error("No se encontro el archivo:", excelFilePath);
  process.exit(1);
}

async function seedProducts() {
  console.log("Leyendo archivo Excel...");
  const wb = xlsx.readFile(excelFilePath);
  const ws = wb.Sheets["EAN"];
  
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`Se encontraron ${data.length} filas en total.`);

  const productsToInsert = [];
  const eansSeen = new Set();

  for (const row of data) {
    if (!Array.isArray(row)) continue;
    let ean = row[0]; // Código EAN/UPC
    let material = row[1]; // Material
    let name = row[2]; // Texto breve de material

    if (ean && name) {
      // Limpiar datos
      ean = String(ean).trim();
      material = material ? String(material).trim() : null;
      name = String(name).trim();

      // Ignorar encabezados, eans vacios o repetidos
      if (ean && ean !== "Código EAN/UPC" && !eansSeen.has(ean)) {
        eansSeen.add(ean);
        productsToInsert.push({
          barcode_id: ean,
          material_code: material,
          name: name,
          category: "General",
          unit: "Unidad",
        });
      }
    }
  }

  console.log(`Total de productos validos a insertar: ${productsToInsert.length}`);

  if (productsToInsert.length === 0) {
    console.log("No hay productos validos para insertar.");
    return;
  }

  // Generar archivo SQL
  console.log("Generando archivo SQL...");
  const sqlLines = [];
  sqlLines.push('ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material_code TEXT;');
  sqlLines.push('');
  sqlLines.push('INSERT INTO "public"."products" (barcode_id, material_code, name, category, unit) VALUES');

  const values = productsToInsert.map((p) => {
    const safeName = p.name.replace(/'/g, "''");
    const safeMaterial = p.material_code ? `'${p.material_code.replace(/'/g, "''")}'` : 'NULL';
    return `('${p.barcode_id}', ${safeMaterial}, '${safeName}', 'General', 'Unidad')`;
  });

  sqlLines.push(values.join(",\n"));
  sqlLines.push('ON CONFLICT (barcode_id) DO UPDATE SET name = EXCLUDED.name, material_code = EXCLUDED.material_code;');

  const sqlOutput = sqlLines.join("\n");
  fs.writeFileSync(path.join(__dirname, "..", "database", "seed_products.sql"), sqlOutput);

  console.log(`Migracion completada. Se generó database/seed_products.sql con ${productsToInsert.length} productos.`);
}

seedProducts();
