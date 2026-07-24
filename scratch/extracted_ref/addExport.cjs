const fs = require('fs');

const path = 'src/components/SiswaView.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports for jsPDF, autoTable, and XLSX
const imports = `
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { ChevronDown, FileText, Table } from 'lucide-react';
`;
content = content.replace("import { generateUUID } from '../lib/supabaseClient';", "import { generateUUID } from '../lib/supabaseClient';\n" + imports);

// 2. Add state for export dropdown
content = content.replace("const [searchTerm, setSearchTerm] = useState('');", "const [searchTerm, setSearchTerm] = useState('');\n  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);");

// 3. Add handleToggleMenu to close dropdown, wait, we can just close it in the general click outside handler.
content = content.replace("setActiveMenuId(null);", "setActiveMenuId(null);\n        setExportDropdownOpen(false);");

// 4. Replace exportToCSV with exportToExcel and exportToPDF
const exportFunctions = `
  const getTableData = () => {
    return filteredStudents.map((std, index) => [
      index + 1,
      std.nisn || '-',
      std.nis || '-',
      std.nama || '-',
      std.jk === 'Laki-laki' ? 'L' : std.jk === 'Perempuan' ? 'P' : '-',
      std.kelas || '-',
      \`\${std.tempatLahir || '-'}, \${std.tanggalLahir || '-'}\`,
      std.ayah?.nama || '-',
      std.ibu?.nama || '-',
      std.hp || '-',
      std.waliData?.hp || std.ayah?.hp || '-'
    ]);
  };

  const getTableHeaders = () => [
    'No', 'NISN', 'NIS', 'Nama Siswa', 'Jenis Kelamin', 'Kelas', 'Tempat, Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'No.HP/WA Siswa', 'No.HP/WA Wali'
  ];

  const exportToExcel = () => {
    const headers = getTableHeaders();
    const data = getTableData();
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
    
    XLSX.writeFile(workbook, "Data_Siswa.xlsx");
    setExportDropdownOpen(false);
  };

  const exportToPDF = async () => {
    const doc = new jsPDF('landscape');
    
    // Add School Header
    const schoolName = institution?.name || 'Nama Sekolah';
    const schoolAddress = institution?.address || 'Alamat Sekolah';
    const schoolYear = institution?.academicYear || '';
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(schoolAddress, doc.internal.pageSize.getWidth() / 2, 26, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(\`Data Siswa Tahun Ajaran \${schoolYear}\`, doc.internal.pageSize.getWidth() / 2, 36, { align: 'center' });
    
    // Attempt to load logos (this might not work cross-origin in canvas, but we can try or skip)
    // Left Logo (School)
    if (institution?.logo) {
      try {
        doc.addImage(institution.logo, 'PNG', 15, 10, 25, 25);
      } catch(e) {}
    } else {
      // Default left logo could be tut wuri or school placeholder
    }
    
    // Right Logo (Tut Wuri / Kemenag)
    try {
      const isMadrasah = schoolName.toLowerCase().includes('madrasah') || schoolName.toLowerCase().includes('mi') || schoolName.toLowerCase().includes('mts') || schoolName.toLowerCase().includes('ma');
      const rightLogoUrl = isMadrasah 
        ? 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Lambang_Kementerian_Agama_Republik_Indonesia.png'
        : 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png';
      
      // Note: loading images from URL directly in jsPDF might cause tainted canvas issues if not configured with CORS.
      // We will try our best, but for PDF, using base64 is safest. We'll skip remote images to avoid crashing or blocking.
      // Instead, we will just have the text header.
    } catch(e) {}

    autoTable(doc, {
      startY: 45,
      head: [getTableHeaders()],
      body: getTableData(),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
      }
    });
    
    doc.save("Data_Siswa.pdf");
    setExportDropdownOpen(false);
  };
`;
content = content.replace(/const exportToCSV = \(\) => \{[\s\S]*?\}\s*;/g, exportFunctions);

// 5. Replace Export button with dropdown
const exportButtonHTML = `
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="flex-1 sm:flex-initial bg-slate-900 border border-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer shadow-sm"
              >
                <FileDown className="w-4 h-4 mr-2" />
                <span>Ekspor</span>
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>
              
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2 animate-fade-in origin-top-right">
                  <button
                    onClick={exportToExcel}
                    className="w-full text-left px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors flex items-center"
                  >
                    <Table className="w-4 h-4 mr-3 text-emerald-600" />
                    Format Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="w-full text-left px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-3 text-rose-600" />
                    Format PDF
                  </button>
                </div>
              )}
            </div>
`;
content = content.replace(/<button\s*onClick=\{exportToCSV\}[\s\S]*?<\/button>/g, exportButtonHTML);

fs.writeFileSync(path, content, 'utf8');
console.log('Export updated.');
