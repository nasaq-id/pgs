const fs = require('fs');
const path = 'src/components/SiswaView.tsx';
let content = fs.readFileSync(path, 'utf8');

const excelReplacement = `
  const exportToExcel = () => {
    const headers = getTableHeaders();
    const data = getTableData();
    
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const footer = [[\`Diekspor pada: \${exportDate}\`]];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data, [], ...footer]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
    
    XLSX.writeFile(workbook, "Data_Siswa.xlsx");
    setExportDropdownOpen(false);
  };
`;
content = content.replace(/const exportToExcel = \(\) => \{[\s\S]*?setExportDropdownOpen\(false\);\s*\};/, excelReplacement.trim());


const pdfSearch = `    autoTable(doc, {
      startY: 45,
      head: [getTableHeaders()],
      body: getTableData(),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
      }
    });`;

const pdfReplacement = pdfSearch + `
    
    const finalY = (doc as any).lastAutoTable?.finalY || 45;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    doc.text(\`Diekspor pada: \${exportDate}\`, 15, finalY + 10);
`;

content = content.replace(pdfSearch, pdfReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Export footer updated.');
