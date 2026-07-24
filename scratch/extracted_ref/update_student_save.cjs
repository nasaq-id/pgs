const fs = require('fs');
let code = fs.readFileSync('src/components/StudentModal.tsx', 'utf8');

const validationRegex = /const handleSave = \(\) => \{\s*\/\/ Basic verification\s*const newErrors: Record<string, string> = \{\};\s*if \(\!formData.nama\) newErrors.nama = 'Nama lengkap wajib diisi!';\s*if \(\!formData.nis\) newErrors.nis = 'NIS wajib diisi!';\s*if \(formData.nis && formData.nis.length > 6\) newErrors.nis = 'NIS maksimal 6 karakter!';\s*if \(\!formData.password\) newErrors.password = 'Password siswa wajib diisi!';\s*if \(manualInputs.hoby && \!formData.hoby\) \{\s*newErrors.hoby = 'Sebutkan hobi lainnya!';\s*\}\s*if \(manualInputs.citaCita && \!formData.citaCita\) \{\s*newErrors.citaCita = 'Sebutkan cita-cita lainnya!';\s*\}/;

const newValidation = `const handleSave = () => {
    // Basic verification
    const newErrors: Record<string, string> = {};
    if (!formData.nama) newErrors.nama = 'Nama lengkap wajib diisi!';
    if (!formData.nis) newErrors.nis = 'NIS wajib diisi!';
    if (formData.nis && formData.nis.length > 6) newErrors.nis = 'NIS maksimal 6 karakter!';
    if (!formData.password) newErrors.password = 'Password siswa wajib diisi!';
    
    if (manualInputs.hoby && !formData.hoby) {
      newErrors.hoby = 'Sebutkan hobi lainnya!';
    }
    if (manualInputs.citaCita && !formData.citaCita) {
      newErrors.citaCita = 'Sebutkan cita-cita lainnya!';
    }

    // Validasi HP & Email (Siswa)
    if (formData.hp && (formData.hp.length < 10 || formData.hp.length > 14)) newErrors.hp = 'Nomor HP tidak valid (10-14 digit)!';
    if (formData.email && !formData.email.includes('@')) newErrors.email = 'Email harus mengandung @!';
    if (formData.nik && formData.nik.length !== 16) newErrors.nik = 'NIK harus 16 digit!';

    // Validasi Ayah
    if (formData.ayah?.hp && (formData.ayah.hp.length < 10 || formData.ayah.hp.length > 14)) newErrors.ayah_hp = 'Nomor HP tidak valid (10-14 digit)!';
    if (formData.ayah?.nik && formData.ayah.nik.length !== 16) newErrors.ayah_nik = 'NIK harus 16 digit!';

    // Validasi Ibu
    if (formData.ibu?.hp && (formData.ibu.hp.length < 10 || formData.ibu.hp.length > 14)) newErrors.ibu_hp = 'Nomor HP tidak valid (10-14 digit)!';
    if (formData.ibu?.nik && formData.ibu.nik.length !== 16) newErrors.ibu_nik = 'NIK harus 16 digit!';

    // Validasi Wali
    if (formData.waliData?.hp && (formData.waliData.hp.length < 10 || formData.waliData.hp.length > 14)) newErrors.wali_hp = 'Nomor HP tidak valid (10-14 digit)!';
    if (formData.waliData?.nik && formData.waliData.nik.length !== 16) newErrors.wali_nik = 'NIK harus 16 digit!';
`;

code = code.replace(validationRegex, newValidation);

// Also need to switch tabs if there's an error.
const switchTabRegex = /if \(Object.keys\(newErrors\).length > 0\) \{\s*setErrors\(newErrors\);\s*alert\('Terdapat form yang belum sesuai atau belum diisi, silakan periksa kembali field yang berwarna merah.'\);\s*return;\s*\}/;

const newSwitchTab = `if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Terdapat form yang belum sesuai atau belum diisi, silakan periksa kembali field yang berwarna merah.');
      
      // Auto-switch tabs to show errors
      if (newErrors.nama || newErrors.nis || newErrors.password || newErrors.hoby || newErrors.citaCita || newErrors.hp || newErrors.email || newErrors.nik) {
        setActiveTab('siswa');
      } else if (newErrors.ayah_hp || newErrors.ayah_nik || newErrors.ibu_hp || newErrors.ibu_nik) {
        setActiveTab('ortu');
      } else if (newErrors.wali_hp || newErrors.wali_nik) {
        setActiveTab('wali');
      }
      return;
    }`;

code = code.replace(switchTabRegex, newSwitchTab);

fs.writeFileSync('src/components/StudentModal.tsx', code);
console.log("Updated handleSave in StudentModal");
