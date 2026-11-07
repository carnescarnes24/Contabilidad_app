import ExcelJS from "exceljs";

type Column = { header: string; key: string; width?: number };

// Helper para convertir URL de imagen a base64 (necesario para ExcelJS en el cliente)
async function getBase64Image(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("No se pudo cargar el logo", error);
    return null;
  }
}

export async function exportToExcel(
  filename: string,
  sheetName: string,
  title: string,
  businessName: string, // Aquí pasaremos el "Trade Name" si existe
  columns: Column[],
  rows: Record<string, any>[],
  logoUrl?: string // <-- NUEVO PARÁMETRO
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CxC / CxP";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);
  const numCols = columns.length;

  // 2. Fila 1: Nombre del aplicativo
  const titleRow = sheet.addRow(["CxC / CxP - Gestión Financiera"]);
  titleRow.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCD0508" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };
  titleRow.height = 30;
  sheet.mergeCells(1, 1, 1, numCols);

  // 3. Fila 2: Nombre del establecimiento
  const businessRow = sheet.addRow([`Establecimiento: ${businessName}`]);
  businessRow.font = { bold: true, size: 12, color: { argb: "FFB05328" } };
  businessRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F0AA" } };
  businessRow.alignment = { vertical: "middle", horizontal: "center" };
  sheet.mergeCells(2, 1, 2, numCols);

  // NUEVO: Insertar Logo si existe
  if (logoUrl) {
    const base64 = await getBase64Image(logoUrl);
    if (base64) {
      const imageId = workbook.addImage({
        base64: base64,
        extension: "png", // Asumimos PNG, si usas JPG exceljs a veces falla
      });
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 80, height: 30 },
        editAs: "oneCell"
      });
    }
  }

  // 4. Fila 3: Título del reporte y fecha
  const dateStr = new Date().toLocaleString("es-CO");
  const reportRow = sheet.addRow([`${title} - Generado el: ${dateStr}`]);
  reportRow.font = { italic: true, size: 10, color: { argb: "FF666666" } };
  reportRow.alignment = { vertical: "middle", horizontal: "center" };
  sheet.mergeCells(3, 1, 3, numCols);

  // 5. Fila 4: Espacio en blanco
  sheet.addRow([]);

  // 6. Fila 5: Cabeceras reales de la tabla
  const headerRow = sheet.addRow(columns.map(c => c.header));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCD0508" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  
  columns.forEach((col, index) => {
    sheet.getColumn(index + 1).width = col.width || 15;
  });

  // 7. Agregar los datos
  rows.forEach((r) => sheet.addRow(columns.map(c => r[c.key])));

  // 8. Estilos para las filas de datos
  const lastDataRow = sheet.lastRow.number;
  for (let i = 6; i <= lastDataRow; i++) {
    const row = sheet.getRow(i);
    row.alignment = { vertical: "middle" };
    
    row.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      
      if (col?.key && typeof cell.value === "number" && 
         !col.key.toLowerCase().includes("count") && 
         !col.key.toLowerCase().includes("id") && 
         !col.key.toLowerCase().includes("documento") &&
         !col.key.toLowerCase().includes("name")) {
        cell.numFmt = '"$"#,##0';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }

      if (row.getCell(1).value === "TOTAL") {
        row.font = { bold: true };
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F0AA" } };
      }
    });
  }

  // 9. Generar y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}