const fs = require('fs');
const path = 'src/components/SiswaView.tsx';
let content = fs.readFileSync(path, 'utf8');

const exportPdfFuncStart = content.indexOf('const exportToPDF = async () => {');

const replaceCode = `
  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Canvas context null'));
        }
      };
      img.onerror = () => reject(new Error('Image load error'));
      img.src = url;
    });
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
    
    // Attempt to load logos
    // Left Logo (School)
    if (institution?.logo) {
      try {
        if (institution.logo.startsWith('data:image')) {
          doc.addImage(institution.logo, 'PNG', 15, 10, 25, 25);
        } else {
          const logoBase64 = await getBase64ImageFromUrl(institution.logo);
          doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
        }
      } catch(e) { console.error('Failed to load left logo', e); }
    }
    
    // Right Logo (Tut Wuri / Kemenag)
    try {
      const isMadrasah = schoolName.toLowerCase().includes('madrasah') || schoolName.toLowerCase().includes('mi') || schoolName.toLowerCase().includes('mts') || schoolName.toLowerCase().includes('ma');
      const rightLogoUrl = isMadrasah 
        ? 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Lambang_Kementerian_Agama_Republik_Indonesia.png'
        : 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png';
      
      const rightLogoBase64 = await getBase64ImageFromUrl(rightLogoUrl);
      doc.addImage(rightLogoBase64, 'PNG', doc.internal.pageSize.getWidth() - 40, 10, 25, 25);
    } catch(e) { console.error('Failed to load right logo', e); }

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

const exportPdfFuncEnd = content.indexOf('};', content.indexOf('doc.save("Data_Siswa.pdf");')) + 2;

content = content.substring(0, exportPdfFuncStart) + replaceCode + content.substring(exportPdfFuncEnd);

fs.writeFileSync(path, content, 'utf8');
