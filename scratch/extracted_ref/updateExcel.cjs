const fs = require('fs');
const path = 'src/components/SiswaView.tsx';
let content = fs.readFileSync(path, 'utf8');

const startIdx = content.indexOf('const exportToExcel = () => {');
const endIdx = content.indexOf('const getTableDataForPDF = () => {');

const replacement = `
  const exportToExcel = () => {
    const headers = getAllTableHeaders();
    const data = getAllTableData();
    
    const schoolName = institution?.name || 'Nama Sekolah';
    const schoolAddress = institution?.address || 'Alamat Sekolah';
    const schoolYear = institution?.academicYear || '';
    
    const kopRows = [
      [{ t: 's', v: schoolName }],
      [{ t: 's', v: schoolAddress }],
      [{ t: 's', v: \\\`Data Siswa Tahun Ajaran \\\${schoolYear}\\\` }],
      []
    ];
    
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const footerRows = [
      [],
      [{ t: 's', v: \\\`Diekspor pada: \\\${exportDate}\\\` }]
    ];
    
    const headerRowIdx = kopRows.length;
    const headerCells = headers.map(h => ({ 
      t: 's', 
      v: h,
      s: {
        fill: { fgColor: { rgb: "34D399" } }, // Emerald-400 / A bright color
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "left", vertical: "center" }
      }
    }));

    const aoa = [
      ...kopRows,
      headerCells,
      ...data,
      ...footerRows
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    
    // Calculate widths based ONLY on headers and data (not kop or footer)
    const dataAndHeaders = [headers.map(h => ({v: h})), ...data];
    const max_widths = dataAndHeaders.reduce((acc: number[], row: any[]) => {
      row.forEach((cell, idx) => {
        const val = typeof cell === 'object' && cell !== null ? String(cell.v || '') : String(cell || '');
        acc[idx] = Math.max(acc[idx] || 10, val.length);
      });
      return acc;
    }, []);
    
    worksheet['!cols'] = max_widths.map(w => ({ wch: w + 2 }));

    // Merge kop cells
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
      { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: headers.length - 1 } } // merge footer
    ];
    worksheet['!merges'] = merges;
    
    // Style kop and footer
    worksheet['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: "left" } };
    worksheet['A2'].s = { font: { sz: 11 }, alignment: { horizontal: "left" } };
    worksheet['A3'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: "left" } };
    
    const footerCellRef = XLSX.utils.encode_cell({ r: aoa.length - 1, c: 0 });
    if(worksheet[footerCellRef]) {
      worksheet[footerCellRef].s = { font: { italic: true, sz: 10 }, alignment: { horizontal: "left" } };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
    
    XLSX.writeFile(workbook, "Data_Siswa.xlsx");
    setExportDropdownOpen(false);
  };

  `;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated exportToExcel.');
