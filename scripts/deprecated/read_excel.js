const xlsx = require('xlsx');

const filePath = 'C:\\Users\\corzo\\Downloads\\Conteo Extraordinarios VCIO- SAN-ANTONIO-14-ABRIL-2026 (2).xlsx';

try {
  const workbook = xlsx.readFile(filePath);
  console.log("Hojas disponibles:", workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Hoja: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let count = 0;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row.some(cell => String(cell).trim() !== '')) {
        console.log(`Fila ${i + 1}:`, row);
        count++;
        if (count >= 5) break;
      }
    }
  }
} catch (error) {
  console.error("Error leyendo el archivo:", error);
}
