const fs = require('fs');
const path = 'src/components/SiswaView.tsx';
let content = fs.readFileSync(path, 'utf8');

const startIdx = content.indexOf('const getTableData = () => {');
const endIdx = content.indexOf('const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {');

const replacement = `
  const formatDateForExcel = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return \`\${parts[2]}/\${parts[1]}/\${parts[0]}\`;
    }
    return dateString;
  };

  const getAllTableHeaders = () => [
    'No', 'NISN', 'NIS', 'Nama Lengkap', 'Username', 'Kelas', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Wali',
    'Status', 'NIK', 'Kewarganegaraan', 'Password', 'Jumlah Saudara', 'Anak Ke', 'Agama', 'Cita-Cita', 'No. HP', 'Email', 'Hobi', 'Pembiaya',
    'Nama Ayah', 'Status Ayah', 'WN Ayah', 'NIK Ayah', 'Tempat Lahir Ayah', 'Tanggal Lahir Ayah', 'Pendidikan Ayah', 'Pekerjaan Ayah', 'Penghasilan Ayah', 'HP Ayah',
    'Nama Ibu', 'Status Ibu', 'WN Ibu', 'NIK Ibu', 'Tempat Lahir Ibu', 'Tanggal Lahir Ibu', 'Pendidikan Ibu', 'Pekerjaan Ibu', 'Penghasilan Ibu', 'HP Ibu',
    'Status Wali', 'Nama Wali', 'WN Wali', 'NIK Wali', 'HP Wali', 'Pendidikan Wali', 'Pekerjaan Wali', 'Penghasilan Wali', 'Hubungan Wali',
    'Jalan', 'RT', 'RW', 'Kelurahan', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Kode Pos'
  ];

  const getAllTableData = () => {
    return filteredStudents.map((std, index) => {
      const s = (val: string | undefined | null) => {
        if (!val) return { t: 's', v: '-' };
        return { t: 's', v: val };
      };
      
      return [
        { t: 'n', v: index + 1 },
        s(std.nisn), s(std.nis), s(std.nama), s(std.username), s(std.kelas), s(std.jk), s(std.tempatLahir), s(formatDateForExcel(std.tanggalLahir)), s(std.wali),
        s(std.status), s(std.nik), s(std.kewarganegaraan), s(std.password), s(std.jumlahSaudara), s(std.anakKe), s(std.agama), s(std.citaCita), s(std.hp), s(std.email), s(std.hoby), s(std.pembiaya),
        s(std.ayah?.nama), s(std.ayah?.status), s(std.ayah?.wn), s(std.ayah?.nik), s(std.ayah?.tempatLahir), s(formatDateForExcel(std.ayah?.tanggalLahir)), s(std.ayah?.pendidikan), s(std.ayah?.pekerjaan), s(std.ayah?.penghasilan), s(std.ayah?.hp),
        s(std.ibu?.nama), s(std.ibu?.status), s(std.ibu?.wn), s(std.ibu?.nik), s(std.ibu?.tempatLahir), s(formatDateForExcel(std.ibu?.tanggalLahir)), s(std.ibu?.pendidikan), s(std.ibu?.pekerjaan), s(std.ibu?.penghasilan), s(std.ibu?.hp),
        s(std.waliData?.statusWali), s(std.waliData?.nama), s(std.waliData?.wn), s(std.waliData?.nik), s(std.waliData?.hp), s(std.waliData?.pendidikan), s(std.waliData?.pekerjaan), s(std.waliData?.penghasilan), s(std.waliData?.hubungan),
        s(std.alamat?.ayah?.jalan), s(std.alamat?.ayah?.rt), s(std.alamat?.ayah?.rw), s(std.alamat?.ayah?.kel), s(std.alamat?.ayah?.kec), s(std.alamat?.ayah?.kab), s(std.alamat?.ayah?.prov), s(std.alamat?.ayah?.kodepos)
      ];
    });
  };

  const exportToExcel = () => {
    const headers = getAllTableHeaders();
    const data = getAllTableData();
    
    const schoolName = institution?.name || 'Nama Sekolah';
    const schoolAddress = institution?.address || 'Alamat Sekolah';
    const schoolYear = institution?.academicYear || '';
    
    const kopRows = [
      [{ t: 's', v: schoolName }],
      [{ t: 's', v: schoolAddress }],
      [{ t: 's', v: \`Data Siswa Tahun Ajaran \${schoolYear}\` }],
      []
    ];
    
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const footerRows = [
      [],
      [{ t: 's', v: \`Diekspor pada: \${exportDate}\` }]
    ];
    
    const aoa = [
      ...kopRows,
      headers.map(h => ({ t: 's', v: h })),
      ...data,
      ...footerRows
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    
    const max_widths = aoa.reduce((acc: number[], row: any[]) => {
      row.forEach((cell, idx) => {
        const val = typeof cell === 'object' && cell !== null ? String(cell.v || '') : String(cell || '');
        acc[idx] = Math.max(acc[idx] || 10, val.length);
      });
      return acc;
    }, []);
    
    worksheet['!cols'] = max_widths.map(w => ({ wch: w + 2 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
    
    XLSX.writeFile(workbook, "Data_Siswa.xlsx");
    setExportDropdownOpen(false);
  };

  const getTableDataForPDF = () => {
    return filteredStudents.map((std, index) => [
      index + 1,
      std.nisn || '-',
      std.nis || '-',
      std.nama || '-',
      std.jk === 'Laki-laki' ? 'L' : std.jk === 'Perempuan' ? 'P' : '-',
      std.kelas || '-',
      \`\${std.tempatLahir || '-'}, \${formatDateForExcel(std.tanggalLahir)}\`,
      std.ayah?.nama || '-',
      std.ibu?.nama || '-',
      std.hp || '-',
      std.waliData?.hp || std.ayah?.hp || '-'
    ]);
  };

  const getTableHeadersForPDF = () => [
    'No', 'NISN', 'NIS', 'Nama Siswa', 'Jenis Kelamin', 'Kelas', 'Tempat, Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'No.HP/WA Siswa', 'No.HP/WA Wali'
  ];

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
    
    try {
      const isMadrasah = schoolName.toLowerCase().includes('madrasah') || schoolName.toLowerCase().includes('mi') || schoolName.toLowerCase().includes('mts') || schoolName.toLowerCase().includes('ma');
      const rightLogoUrl = isMadrasah 
        ? 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Lambang_Kementerian_Agama_Republik_Indonesia.png'
        : 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png';
      
      const rightLogoBase64 = await getBase64ImageFromUrl(rightLogoUrl);
      doc.addImage(rightLogoBase64, 'PNG', doc.internal.pageSize.getWidth() - 40, 10, 25, 25);
    } catch(e) { console.error('Failed to load right logo', e); }

    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

    autoTable(doc, {
      startY: 45,
      head: [getTableHeadersForPDF()],
      body: getTableDataForPDF(),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
      },
      didDrawPage: function (data: any) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        const str = \`Diekspor pada: \${exportDate} - Halaman \${data.pageCount}\`;
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      }
    });
    
    doc.save("Data_Siswa.pdf");
    setExportDropdownOpen(false);
  };

  `;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated exports.');
