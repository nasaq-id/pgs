const fs = require('fs');
const path = 'src/components/SiswaView.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = "const [exportDropdownOpen, setExportDropdownOpen] = useState(false);";
const replacement1 = `const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTingkat, setExportTingkat] = useState('Semua Tingkat');

  const tingkatOptions = React.useMemo(() => {
    const tingkats = new Set<string>();
    students.forEach(std => {
      const match = (std.kelas || '').match(/^(\\d+|[IVX]+)/i);
      if (match) tingkats.add(match[1].toUpperCase());
    });
    const sorted = Array.from(tingkats).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
    return ['Semua Tingkat', ...sorted.map(t => \`Kelas \${t}\`), 'Tanpa Kelas'];
  }, [students]);`;

content = content.replace(target1, replacement1);

// Remove the event listener that closes exportDropdownOpen
content = content.replace(/if \(exportDropdownOpen && !\(e\.target as Element\)\.closest\('\.export-dropdown'\)\) \{\s*setExportDropdownOpen\(false\);\s*\}/, "");

const startExport = content.indexOf("const exportToExcel = () => {");
const endExport = content.indexOf("const getTableDataForPDF");

const replacementExportExcel = `const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    
    let studentsToExport = students;
    if (exportTingkat !== 'Semua Tingkat') {
      if (exportTingkat === 'Tanpa Kelas') {
        studentsToExport = students.filter(std => !std.kelas);
      } else {
        const t = exportTingkat.replace('Kelas ', '');
        studentsToExport = students.filter(std => {
          const match = (std.kelas || '').match(/^(\\d+|[IVX]+)/i);
          return match && match[1].toUpperCase() === t;
        });
      }
    }

    const sheetsData: Record<string, typeof students> = {};
    
    studentsToExport.forEach(std => {
      let sheetName = std.kelas || 'Siswa Tanpa Kelas';
      if (std.status === 'Non-Aktif') sheetName = 'Siswa Non-Aktif';
      else if (std.status === 'Pindah') sheetName = 'Siswa Pindah';
      else if (std.status === 'Dikeluarkan') sheetName = 'Siswa Keluar';
      else if (std.status === 'Lulus') sheetName = 'Siswa Lulus';
      
      sheetName = sheetName.substring(0, 31);
      
      if (!sheetsData[sheetName]) sheetsData[sheetName] = [];
      sheetsData[sheetName].push(std);
    });

    if (Object.keys(sheetsData).length === 0) {
      alert('Tidak ada data untuk diekspor pada tingkat ini.');
      return;
    }

    Object.keys(sheetsData).forEach(sheetName => {
      const sheetStudents = sheetsData[sheetName];
      const headers = getAllTableHeaders();
      const data = getAllTableData(sheetStudents);
      
      const schoolName = institution?.name || 'Nama Sekolah';
      const schoolAddress = institution?.address || 'Alamat Sekolah';
      const schoolYear = institution?.academicYear || '';
      
      const kopRows = [
        [{ t: 's', v: schoolName }],
        [{ t: 's', v: schoolAddress }],
        [{ t: 's', v: \`Data Siswa Tahun Ajaran \${schoolYear}\` }],
        []
      ];
      
      const footerRows = [
        [],
        [{ t: 's', v: \`Diekspor pada: \${exportDate}\` }]
      ];
      
      const headerCells = headers.map(h => ({ 
        t: 's', 
        v: h,
        s: {
          fill: { fgColor: { rgb: "34D399" } },
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
      
      const dataAndHeaders = [headers.map(h => ({v: h})), ...data];
      const max_widths = dataAndHeaders.reduce((acc: number[], row: any[]) => {
        row.forEach((cell, idx) => {
          const val = typeof cell === 'object' && cell !== null ? String(cell.v || '') : String(cell || '');
          acc[idx] = Math.max(acc[idx] || 0, val.length);
        });
        return acc;
      }, []);
      
      worksheet['!cols'] = max_widths.map(w => ({ wch: w + 2 }));

      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
        { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: headers.length - 1 } }
      ];
      worksheet['!merges'] = merges;
      
      worksheet['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: "left" } };
      worksheet['A2'].s = { font: { sz: 11 }, alignment: { horizontal: "left" } };
      worksheet['A3'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: "left" } };
      
      const footerCellRef = XLSX.utils.encode_cell({ r: aoa.length - 1, c: 0 });
      if(worksheet[footerCellRef]) {
        worksheet[footerCellRef].s = { font: { italic: true, sz: 10 }, alignment: { horizontal: "left" } };
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    XLSX.writeFile(workbook, "Data_Siswa.xlsx");
    setExportModalOpen(false);
  };

  `;

content = content.substring(0, startExport) + replacementExportExcel + content.substring(endExport);

fs.writeFileSync(path, content, 'utf8');
console.log('Done replacement');
