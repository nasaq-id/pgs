import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Eye, EyeOff } from 'lucide-react';
import { Student, ParentData, AddressDetails, DomisiliDetails, WaliData } from '../types';
import { PROVINCES, MOCK_CITIES, MOCK_DISTRICTS, MOCK_SUBDISTRICTS, EMPTY_STUDENT } from '../mockData';
import { SearchableSelect } from './SearchableSelect';
import { generateUUID } from '../lib/supabaseClient';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  editingStudent: Student | null;
  students: Student[];
}

type TabType = 'siswa' | 'ortu' | 'wali' | 'alamat';

const formatDateToDisplay = (dateString?: string) => {
  if (!dateString) return '';
  if (dateString.includes('-')) {
    const [y, m, d] = dateString.split('-');
    if (y && y.length === 4) return `${d}/${m}/${y}`;
  }
  return dateString;
};

const parseDateToDb = (dateString?: string) => {
  if (!dateString) return '';
  if (dateString.includes('/')) {
    const [d, m, y] = dateString.split('/');
    if (y && y.length === 4) return `${y}-${m}-${d}`;
    return ''; // Invalid/incomplete date format
  }
  return dateString;
};

const handleDateInput = (val: string) => {
  let v = val.replace(/\D/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length >= 5) {
    return `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
  } else if (v.length >= 3) {
    return `${v.slice(0,2)}/${v.slice(2)}`;
  }
  return v;
};

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingStudent,
  students,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('siswa');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Core Form State
  const [formData, setFormData] = useState<Student>(EMPTY_STUDENT(''));

  // Sync / Lock Controls
  const [alamatIbuSamaDenganAyah, setAlamatIbuSamaDenganAyah] = useState(false);

  // Custom Options State for Hobi & Cita-Cita
        
  // Manual input toggles for address fields (for when mock lists are empty or they want custom text)
  const [manualInputs, setManualInputs] = useState({
    hoby: false,
    citaCita: false,
    ayahKab: false,
    ayahKec: false,
    ayahKel: false,
    ibuKab: false,
    ibuKec: false,
    ibuKel: false,
    waliKab: false,
    waliKec: false,
    waliKel: false,
  });

  // Caches for dynamic Indonesian regional data from API
  const provinceCache = useRef<{ [name: string]: string }>({});
  const regencyCache = useRef<{ [provId: string]: any[] }>({});
  const regencyIdCache = useRef<{ [key: string]: string }>({});
  const districtCache = useRef<{ [regId: string]: any[] }>({});
  const districtIdCache = useRef<{ [key: string]: string }>({});
  const villageCache = useRef<{ [distId: string]: any[] }>({});

  // Dropdown states for each party (Ayah, Ibu, Wali)
  const [ayahCities, setAyahCities] = useState<string[]>([]);
  const [ayahDistricts, setAyahDistricts] = useState<string[]>([]);
  const [ayahVillages, setAyahVillages] = useState<string[]>([]);

  const [ibuCities, setIbuCities] = useState<string[]>([]);
  const [ibuDistricts, setIbuDistricts] = useState<string[]>([]);
  const [ibuVillages, setIbuVillages] = useState<string[]>([]);

  const [waliCities, setWaliCities] = useState<string[]>([]);
  const [waliDistricts, setWaliDistricts] = useState<string[]>([]);
  const [waliVillages, setWaliVillages] = useState<string[]>([]);

  // Format Helper
  const toTitleCase = (str: string) => {
    return str.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
  };

  // Pre-clean function for comparison
  const cleanDistrictName = (name: string) => {
    return name.toUpperCase();
  };
  
  const cleanRegencyName = (name: string) => {
    return name.replace(/^(KABUPATEN|KOTA)\s+/i, '').toUpperCase();
  };

  // Resolve matching IDs
  const getProvinceId = (provName: string): string | undefined => {
    if (!provName) return undefined;
    const upper = provName.toUpperCase();
    return provinceCache.current[upper];
  };

  const getRegencyId = (provId: string | undefined, regName: string): string | undefined => {
    if (!provId || !regName) return undefined;
    const key = `${provId}_${cleanRegencyName(regName)}`;
    return regencyIdCache.current[key];
  };

  const getDistrictId = (regId: string | undefined, distName: string): string | undefined => {
    if (!regId || !distName) return undefined;
    const key = `${regId}_${cleanDistrictName(distName)}`;
    return districtIdCache.current[key];
  };

  // API Call Helpers
  const fetchProvinces = async () => {
    try {
      const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
      if (!res.ok) throw new Error('Failed to fetch provinces');
      const data = await res.json();
      const cache: { [name: string]: string } = {};
      data.forEach((p: any) => {
        cache[p.name.toUpperCase()] = p.id;
      });
      provinceCache.current = cache;
    } catch (err) {
      console.warn('Fallback to local province mapping:', err);
    }
  };

  const fetchRegencies = async (provId: string) => {
    if (regencyCache.current[provId]) return regencyCache.current[provId];
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`);
      if (!res.ok) throw new Error('Failed to fetch regencies');
      const data = await res.json();
      regencyCache.current[provId] = data;
      data.forEach((r: any) => {
        const key = `${provId}_${cleanRegencyName(r.name)}`;
        regencyIdCache.current[key] = r.id;
      });
      return data;
    } catch (err) {
      console.warn('Fallback to local regency mapping:', err);
      return [];
    }
  };

  const fetchDistricts = async (regId: string) => {
    if (districtCache.current[regId]) return districtCache.current[regId];
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regId}.json`);
      if (!res.ok) throw new Error('Failed to fetch districts');
      const data = await res.json();
      districtCache.current[regId] = data;
      data.forEach((d: any) => {
        const key = `${regId}_${d.name.toUpperCase()}`;
        districtIdCache.current[key] = d.id;
      });
      return data;
    } catch (err) {
      console.warn('Fallback to local district mapping:', err);
      return [];
    }
  };

  const fetchVillages = async (distId: string) => {
    if (villageCache.current[distId]) return villageCache.current[distId];
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${distId}.json`);
      if (!res.ok) throw new Error('Failed to fetch villages');
      const data = await res.json();
      villageCache.current[distId] = data;
      return data;
    } catch (err) {
      console.warn('Fallback to local village mapping:', err);
      return [];
    }
  };

  // Load provinces on mount and when modal opens
  useEffect(() => {
    fetchProvinces();
  }, [isOpen]);

  // 1. Ayah address cascade
  useEffect(() => {
    const loadAyahCities = async () => {
      const provName = formData.alamat.ayah.prov;
      if (!provName) {
        setAyahCities([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (provId) {
        const regencies = await fetchRegencies(provId);
        setAyahCities(regencies.map((r: any) => toTitleCase(cleanRegencyName(r.name))));
      } else {
        setAyahCities(getCitiesForProvince(provName).map(name => toTitleCase(cleanRegencyName(name))));
      }
    };
    loadAyahCities();
  }, [formData.alamat.ayah.prov]);

  useEffect(() => {
    const loadAyahDistricts = async () => {
      const provName = formData.alamat.ayah.prov;
      const regName = formData.alamat.ayah.kab;
      if (!provName || !regName) {
        setAyahDistricts([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (!provId) {
        setAyahDistricts(getDistrictsForCity(regName));
        return;
      }
      const regId = getRegencyId(provId, regName);
      if (regId) {
        const districts = await fetchDistricts(regId);
        setAyahDistricts(districts.map((d: any) => toTitleCase(d.name)));
      } else {
        setAyahDistricts(getDistrictsForCity(regName).map(name => name.replace(/^Kecamatan\s+/i, '')));
      }
    };
    loadAyahDistricts();
  }, [formData.alamat.ayah.prov, formData.alamat.ayah.kab]);

  useEffect(() => {
    const loadAyahVillages = async () => {
      const provName = formData.alamat.ayah.prov;
      const regName = formData.alamat.ayah.kab;
      const distName = formData.alamat.ayah.kec;
      if (!provName || !regName || !distName) {
        setAyahVillages([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (!provId) {
        setAyahVillages(getSubdistrictsForDistrict(distName));
        return;
      }
      const regId = getRegencyId(provId, regName);
      if (!regId) {
        setAyahVillages(getSubdistrictsForDistrict(distName));
        return;
      }
      const distId = getDistrictId(regId, distName);
      if (distId) {
        const villages = await fetchVillages(distId);
        setAyahVillages(villages.map((v: any) => toTitleCase(v.name)));
      } else {
        setAyahVillages(getSubdistrictsForDistrict(distName).map(name => name.replace(/^Kelurahan\s+/i, '')));
      }
    };
    loadAyahVillages();
  }, [formData.alamat.ayah.prov, formData.alamat.ayah.kab, formData.alamat.ayah.kec]);

  // 2. Ibu address cascade
  useEffect(() => {
    const loadIbuCities = async () => {
      const provName = formData.alamat.ibu.prov;
      if (!provName) {
        setIbuCities([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (provId) {
        const regencies = await fetchRegencies(provId);
        setIbuCities(regencies.map((r: any) => toTitleCase(cleanRegencyName(r.name))));
      } else {
        setIbuCities(getCitiesForProvince(provName).map(name => toTitleCase(cleanRegencyName(name))));
      }
    };
    loadIbuCities();
  }, [formData.alamat.ibu.prov]);

  useEffect(() => {
    const loadIbuDistricts = async () => {
      const provName = formData.alamat.ibu.prov;
      const regName = formData.alamat.ibu.kab;
      if (!provName || !regName) {
        setIbuDistricts([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (!provId) {
        setIbuDistricts(getDistrictsForCity(regName));
        return;
      }
      const regId = getRegencyId(provId, regName);
      if (regId) {
        const districts = await fetchDistricts(regId);
        setIbuDistricts(districts.map((d: any) => toTitleCase(d.name)));
      } else {
        setIbuDistricts(getDistrictsForCity(regName).map(name => name.replace(/^Kecamatan\s+/i, '')));
      }
    };
    loadIbuDistricts();
  }, [formData.alamat.ibu.prov, formData.alamat.ibu.kab]);

  useEffect(() => {
    const loadIbuVillages = async () => {
      const provName = formData.alamat.ibu.prov;
      const regName = formData.alamat.ibu.kab;
      const distName = formData.alamat.ibu.kec;
      if (!provName || !regName || !distName) {
        setIbuVillages([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (!provId) {
        setIbuVillages(getSubdistrictsForDistrict(distName));
        return;
      }
      const regId = getRegencyId(provId, regName);
      if (!regId) {
        setIbuVillages(getSubdistrictsForDistrict(distName));
        return;
      }
      const distId = getDistrictId(regId, distName);
      if (distId) {
        const villages = await fetchVillages(distId);
        setIbuVillages(villages.map((v: any) => toTitleCase(v.name)));
      } else {
        setIbuVillages(getSubdistrictsForDistrict(distName).map(name => name.replace(/^Kelurahan\s+/i, '')));
      }
    };
    loadIbuVillages();
  }, [formData.alamat.ibu.prov, formData.alamat.ibu.kab, formData.alamat.ibu.kec]);

  // 3. Wali address cascade
  useEffect(() => {
    const loadWaliCities = async () => {
      const provName = formData.alamat.wali.prov;
      if (!provName) {
        setWaliCities([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (provId) {
        const regencies = await fetchRegencies(provId);
        setWaliCities(regencies.map((r: any) => toTitleCase(cleanRegencyName(r.name))));
      } else {
        setWaliCities(getCitiesForProvince(provName).map(name => toTitleCase(cleanRegencyName(name))));
      }
    };
    loadWaliCities();
  }, [formData.alamat.wali.prov]);

  useEffect(() => {
    const loadWaliDistricts = async () => {
      const provName = formData.alamat.wali.prov;
      const regName = formData.alamat.wali.kab;
      if (!provName || !regName) {
        setWaliDistricts([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (!provId) {
        setWaliDistricts(getDistrictsForCity(regName));
        return;
      }
      const regId = getRegencyId(provId, regName);
      if (regId) {
        const districts = await fetchDistricts(regId);
        setWaliDistricts(districts.map((d: any) => toTitleCase(d.name)));
      } else {
        setWaliDistricts(getDistrictsForCity(regName).map(name => name.replace(/^Kecamatan\s+/i, '')));
      }
    };
    loadWaliDistricts();
  }, [formData.alamat.wali.prov, formData.alamat.wali.kab]);

  useEffect(() => {
    const loadWaliVillages = async () => {
      const provName = formData.alamat.wali.prov;
      const regName = formData.alamat.wali.kab;
      const distName = formData.alamat.wali.kec;
      if (!provName || !regName || !distName) {
        setWaliVillages([]);
        return;
      }
      if (Object.keys(provinceCache.current).length === 0) {
        await fetchProvinces();
      }
      const provId = getProvinceId(provName);
      if (!provId) {
        setWaliVillages(getSubdistrictsForDistrict(distName));
        return;
      }
      const regId = getRegencyId(provId, regName);
      if (!regId) {
        setWaliVillages(getSubdistrictsForDistrict(distName));
        return;
      }
      const distId = getDistrictId(regId, distName);
      if (distId) {
        const villages = await fetchVillages(distId);
        setWaliVillages(villages.map((v: any) => toTitleCase(v.name)));
      } else {
        setWaliVillages(getSubdistrictsForDistrict(distName).map(name => name.replace(/^Kelurahan\s+/i, '')));
      }
    };
    loadWaliVillages();
  }, [formData.alamat.wali.prov, formData.alamat.wali.kab, formData.alamat.wali.kec]);

  useEffect(() => {
    if (editingStudent) {
      setFormData({ 
        ...editingStudent,
        tanggalLahir: formatDateToDisplay(editingStudent.tanggalLahir),
        ayah: {
          ...editingStudent.ayah,
          tanggalLahir: formatDateToDisplay(editingStudent.ayah?.tanggalLahir)
        },
        ibu: {
          ...editingStudent.ibu,
          tanggalLahir: formatDateToDisplay(editingStudent.ibu?.tanggalLahir)
        }
      });
      setAlamatIbuSamaDenganAyah(editingStudent.alamat.ibu.samaDenganAyah || false);

      // Determine if existing address fields are custom (not in mock data)
      const provAyah = editingStudent.alamat.ayah.prov || '';
      const kabAyah = editingStudent.alamat.ayah.kab || '';
      const kecAyah = editingStudent.alamat.ayah.kec || '';
      const kelAyah = editingStudent.alamat.ayah.kel || '';

      const citiesAyah = MOCK_CITIES[provAyah] || [];
      const distsAyah = MOCK_DISTRICTS[kabAyah] || [];
      const subdistAyah = MOCK_SUBDISTRICTS[kecAyah] || [];

      const provIbu = editingStudent.alamat.ibu.prov || '';
      const kabIbu = editingStudent.alamat.ibu.kab || '';
      const kecIbu = editingStudent.alamat.ibu.kec || '';
      const kelIbu = editingStudent.alamat.ibu.kel || '';

      const citiesIbu = MOCK_CITIES[provIbu] || [];
      const distsIbu = MOCK_DISTRICTS[kabIbu] || [];
      const subdistIbu = MOCK_SUBDISTRICTS[kecIbu] || [];

      const provWali = editingStudent.alamat.wali.prov || '';
      const kabWali = editingStudent.alamat.wali.kab || '';
      const kecWali = editingStudent.alamat.wali.kec || '';
      const kelWali = editingStudent.alamat.wali.kel || '';

      const citiesWali = MOCK_CITIES[provWali] || [];
      const distsWali = MOCK_DISTRICTS[kabWali] || [];
      const subdistWali = MOCK_SUBDISTRICTS[kecWali] || [];

      setManualInputs({
        hoby: !!editingStudent.hoby && !['Olahraga', 'Kesenian', 'Membaca', 'Menulis', 'Jalan-jalan'].includes(editingStudent.hoby),
        citaCita: !!editingStudent.citaCita && !['PNS', 'TNI/Polri', 'Guru/Dosen', 'Dokter', 'Politikus', 'Wiraswasta', 'Seniman/Artis', 'Ilmuwan', 'Agamawan'].includes(editingStudent.citaCita),
        ayahKab: kabAyah !== '' && citiesAyah.length > 0 && !citiesAyah.includes(kabAyah),
        ayahKec: kecAyah !== '' && distsAyah.length > 0 && !distsAyah.includes(kecAyah),
        ayahKel: kelAyah !== '' && subdistAyah.length > 0 && !subdistAyah.includes(kelAyah),
        ibuKab: kabIbu !== '' && citiesIbu.length > 0 && !citiesIbu.includes(kabIbu),
        ibuKec: kecIbu !== '' && distsIbu.length > 0 && !distsIbu.includes(kecIbu),
        ibuKel: kelIbu !== '' && subdistIbu.length > 0 && !subdistIbu.includes(kelIbu),
        waliKab: kabWali !== '' && citiesWali.length > 0 && !citiesWali.includes(kabWali),
        waliKec: kecWali !== '' && distsWali.length > 0 && !distsWali.includes(kecWali),
        waliKel: kelWali !== '' && subdistWali.length > 0 && !subdistWali.includes(kelWali),
      });
    } else {
      const generatedId = generateUUID();
      setFormData(EMPTY_STUDENT(generatedId));
      setAlamatIbuSamaDenganAyah(false);
      setManualInputs({
        hoby: false,
        citaCita: false,
        ayahKab: false,
        ayahKec: false,
        ayahKel: false,
        ibuKab: false,
        ibuKec: false,
        ibuKel: false,
        waliKab: false,
        waliKec: false,
        waliKel: false,
      });
    }
    setActiveTab('siswa');
  }, [editingStudent, isOpen]);

  if (!isOpen) return null;

  const handleTextChange = (path: string, value: string | boolean | number) => {
    setErrors((prev) => {
      if (prev[path]) {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      }
      return prev;
    });
    setFormData((prev) => {
      const updated = { ...prev };
      
      if (path === 'nama') {
        updated.nama = value as string;
      } else if (path === 'nisn') {
        updated.nisn = value as string;
      } else if (path === 'nis') {
        const sanitized = (value as string).replace(/\s+/g, '').slice(0, 6);
        updated.nis = sanitized;
        // Auto-update username based on NIS
        updated.username = sanitized.toLowerCase().replace(/\s+/g, '_');
      } else if (path === 'kelas') {
        updated.kelas = value as string;
      } else if (path === 'jk') {
        updated.jk = value as 'Laki-laki' | 'Perempuan';
      } else if (path === 'tempatLahir') {
        updated.tempatLahir = value as string;
      } else if (path === 'tanggalLahir') {
        updated.tanggalLahir = value as string;
      } else if (path === 'status') {
        updated.status = value as 'Aktif' | 'Non-Aktif' | 'Lulus' | 'Pindah' | 'Dikeluarkan';
      } else if (path === 'nik') {
        updated.nik = value as string;
      } else if (path === 'kewarganegaraan') {
        updated.kewarganegaraan = value as 'WNI' | 'WNA';
      } else if (path === 'password') {
        updated.password = value as string;
      } else if (path === 'jumlahSaudara') {
        updated.jumlahSaudara = value as string;
      } else if (path === 'anakKe') {
        updated.anakKe = value as string;
      } else if (path === 'agama') {
        updated.agama = value as string;
      } else if (path === 'citaCita') {
        updated.citaCita = value as string;
      } else if (path === 'hp') {
        updated.hp = value as string;
      } else if (path === 'email') {
        updated.email = value as string;
      } else if (path === 'hoby') {
        updated.hoby = value as string;
      } else if (path === 'pembiaya') {
        updated.pembiaya = value as string;
      } else if (path === 'foto') {
        updated.foto = value as string;
      }

      return updated;
    });
  };

  const handleParentChange = (parent: 'ayah' | 'ibu', field: keyof ParentData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev };
      const parentData = { ...updated[parent] };
      (parentData[field] as any) = value;

      // Handle lock fields if status is not alive
      if (field === 'status') {
        if (value === 'Sudah Meninggal' || value === 'Tidak Diketahui') {
          parentData.wn = 'WNI';
          parentData.nik = '';
          parentData.tempatLahir = '';
          parentData.tanggalLahir = '';
          parentData.pendidikan = '';
          parentData.pekerjaan = 'Tidak Bekerja';
          parentData.penghasilan = '';
          parentData.hp = '';
        }
      }

      if (field === 'pekerjaan') {
        if (value === 'Tidak Bekerja') {
          parentData.penghasilan = '';
        }
      }

      updated[parent] = parentData;

      // Also trigger wali auto-update if wali status is set to copy from this parent
      if (updated.waliData.statusWali === `Sama dengan ${parent} kandung`) {
        updated.waliData = {
          ...updated.waliData,
          nama: parentData.nama,
          wn: parentData.wn,
          nik: parentData.nik,
          hp: parentData.hp,
          pendidikan: parentData.pendidikan,
          pekerjaan: parentData.pekerjaan,
          penghasilan: parentData.penghasilan,
          hubungan: parent === 'ayah' ? 'Ayah Kandung' : 'Ibu Kandung',
        };
        // Auto update main wali name
        updated.wali = parentData.nama;
      }

      return updated;
    });
  };

  const handleWaliStatusChange = (statusWali: string) => {
    setFormData((prev) => {
      const updated = { ...prev };
      let newWaliData: WaliData = {
        statusWali,
        nama: '',
        wn: 'WNI',
        nik: '',
        hp: '',
        pendidikan: '',
        pekerjaan: '',
        penghasilan: '',
        hubungan: '',
      };

      if (statusWali === 'Sama dengan ayah kandung') {
        newWaliData = {
          statusWali,
          nama: updated.ayah.nama,
          wn: updated.ayah.wn,
          nik: updated.ayah.nik,
          hp: updated.ayah.hp,
          pendidikan: updated.ayah.pendidikan,
          pekerjaan: updated.ayah.pekerjaan,
          penghasilan: updated.ayah.penghasilan,
          hubungan: 'Ayah Kandung',
        };
      } else if (statusWali === 'Sama dengan ibu kandung') {
        newWaliData = {
          statusWali,
          nama: updated.ibu.nama,
          wn: updated.ibu.wn,
          nik: updated.ibu.nik,
          hp: updated.ibu.hp,
          pendidikan: updated.ibu.pendidikan,
          pekerjaan: updated.ibu.pekerjaan,
          penghasilan: updated.ibu.penghasilan,
          hubungan: 'Ibu Kandung',
        };
      }

      updated.waliData = newWaliData;
      updated.wali = newWaliData.nama;
      return updated;
    });
  };

  const handleWaliDataChange = (field: keyof WaliData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev };
      const wd = { ...updated.waliData };
      (wd[field] as any) = value;
      if (field === 'pekerjaan' && value === 'Tidak Bekerja') {
        wd.penghasilan = '';
      }
      updated.waliData = wd;
      if (field === 'nama') {
        updated.wali = value;
      }
      return updated;
    });
  };

  // Alamat Sync & Locks
  const handleAlamatChange = (
    party: 'ayah' | 'ibu' | 'wali',
    field: keyof AddressDetails,
    value: string
  ) => {
    const errorKey = `${party}_${field}`;
    setErrors((prev) => {
      if (prev[errorKey]) {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      }
      return prev;
    });

    setFormData((prev) => {
      const updated = { ...prev };
      const partyAlamat = { ...updated.alamat[party] } as any;
      partyAlamat[field] = value;

      // Reset dependent fields to prevent stale data
      if (field === 'prov') {
        partyAlamat.kab = '';
        partyAlamat.kec = '';
        partyAlamat.kel = '';
      } else if (field === 'kab') {
        partyAlamat.kec = '';
        partyAlamat.kel = '';
      } else if (field === 'kec') {
        partyAlamat.kel = '';
      }

      updated.alamat[party] = partyAlamat;

      // If mother's address is synced with father's
      if (party === 'ayah' && alamatIbuSamaDenganAyah) {
        updated.alamat.ibu = {
          ...updated.alamat.ibu,
          [field]: value,
        };
        if (field === 'prov') {
          updated.alamat.ibu.kab = '';
          updated.alamat.ibu.kec = '';
          updated.alamat.ibu.kel = '';
        } else if (field === 'kab') {
          updated.alamat.ibu.kec = '';
          updated.alamat.ibu.kel = '';
        } else if (field === 'kec') {
          updated.alamat.ibu.kel = '';
        }
      }

      // If wali's address is copied from father or mother
      const waliAddressStatus = updated.alamat.wali.statusAlamatWali;
      if (party === 'ayah' && waliAddressStatus === 'Sama dengan ayah kandung') {
        updated.alamat.wali = {
          ...updated.alamat.wali,
          [field]: value,
        };
        if (field === 'prov') {
          updated.alamat.wali.kab = '';
          updated.alamat.wali.kec = '';
          updated.alamat.wali.kel = '';
        } else if (field === 'kab') {
          updated.alamat.wali.kec = '';
          updated.alamat.wali.kel = '';
        } else if (field === 'kec') {
          updated.alamat.wali.kel = '';
        }
      } else if (party === 'ibu' && waliAddressStatus === 'Sama dengan ibu kandung') {
        updated.alamat.wali = {
          ...updated.alamat.wali,
          [field]: value,
        };
        if (field === 'prov') {
          updated.alamat.wali.kab = '';
          updated.alamat.wali.kec = '';
          updated.alamat.wali.kel = '';
        } else if (field === 'kab') {
          updated.alamat.wali.kec = '';
          updated.alamat.wali.kel = '';
        } else if (field === 'kec') {
          updated.alamat.wali.kel = '';
        }
      }

      return updated;
    });
  };

  const handleAlamatIbuSamaDenganAyahChange = (checked: boolean) => {
    setAlamatIbuSamaDenganAyah(checked);
    setFormData((prev) => {
      const updated = { ...prev };
      updated.alamat.ibu.samaDenganAyah = checked;
      if (checked) {
        updated.alamat.ibu = {
          ...updated.alamat.ibu,
          samaDenganAyah: true,
          kepemilikan: updated.alamat.ayah.kepemilikan,
          prov: updated.alamat.ayah.prov,
          kab: updated.alamat.ayah.kab,
          kec: updated.alamat.ayah.kec,
          kel: updated.alamat.ayah.kel,
          rt: updated.alamat.ayah.rt,
          rw: updated.alamat.ayah.rw,
          kodepos: updated.alamat.ayah.kodepos,
          jalan: updated.alamat.ayah.jalan,
        };
      } else {
        updated.alamat.ibu = {
          ...updated.alamat.ibu,
          samaDenganAyah: false,
          kepemilikan: '',
          prov: '',
          kab: '',
          kec: '',
          kel: '',
          rt: '',
          rw: '',
          kodepos: '',
          jalan: '',
        };
      }
      return updated;
    });
  };

  const handleAlamatWaliStatusChange = (status: string) => {
    setFormData((prev) => {
      const updated = { ...prev };
      let newWaliAlamat = {
        statusAlamatWali: status,
        kepemilikan: '',
        prov: '',
        kab: '',
        kec: '',
        kel: '',
        rt: '',
        rw: '',
        kodepos: '',
        jalan: '',
      };

      if (status === 'Sama dengan ayah kandung') {
        newWaliAlamat = {
          statusAlamatWali: status,
          ...updated.alamat.ayah,
        };
      } else if (status === 'Sama dengan ibu kandung') {
        newWaliAlamat = {
          statusAlamatWali: status,
          ...updated.alamat.ibu,
        };
      }

      updated.alamat.wali = newWaliAlamat;
      return updated;
    });
  };

  const handleDomisiliChange = (field: keyof DomisiliDetails, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev };
      updated.alamat.domisili = {
        ...updated.alamat.domisili,
        [field]: value,
      };
      return updated;
    });
  };

  const handleNextTab = () => {
    if (activeTab === 'siswa') {
      setActiveTab('ortu');
    } else if (activeTab === 'ortu') {
      setActiveTab('wali');
    } else if (activeTab === 'wali') {
      setActiveTab('alamat');
    }
  };

  const handlePrevTab = () => {
    if (activeTab === 'ortu') {
      setActiveTab('siswa');
    } else if (activeTab === 'wali') {
      setActiveTab('ortu');
    } else if (activeTab === 'alamat') {
      setActiveTab('wali');
    }
  };

  const handleSave = () => {
    // Basic verification
    const newErrors: Record<string, string> = {};
    if (!formData.nama) newErrors.nama = 'Nama lengkap wajib diisi!';
    
    let finalNis = formData.nis ? formData.nis.trim() : '';
    if (finalNis && /^\d+$/.test(finalNis) && finalNis.length < 6) {
      finalNis = finalNis.padStart(6, '0');
    }

    if (!finalNis) {
      newErrors.nis = 'NIS wajib diisi!';
    } else if (!/^\d+$/.test(finalNis)) {
      newErrors.nis = 'NIS harus berupa angka!';
    } else if (finalNis.length !== 6) {
      newErrors.nis = 'NIS harus terdiri dari 6 angka!';
    } else {
      const isDuplicate = students.some(s => s.nis === finalNis && s.id !== formData.id);
      if (isDuplicate) {
        newErrors.nis = 'NIS sudah dipakai!';
      }
    }
    if (!formData.password) newErrors.password = 'Password siswa wajib diisi!';
    if (!formData.jk) newErrors.jk = 'Jenis Kelamin wajib diisi!';
    
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

    // Validasi Alamat (Ayah, Ibu, Wali)
    // Ayah address
    if (formData.alamat.ayah.rt && formData.alamat.ayah.rt.length !== 3) {
      newErrors.ayah_rt = 'RT harus terdiri dari 3 angka, contoh: 001!';
    }
    if (formData.alamat.ayah.rw && formData.alamat.ayah.rw.length !== 3) {
      newErrors.ayah_rw = 'RW harus terdiri dari 3 angka, contoh: 001!';
    }
    if (formData.alamat.ayah.kodepos && formData.alamat.ayah.kodepos.length !== 5) {
      newErrors.ayah_kodepos = 'Kode Pos harus terdiri dari 5 angka!';
    }

    // Ibu address (only if not copied from Ayah)
    if (!alamatIbuSamaDenganAyah) {
      if (formData.alamat.ibu.rt && formData.alamat.ibu.rt.length !== 3) {
        newErrors.ibu_rt = 'RT harus terdiri dari 3 angka, contoh: 001!';
      }
      if (formData.alamat.ibu.rw && formData.alamat.ibu.rw.length !== 3) {
        newErrors.ibu_rw = 'RW harus terdiri dari 3 angka, contoh: 001!';
      }
      if (formData.alamat.ibu.kodepos && formData.alamat.ibu.kodepos.length !== 5) {
        newErrors.ibu_kodepos = 'Kode Pos harus terdiri dari 5 angka!';
      }
    }

    // Wali address (only if not copied)
    const isWaliAddressIndependent = formData.alamat.wali.statusAlamatWali === 'Lainnya' || formData.alamat.wali.statusAlamatWali === '';
    if (isWaliAddressIndependent) {
      if (formData.alamat.wali.rt && formData.alamat.wali.rt.length !== 3) {
        newErrors.wali_rt = 'RT harus terdiri dari 3 angka, contoh: 001!';
      }
      if (formData.alamat.wali.rw && formData.alamat.wali.rw.length !== 3) {
        newErrors.wali_rw = 'RW harus terdiri dari 3 angka, contoh: 001!';
      }
      if (formData.alamat.wali.kodepos && formData.alamat.wali.kodepos.length !== 5) {
        newErrors.wali_kodepos = 'Kode Pos harus terdiri dari 5 angka!';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Terdapat form yang belum sesuai atau belum diisi, silakan periksa kembali field yang berwarna merah.');
      
      // Auto-switch tabs to show errors
      if (newErrors.nama || newErrors.nis || newErrors.password || newErrors.hoby || newErrors.citaCita || newErrors.hp || newErrors.email || newErrors.nik) {
        setActiveTab('siswa');
      } else if (newErrors.ayah_hp || newErrors.ayah_nik || newErrors.ibu_hp || newErrors.ibu_nik) {
        setActiveTab('ortu');
      } else if (newErrors.wali_hp || newErrors.wali_nik) {
        setActiveTab('wali');
      } else if (
        newErrors.ayah_rt || newErrors.ayah_rw || newErrors.ayah_kodepos ||
        newErrors.ibu_rt || newErrors.ibu_rw || newErrors.ibu_kodepos ||
        newErrors.wali_rt || newErrors.wali_rw || newErrors.wali_kodepos
      ) {
        setActiveTab('alamat');
      }
      return;
    }

    const dataToSave: Student = {
      ...formData,
      nis: finalNis,
      tanggalLahir: parseDateToDb(formData.tanggalLahir),
      ayah: {
        ...formData.ayah,
        tanggalLahir: parseDateToDb(formData.ayah?.tanggalLahir)
      },
      ibu: {
        ...formData.ibu,
        tanggalLahir: parseDateToDb(formData.ibu?.tanggalLahir)
      }
    };
    onSave(dataToSave);
  };

  // Helper arrays for regional dropdown dependencies
  const getCitiesForProvince = (prov: string) => MOCK_CITIES[prov] || [];
  
  const getDistrictsForCity = (city: string) => {
    if (!city) return [];
    if (MOCK_DISTRICTS[city]) return MOCK_DISTRICTS[city];
    
    // Generate realistic kecamatan if not defined in mock data
    const cleanCity = city.replace(/^(Kota|Kabupaten)\s+/i, '');
    return [
      `Kecamatan ${cleanCity} Tengah`,
      `Kecamatan ${cleanCity} Utara`,
      `Kecamatan ${cleanCity} Selatan`,
      `Kecamatan ${cleanCity} Barat`,
      `Kecamatan ${cleanCity} Timur`
    ];
  };

  const getSubdistrictsForDistrict = (dist: string) => {
    if (!dist) return [];
    if (MOCK_SUBDISTRICTS[dist]) return MOCK_SUBDISTRICTS[dist];
    
    // Generate realistic kelurahan/desa if not defined in mock data
    const cleanDist = dist.replace(/^Kecamatan\s+/i, '');
    return [
      `Kelurahan ${cleanDist} Jaya`,
      `Kelurahan ${cleanDist} Mulya`,
      `Kelurahan ${cleanDist} Sari`,
      `Desa ${cleanDist} Makmur`,
      `Desa ${cleanDist} Harapan`
    ];
  };

  const isWaliDisabled = formData.alamat.wali.statusAlamatWali !== 'Lainnya' && formData.alamat.wali.statusAlamatWali !== '';

  return (
    <div id="student-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4 lg:p-6 text-left">
      <div className="absolute inset-0 bg-slate-900/40 " onClick={onClose}></div>
      <div className="bg-white rounded-[1.5rem] w-full max-w-5xl h-[95vh] flex flex-col relative shadow-2xl animate-fade-in overflow-hidden z-50">
        
        {/* Header Modal */}
        <div className="px-8 py-5 flex justify-between items-start border-b border-slate-100/50 bg-white z-10 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800" id="modal-title">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
            </h3>
            <p className="text-[13px] text-slate-500 mt-1">
              Lengkapi form di bawah ini. Field bertanda <span className="text-rose-500">*</span> wajib diisi.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-50">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 pt-2 pb-4 bg-white z-10 flex-shrink-0">
          <div className="bg-slate-100/80 p-1.5 rounded-xl flex space-x-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('siswa')}
              className={`flex-1 min-w-[130px] px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'siswa'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30 border border-transparent'
              }`}
            >
              A. Data Siswa
            </button>
            <button
              onClick={() => setActiveTab('ortu')}
              className={`flex-1 min-w-[130px] px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'ortu'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30 border border-transparent'
              }`}
            >
              B. Data Orang Tua
            </button>
            <button
              onClick={() => setActiveTab('wali')}
              className={`flex-1 min-w-[130px] px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'wali'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30 border border-transparent'
              }`}
            >
              C. Data Wali
            </button>
            <button
              onClick={() => setActiveTab('alamat')}
              className={`flex-1 min-w-[130px] px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'alamat'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30 border border-transparent'
              }`}
            >
              D. Data Alamat
            </button>
          </div>
        </div>

        {/* Body Modal (Scrollable Form Area) */}
        <div className="flex-1 overflow-y-auto px-8 py-4 bg-white custom-scrollbar">
          
          {/* TAB A: DATA SISWA */}
          {activeTab === 'siswa' && (
            <div className="space-y-6 animate-fade-in">
              {/* Status Keaktifan Switch */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-3.5 h-3.5 rounded-full ${formData.status === 'Aktif' ? 'bg-[#10b981] animate-pulse' : 'bg-slate-300'}`} />
                  <div>
                    <h4 className="text-[14px] font-bold text-slate-700">Status Keaktifan</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formData.status === 'Aktif' ? 'Siswa Aktif' : 'Siswa Non-Aktif'} (Klik tombol di samping untuk mengubah)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTextChange('status', formData.status === 'Aktif' ? 'Non-Aktif' : 'Aktif')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    formData.status === 'Aktif' ? 'bg-[#10b981]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.status === 'Aktif' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Foto Siswa */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex items-center space-x-6">
                <input
                  id="student-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const { compressImage } = await import('../lib/image');
                        const compressed = await compressImage(file);
                        handleTextChange('foto', compressed);
                      } catch (error) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            handleTextChange('foto', event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                />
                <div 
                  className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shadow-sm overflow-hidden group cursor-pointer"
                  onClick={() => document.getElementById('student-photo-upload')?.click()}
                >
                  {formData.foto ? (
                    <img 
                      src={formData.foto} 
                      alt="Foto Siswa" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Camera className="w-10 h-10 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-slate-700">Foto Siswa</h4>
                  <p className="text-[12px] text-slate-500 mt-1">Upload foto profil siswa (opsional)</p>
                  {formData.foto && (
                    <button
                      type="button"
                      onClick={() => handleTextChange('foto', '')}
                      className="text-xs text-rose-500 hover:text-rose-600 mt-1.5 font-medium cursor-pointer block text-left"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => handleTextChange('nama', e.target.value)}
                    required
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.nama ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.nama && <p className="text-[11px] text-rose-500 mt-1">{errors.nama}</p>}
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">NISN</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="10 digit angka (opsional)"
                    value={formData.nisn}
                    onChange={(e) => handleTextChange('nisn', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">
                    NIS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Contoh: 889210"
                    value={formData.nis}
                    onChange={(e) => handleTextChange('nis', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.nis ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.nis ? (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.nis}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1.5">Maksimal 6 karakter</p>
                  )}
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kewarganegaraan</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.kewarganegaraan}
                    onChange={(val) => handleTextChange('kewarganegaraan', val)}
                    options={['WNI', 'WNA']}
                    placeholder="-- Pilih Kewarganegaraan --"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Username Siswa</label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Otomatis dari NIS"
                    value={formData.username}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-[13px] text-slate-500 pointer-events-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Otomatis terisi dari NIS</p>
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">
                    Password Siswa <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleTextChange('password', e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg border ${errors.password ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[11px] text-rose-500 mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">NIK</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="Harus 16 digit angka"
                    value={formData.nik}
                    onChange={(e) => handleTextChange('nik', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.nik ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.nik && <p className="text-[11px] text-rose-500 mt-1">{errors.nik}</p>}
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.tempatLahir}
                    onChange={(e) => handleTextChange('tempatLahir', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tanggal Lahir</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formData.tanggalLahir}
                    onChange={(e) => handleTextChange('tanggalLahir', handleDateInput(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-6 py-2.5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jk"
                        checked={formData.jk === 'Laki-laki'}
                        onChange={() => handleTextChange('jk', 'Laki-laki')}
                        className="w-4 h-4 text-[#10b981] border-slate-300 focus:ring-[#10b981]"
                      />
                      <span className="text-[13px] text-slate-600">Laki-laki</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jk"
                        checked={formData.jk === 'Perempuan'}
                        onChange={() => handleTextChange('jk', 'Perempuan')}
                        className="w-4 h-4 text-[#10b981] border-slate-300 focus:ring-[#10b981]"
                      />
                      <span className="text-[13px] text-slate-600">Perempuan</span>
                    </label>
                  </div>
                  {errors.jk && <p className="text-[11px] text-rose-500 mt-1">{errors.jk}</p>}
                </div>

                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Jumlah Saudara</label>
                    <input
                      type="number"
                      placeholder="Angka"
                      value={formData.jumlahSaudara}
                      onChange={(e) => handleTextChange('jumlahSaudara', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Anak Ke</label>
                    <input
                      type="number"
                      placeholder="Angka"
                      value={formData.anakKe}
                      onChange={(e) => handleTextChange('anakKe', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Agama</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.agama}
                    onChange={(val) => handleTextChange('agama', val)}
                    options={['Islam', 'Kristen Protestan', 'Katolik', 'Hindu', 'Budha', 'Kong Hu Cu']}
                    placeholder="-- Pilih Agama --"
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hoby Field */}
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Hobi</label>
                      <SearchableSelect
                        showSearch={false}
                        value={manualInputs.hoby ? 'Lainnya' : (formData.hoby || '')}
                        onChange={(val) => {
                          if (val === 'Lainnya') {
                            setManualInputs(prev => ({ ...prev, hoby: true }));
                            handleTextChange('hoby', '');
                          } else {
                            setManualInputs(prev => ({ ...prev, hoby: false }));
                            handleTextChange('hoby', val);
                          }
                        }}
                        options={['Olahraga', 'Kesenian', 'Membaca', 'Menulis', 'Jalan-jalan', 'Lainnya']}
                        placeholder="-- Pilih Hobi --"
                      />
                    </div>
                    {manualInputs.hoby && (
                      <div className="animate-fade-in relative">
                         <input
                           type="text"
                           value={formData.hoby || ''}
                           onChange={(e) => handleTextChange('hoby', e.target.value)}
                           className={`w-full px-4 py-2.5 rounded-lg border ${errors.hoby ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-all placeholder:text-slate-400`}
                           placeholder="Sebutkan Hobi Lainnya..."
                         />
                         {errors.hoby && <p className="text-[11px] text-rose-500 mt-1">{errors.hoby}</p>}
                      </div>
                    )}
                  </div>

                  {/* Cita-cita Field */}
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Cita-cita</label>
                      <SearchableSelect
                        showSearch={false}
                        value={manualInputs.citaCita ? 'Lainnya' : (formData.citaCita || '')}
                        onChange={(val) => {
                          if (val === 'Lainnya') {
                            setManualInputs(prev => ({ ...prev, citaCita: true }));
                            handleTextChange('citaCita', '');
                          } else {
                            setManualInputs(prev => ({ ...prev, citaCita: false }));
                            handleTextChange('citaCita', val);
                          }
                        }}
                        options={['PNS', 'TNI/Polri', 'Guru/Dosen', 'Dokter', 'Politikus', 'Wiraswasta', 'Seniman/Artis', 'Ilmuwan', 'Agamawan', 'Lainnya']}
                        placeholder="-- Pilih Cita-cita --"
                      />
                    </div>
                    {manualInputs.citaCita && (
                      <div className="animate-fade-in relative">
                         <input
                           type="text"
                           value={formData.citaCita || ''}
                           onChange={(e) => handleTextChange('citaCita', e.target.value)}
                           className={`w-full px-4 py-2.5 rounded-lg border ${errors.citaCita ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-all placeholder:text-slate-400`}
                           placeholder="Sebutkan Cita-cita Lainnya..."
                         />
                         {errors.citaCita && <p className="text-[11px] text-rose-500 mt-1">{errors.citaCita}</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">No. HP/Whatsapp</label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="08..."
                    value={formData.hp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleTextChange('hp', val);
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.hp ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.hp && <p className="text-[11px] text-rose-500 mt-1">{errors.hp}</p>}
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Alamat Email</label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={formData.email}
                    onChange={(e) => handleTextChange('email', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.email ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pembiaya Sekolah</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.pembiaya}
                    onChange={(val) => handleTextChange('pembiaya', val)}
                    options={['Orang Tua', 'Wali', 'Mandiri', 'Beasiswa', 'Lainnya']}
                    placeholder="-- Pilih --"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB B: DATA ORANG TUA */}
          {activeTab === 'ortu' && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* A. Ayah Kandung */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 uppercase tracking-widest">
                  A. Ayah Kandung
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Nama Lengkap</label>
                    <input
                      type="text"
                      value={formData.ayah.nama}
                      onChange={(e) => handleParentChange('ayah', 'nama', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Status</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.ayah.status}
                      onChange={(val) => handleParentChange('ayah', 'status', val)}
                      options={['Masih Hidup', 'Meninggal Dunia']}
                      placeholder="-- Pilih --"
                    />
                  </div>
                  
                  {/* Fields Ayah (Only enabled/usable if alive) */}
                  {formData.ayah.status === 'Masih Hidup' && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kewarganegaraan</label>
                        <SearchableSelect
                      showSearch={false}
                          value={formData.ayah.wn}
                          onChange={(val) => handleParentChange('ayah', 'wn', val)}
                          options={['WNI', 'WNA']}
                          placeholder="-- Pilih --"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">NIK</label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="Berisi 16 Angka"
                          value={formData.ayah.nik}
                          onChange={(e) => handleParentChange('ayah', 'nik', e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-lg border ${errors.ayah_nik ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                        />
                  {errors.ayah_nik && <p className="text-[11px] text-rose-500 mt-1">{errors.ayah_nik}</p>}
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tempat Lahir</label>
                        <input
                          type="text"
                          value={formData.ayah.tempatLahir}
                          onChange={(e) => handleParentChange('ayah', 'tempatLahir', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tanggal Lahir</label>
                        <input
                          type="text"
                          placeholder="dd/mm/yyyy"
                          value={formData.ayah.tanggalLahir}
                          onChange={(e) => handleParentChange('ayah', 'tanggalLahir', handleDateInput(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pendidikan Terakhir</label>
                        <SearchableSelect
                      showSearch={false}
                      value={formData.ayah.pendidikan}
                      onChange={(val) => handleParentChange('ayah', 'pendidikan', val)}
                      options={['Tidak Sekolah', 'Putus SD', 'SD Sederajat', 'SMP Sederajat', 'SMA Sederajat', 'D1', 'D2', 'D3', 'D4/S1', 'S2', 'S3']}
                      placeholder="-- Pilih Pendidikan --"
                    />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pekerjaan</label>
                        <SearchableSelect
                      showSearch={false}
                      value={formData.ayah.pekerjaan}
                      onChange={(val) => handleParentChange('ayah', 'pekerjaan', val)}
                      options={['Tidak Bekerja', 'Pensiunan', 'PNS', 'TNI/Polisi', 'Guru/Dosen', 'Pegawai Swasta', 'Wiraswasta', 'Pengacara/Jaksa/Hakim/Notaris', 'Seniman/Pelukis/Artis/Sejenis', 'Dokter/Bidan/Perawat', 'Pilot/Pramugara', 'Pedagang', 'Petani/Peternak', 'Nelayan', 'Buruh (Tani/Pabrik/Bangunan)', 'Sopir/Masinis/Kondektur', 'Politikus', 'Lainnya']}
                      placeholder="-- Pilih Pekerjaan --"
                    />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Penghasilan Rata-rata Perbulan</label>
                        <SearchableSelect
                      showSearch={false}
                      value={formData.ayah.penghasilan}
                      onChange={(val) => handleParentChange('ayah', 'penghasilan', val)}
                      options={['Kurang dari Rp 500.000', 'Rp 500.000 - Rp 999.999', 'Rp 1.000.000 - Rp 1.999.999', 'Rp 2.000.000 - Rp 4.999.999', 'Rp 5.000.000 - Rp 20.000.000', 'Lebih dari Rp 20.000.000']}
                      placeholder="-- Pilih Penghasilan --"
                      disabled={formData.ayah.pekerjaan === 'Tidak Bekerja'}
                    />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Nomor HP/Whatsapp</label>
                        <input
                          type="text"
                          maxLength={14}
                          value={formData.ayah.hp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            handleParentChange('ayah', 'hp', val);
                          }}
                          className={`w-full px-4 py-2.5 rounded-lg border ${errors.ayah_hp ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                        />
                  {errors.ayah_hp && <p className="text-[11px] text-rose-500 mt-1">{errors.ayah_hp}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* B. Ibu Kandung */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 uppercase tracking-widest mt-8">
                  B. Ibu Kandung
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Nama Lengkap</label>
                    <input
                      type="text"
                      value={formData.ibu.nama}
                      onChange={(e) => handleParentChange('ibu', 'nama', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Status</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.ibu.status}
                      onChange={(val) => handleParentChange('ibu', 'status', val)}
                      options={['Masih Hidup', 'Meninggal Dunia']}
                      placeholder="-- Pilih --"
                    />
                  </div>
                  
                  {formData.ibu.status === 'Masih Hidup' && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kewarganegaraan</label>
                        <SearchableSelect
                      showSearch={false}
                          value={formData.ibu.wn}
                          onChange={(val) => handleParentChange('ibu', 'wn', val)}
                          options={['WNI', 'WNA']}
                          placeholder="-- Pilih --"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">NIK</label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="Berisi 16 Angka"
                          value={formData.ibu.nik}
                          onChange={(e) => handleParentChange('ibu', 'nik', e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-lg border ${errors.ibu_nik ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                        />
                  {errors.ibu_nik && <p className="text-[11px] text-rose-500 mt-1">{errors.ibu_nik}</p>}
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tempat Lahir</label>
                        <input
                          type="text"
                          value={formData.ibu.tempatLahir}
                          onChange={(e) => handleParentChange('ibu', 'tempatLahir', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tanggal Lahir</label>
                        <input
                          type="text"
                          placeholder="dd/mm/yyyy"
                          value={formData.ibu.tanggalLahir}
                          onChange={(e) => handleParentChange('ibu', 'tanggalLahir', handleDateInput(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pendidikan Terakhir</label>
                        <SearchableSelect
                      showSearch={false}
                      value={formData.ibu.pendidikan}
                      onChange={(val) => handleParentChange('ibu', 'pendidikan', val)}
                      options={['Tidak Sekolah', 'Putus SD', 'SD Sederajat', 'SMP Sederajat', 'SMA Sederajat', 'D1', 'D2', 'D3', 'D4/S1', 'S2', 'S3']}
                      placeholder="-- Pilih Pendidikan --"
                    />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pekerjaan</label>
                        <SearchableSelect
                      showSearch={false}
                      value={formData.ibu.pekerjaan}
                      onChange={(val) => handleParentChange('ibu', 'pekerjaan', val)}
                      options={['Tidak Bekerja', 'Pensiunan', 'PNS', 'TNI/Polisi', 'Guru/Dosen', 'Pegawai Swasta', 'Wiraswasta', 'Pengacara/Jaksa/Hakim/Notaris', 'Seniman/Pelukis/Artis/Sejenis', 'Dokter/Bidan/Perawat', 'Pilot/Pramugara', 'Pedagang', 'Petani/Peternak', 'Nelayan', 'Buruh (Tani/Pabrik/Bangunan)', 'Sopir/Masinis/Kondektur', 'Politikus', 'Lainnya']}
                      placeholder="-- Pilih Pekerjaan --"
                    />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Penghasilan Rata-rata Perbulan</label>
                        <SearchableSelect
                      showSearch={false}
                      value={formData.ibu.penghasilan}
                      onChange={(val) => handleParentChange('ibu', 'penghasilan', val)}
                      options={['Kurang dari Rp 500.000', 'Rp 500.000 - Rp 999.999', 'Rp 1.000.000 - Rp 1.999.999', 'Rp 2.000.000 - Rp 4.999.999', 'Rp 5.000.000 - Rp 20.000.000', 'Lebih dari Rp 20.000.000']}
                      placeholder="-- Pilih Penghasilan --"
                      disabled={formData.ibu.pekerjaan === 'Tidak Bekerja'}
                    />
                      </div>
                      <div>
                        <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Nomor HP/Whatsapp</label>
                        <input
                          type="text"
                          maxLength={14}
                          value={formData.ibu.hp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            handleParentChange('ibu', 'hp', val);
                          }}
                          className={`w-full px-4 py-2.5 rounded-lg border ${errors.ibu_hp ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                        />
                  {errors.ibu_hp && <p className="text-[11px] text-rose-500 mt-1">{errors.ibu_hp}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB C: DATA WALI */}
          {activeTab === 'wali' && (
            <div className="space-y-6 animate-fade-in text-left">
              <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 uppercase tracking-widest">
                C. Data Wali Utama
              </h4>
              
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Wali</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.waliData.statusWali}
                    onChange={(val) => handleWaliStatusChange(val)}
                    options={['Sama dengan ayah kandung', 'Sama dengan ibu kandung', 'Lainnya']}
                    placeholder="-- Pilih --"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Hubungan dengan siswa</label>
                  {(() => {
                    const presetOptions = ['Kakek', 'Nenek', 'Paman', 'Bibi', 'Saudara Kandung'];
                    const currentHubungan = formData.waliData.hubungan || '';
                    const selectValue = (presetOptions.includes(currentHubungan) || currentHubungan === '') 
                      ? currentHubungan 
                      : 'Lainnya';
                    
                    const showManualInput = selectValue === 'Lainnya' && (formData.waliData.statusWali === 'Lainnya' || formData.waliData.statusWali === '');

                    return (
                      <div className="space-y-2">
                        <SearchableSelect
                          showSearch={false}
                          value={selectValue}
                          onChange={(val) => {
                            if (val === 'Lainnya') {
                              handleWaliDataChange('hubungan', 'Lainnya');
                            } else {
                              handleWaliDataChange('hubungan', val);
                            }
                          }}
                          options={['Kakek', 'Nenek', 'Paman', 'Bibi', 'Saudara Kandung', 'Lainnya']}
                          placeholder="-- Pilih --"
                          disabled={formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== ''}
                        />
                        
                        {showManualInput && (
                          <div className="animate-fade-in">
                            <label className="block text-[11px] text-slate-500 mb-1 font-medium">Tulis Hubungan Manual</label>
                            <input
                              type="text"
                              value={formData.waliData.hubungan === 'Lainnya' ? '' : formData.waliData.hubungan}
                              onChange={(e) => handleWaliDataChange('hubungan', e.target.value || 'Lainnya')}
                              placeholder="Contoh: Sepupu, Kakak, Ibu Tiri, dll"
                              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 shadow-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Show wali fields (disabled if synced, enabled if 'Lainnya') */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Nama Lengkap</label>
                  <input
                    type="text"
                    value={formData.waliData.nama}
                    onChange={(e) => handleWaliDataChange('nama', e.target.value)}
                    disabled={formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== ''}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kewarganegaraan</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.waliData.wn}
                    onChange={(val) => handleWaliDataChange('wn', val)}
                    options={['WNI', 'WNA']}
                    placeholder="-- Pilih --"
                    disabled={formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== ''}
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">NIK</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.waliData.nik}
                    onChange={(e) => handleWaliDataChange('nik', e.target.value)}
                    disabled={formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== ''}
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.wali_nik ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} disabled:bg-slate-100 disabled:text-slate-500 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700`}
                  />
                  {errors.wali_nik && <p className="text-[11px] text-rose-500 mt-1">{errors.wali_nik}</p>}
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">No. HP/Whatsapp</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={formData.waliData.hp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleWaliDataChange('hp', val);
                    }}
                    disabled={formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== ''}
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.wali_hp ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} disabled:bg-slate-100 disabled:text-slate-500 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700`}
                  />
                  {errors.wali_hp && <p className="text-[11px] text-rose-500 mt-1">{errors.wali_hp}</p>}
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pendidikan Terakhir</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.waliData.pendidikan}
                    onChange={(val) => handleWaliDataChange('pendidikan', val)}
                    options={['Tidak Sekolah', 'Putus SD', 'SD Sederajat', 'SMP Sederajat', 'SMA Sederajat', 'D1', 'D2', 'D3', 'D4/S1', 'S2', 'S3']}
                    placeholder="-- Pilih Pendidikan --"
                    disabled={formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== ''}
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pekerjaan</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.waliData.pekerjaan}
                    onChange={(val) => handleWaliDataChange('pekerjaan', val)}
                    options={['Tidak Bekerja', 'Pensiunan', 'PNS', 'TNI/Polisi', 'Guru/Dosen', 'Pegawai Swasta', 'Wiraswasta', 'Pengacara/Jaksa/Hakim/Notaris', 'Seniman/Pelukis/Artis/Sejenis', 'Dokter/Bidan/Perawat', 'Pilot/Pramugara', 'Pedagang', 'Petani/Peternak', 'Nelayan', 'Buruh (Tani/Pabrik/Bangunan)', 'Sopir/Masinis/Kondektur', 'Politikus', 'Lainnya']}
                    placeholder="-- Pilih Pekerjaan --"
                    disabled={formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== ''}
                  />
                </div>
                 <div className="md:col-span-2">
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Penghasilan Rata-rata Perbulan</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.waliData.penghasilan}
                    onChange={(val) => handleWaliDataChange('penghasilan', val)}
                    options={['Kurang dari Rp 500.000', 'Rp 500.000 - Rp 999.999', 'Rp 1.000.000 - Rp 1.999.999', 'Rp 2.000.000 - Rp 4.999.999', 'Rp 5.000.000 - Rp 20.000.000', 'Lebih dari Rp 20.000.000']}
                    placeholder="-- Pilih Penghasilan --"
                    disabled={(formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== '') || formData.waliData.pekerjaan === 'Tidak Bekerja'}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Hubungan dengan Siswa</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.waliData.hubungan}
                    onChange={(val) => handleWaliDataChange('hubungan', val)}
                    options={['Kakek', 'Nenek', 'Paman', 'Bibi', 'Saudara Kandung', 'Lainnya']}
                    placeholder="-- Pilih --"
                    disabled={formData.waliData.statusWali !== 'Lainnya' && formData.waliData.statusWali !== ''}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB D: DATA ALAMAT */}
          {activeTab === 'alamat' && (
            <div className="space-y-10 animate-fade-in text-left">
              
              {/* Alamat Ayah */}
              <section className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 mb-2 pb-2 border-b border-slate-100 uppercase tracking-widest">
                  1. Alamat Ayah Kandung
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Status Kepemilikan Rumah</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.alamat.ayah.kepemilikan}
                      onChange={(val) => handleAlamatChange('ayah', 'kepemilikan', val)}
                      options={['Milik Sendiri', 'Rumah Orang Tua', 'Rumah Saudara/Kerabat', 'Rumah Dinas', 'Sewa/Kontrak', 'Lainnya']}
                      placeholder="-- Pilih Kepemilikan --"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Provinsi</label>
                    <SearchableSelect
                      value={formData.alamat.ayah.prov}
                      onChange={(value) => handleAlamatChange('ayah', 'prov', value)}
                      options={PROVINCES}
                      placeholder="-- Pilih Provinsi --"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kabupaten / Kota</label>
                    <SearchableSelect
                      value={formData.alamat.ayah.kab}
                      onChange={(value) => handleAlamatChange('ayah', 'kab', value)}
                      options={ayahCities}
                      placeholder="-- Pilih Kab/Kota --"
                      disabled={!formData.alamat.ayah.prov}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kecamatan</label>
                    <SearchableSelect
                      value={formData.alamat.ayah.kec}
                      onChange={(value) => handleAlamatChange('ayah', 'kec', value)}
                      options={ayahDistricts}
                      placeholder="-- Pilih Kecamatan --"
                      disabled={!formData.alamat.ayah.kab}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kelurahan / Desa</label>
                    <SearchableSelect
                      value={formData.alamat.ayah.kel}
                      onChange={(value) => handleAlamatChange('ayah', 'kel', value)}
                      options={ayahVillages}
                      placeholder="-- Pilih Kelurahan/Desa --"
                      disabled={!formData.alamat.ayah.kec}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <div className="w-1/2">
                      <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">RT</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={formData.alamat.ayah.rt}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, '');
                          handleAlamatChange('ayah', 'rt', sanitized);
                        }}
                        placeholder="Contoh: 001"
                        className={`w-full px-4 py-2.5 rounded-lg border ${errors.ayah_rt ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">diisi tiga angka, contoh: 001</p>
                      {errors.ayah_rt && <p className="text-[11px] text-rose-500 mt-1">{errors.ayah_rt}</p>}
                    </div>
                    <div className="w-1/2">
                      <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">RW</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={formData.alamat.ayah.rw}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, '');
                          handleAlamatChange('ayah', 'rw', sanitized);
                        }}
                        placeholder="Contoh: 001"
                        className={`w-full px-4 py-2.5 rounded-lg border ${errors.ayah_rw ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">diisi tiga angka, contoh: 001</p>
                      {errors.ayah_rw && <p className="text-[11px] text-rose-500 mt-1">{errors.ayah_rw}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kode Pos</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={formData.alamat.ayah.kodepos}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/\D/g, '');
                        handleAlamatChange('ayah', 'kodepos', sanitized);
                      }}
                      placeholder="Contoh: 12345"
                      className={`w-full px-4 py-2.5 rounded-lg border ${errors.ayah_kodepos ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">terdiri dari 5 angka</p>
                    {errors.ayah_kodepos && <p className="text-[11px] text-rose-500 mt-1">{errors.ayah_kodepos}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Alamat Jalan</label>
                    <input
                      type="text"
                      placeholder="Nama Jalan, Komplek, dsb."
                      value={formData.alamat.ayah.jalan}
                      onChange={(e) => handleAlamatChange('ayah', 'jalan', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700"
                    />
                  </div>
                </div>
              </section>

              {/* Alamat Ibu */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                    2. Alamat Ibu Kandung
                  </h4>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={alamatIbuSamaDenganAyah}
                      onChange={(e) => handleAlamatIbuSamaDenganAyahChange(e.target.checked)}
                      className="w-4 h-4 text-[#10b981] rounded border-slate-300 focus:ring-[#10b981]"
                    />
                    <span className="text-[12px] font-medium text-slate-500 group-hover:text-slate-800">
                      Sama dengan ayah kandung
                    </span>
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Status Kepemilikan Rumah</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.alamat.ibu.kepemilikan}
                      onChange={(val) => handleAlamatChange('ibu', 'kepemilikan', val)}
                      options={['Milik Sendiri', 'Rumah Orang Tua', 'Rumah Saudara/Kerabat', 'Rumah Dinas', 'Sewa/Kontrak', 'Lainnya']}
                      placeholder="-- Pilih Kepemilikan --"
                      disabled={alamatIbuSamaDenganAyah}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Provinsi</label>
                    <SearchableSelect
                      value={formData.alamat.ibu.prov}
                      onChange={(value) => handleAlamatChange('ibu', 'prov', value)}
                      options={PROVINCES}
                      placeholder="-- Pilih Provinsi --"
                      disabled={alamatIbuSamaDenganAyah}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kabupaten / Kota</label>
                    <SearchableSelect
                      value={formData.alamat.ibu.kab}
                      onChange={(value) => handleAlamatChange('ibu', 'kab', value)}
                      options={ibuCities}
                      placeholder="-- Pilih Kab/Kota --"
                      disabled={alamatIbuSamaDenganAyah || !formData.alamat.ibu.prov}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kecamatan</label>
                    <SearchableSelect
                      value={formData.alamat.ibu.kec}
                      onChange={(value) => handleAlamatChange('ibu', 'kec', value)}
                      options={ibuDistricts}
                      placeholder="-- Pilih Kecamatan --"
                      disabled={alamatIbuSamaDenganAyah || !formData.alamat.ibu.kab}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kelurahan / Desa</label>
                    <SearchableSelect
                      value={formData.alamat.ibu.kel}
                      onChange={(value) => handleAlamatChange('ibu', 'kel', value)}
                      options={ibuVillages}
                      placeholder="-- Pilih Kelurahan/Desa --"
                      disabled={alamatIbuSamaDenganAyah || !formData.alamat.ibu.kec}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <div className="w-1/2">
                      <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">RT</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={formData.alamat.ibu.rt}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, '');
                          handleAlamatChange('ibu', 'rt', sanitized);
                        }}
                        disabled={alamatIbuSamaDenganAyah}
                        placeholder="Contoh: 001"
                        className={`w-full px-4 py-2.5 rounded-lg border ${errors.ibu_rt ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">diisi tiga angka, contoh: 001</p>
                      {errors.ibu_rt && <p className="text-[11px] text-rose-500 mt-1">{errors.ibu_rt}</p>}
                    </div>
                    <div className="w-1/2">
                      <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">RW</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={formData.alamat.ibu.rw}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, '');
                          handleAlamatChange('ibu', 'rw', sanitized);
                        }}
                        disabled={alamatIbuSamaDenganAyah}
                        placeholder="Contoh: 001"
                        className={`w-full px-4 py-2.5 rounded-lg border ${errors.ibu_rw ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">diisi tiga angka, contoh: 001</p>
                      {errors.ibu_rw && <p className="text-[11px] text-rose-500 mt-1">{errors.ibu_rw}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kode Pos</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={formData.alamat.ibu.kodepos}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/\D/g, '');
                        handleAlamatChange('ibu', 'kodepos', sanitized);
                      }}
                      disabled={alamatIbuSamaDenganAyah}
                      placeholder="Contoh: 12345"
                      className={`w-full px-4 py-2.5 rounded-lg border ${errors.ibu_kodepos ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">terdiri dari 5 angka</p>
                    {errors.ibu_kodepos && <p className="text-[11px] text-rose-500 mt-1">{errors.ibu_kodepos}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Alamat Jalan</label>
                    <input
                      type="text"
                      value={formData.alamat.ibu.jalan}
                      onChange={(e) => handleAlamatChange('ibu', 'jalan', e.target.value)}
                      disabled={alamatIbuSamaDenganAyah}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700"
                    />
                  </div>
                </div>
              </section>

              {/* Alamat Wali */}
              <section className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 mb-2 pb-2 border-b border-slate-100 uppercase tracking-widest">
                  3. Alamat Wali
                </h4>
                <div className="mb-4">
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Status Alamat Wali</label>
                  <SearchableSelect
                      showSearch={false}
                    value={formData.alamat.wali.statusAlamatWali}
                    onChange={(val) => handleAlamatWaliStatusChange(val)}
                    options={['Sama dengan ayah kandung', 'Sama dengan ibu kandung', 'Lainnya']}
                    placeholder="-- Pilih --"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Status Kepemilikan Rumah</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.alamat.wali.kepemilikan}
                      onChange={(val) => handleAlamatChange('wali', 'kepemilikan', val)}
                      options={['Milik Sendiri', 'Rumah Orang Tua', 'Rumah Saudara/Kerabat', 'Rumah Dinas', 'Sewa/Kontrak', 'Lainnya']}
                      placeholder="-- Pilih Kepemilikan --"
                      disabled={formData.alamat.wali.statusAlamatWali !== 'Lainnya' && formData.alamat.wali.statusAlamatWali !== ''}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Provinsi</label>
                    <SearchableSelect
                      value={formData.alamat.wali.prov}
                      onChange={(value) => handleAlamatChange('wali', 'prov', value)}
                      options={PROVINCES}
                      placeholder="-- Pilih Provinsi --"
                      disabled={isWaliDisabled}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kab/Kota</label>
                    <SearchableSelect
                      value={formData.alamat.wali.kab}
                      onChange={(value) => handleAlamatChange('wali', 'kab', value)}
                      options={waliCities}
                      placeholder="-- Pilih Kab/Kota --"
                      disabled={isWaliDisabled || !formData.alamat.wali.prov}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kecamatan</label>
                    <SearchableSelect
                      value={formData.alamat.wali.kec}
                      onChange={(value) => handleAlamatChange('wali', 'kec', value)}
                      options={waliDistricts}
                      placeholder="-- Pilih Kecamatan --"
                      disabled={isWaliDisabled || !formData.alamat.wali.kab}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kelurahan / Desa</label>
                    <SearchableSelect
                      value={formData.alamat.wali.kel}
                      onChange={(value) => handleAlamatChange('wali', 'kel', value)}
                      options={waliVillages}
                      placeholder="-- Pilih Kelurahan/Desa --"
                      disabled={isWaliDisabled || !formData.alamat.wali.kec}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <div className="w-1/2">
                      <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">RT</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={formData.alamat.wali.rt}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, '');
                          handleAlamatChange('wali', 'rt', sanitized);
                        }}
                        disabled={formData.alamat.wali.statusAlamatWali !== 'Lainnya' && formData.alamat.wali.statusAlamatWali !== ''}
                        placeholder="Contoh: 001"
                        className={`w-full px-4 py-2.5 rounded-lg border ${errors.wali_rt ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">diisi tiga angka, contoh: 001</p>
                      {errors.wali_rt && <p className="text-[11px] text-rose-500 mt-1">{errors.wali_rt}</p>}
                    </div>
                    <div className="w-1/2">
                      <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">RW</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={formData.alamat.wali.rw}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, '');
                          handleAlamatChange('wali', 'rw', sanitized);
                        }}
                        disabled={formData.alamat.wali.statusAlamatWali !== 'Lainnya' && formData.alamat.wali.statusAlamatWali !== ''}
                        placeholder="Contoh: 001"
                        className={`w-full px-4 py-2.5 rounded-lg border ${errors.wali_rw ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">diisi tiga angka, contoh: 001</p>
                      {errors.wali_rw && <p className="text-[11px] text-rose-500 mt-1">{errors.wali_rw}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kode Pos</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={formData.alamat.wali.kodepos}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/\D/g, '');
                        handleAlamatChange('wali', 'kodepos', sanitized);
                      }}
                      disabled={formData.alamat.wali.statusAlamatWali !== 'Lainnya' && formData.alamat.wali.statusAlamatWali !== ''}
                      placeholder="Contoh: 12345"
                      className={`w-full px-4 py-2.5 rounded-lg border ${errors.wali_kodepos ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} disabled:bg-slate-100 focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 transition-colors`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">terdiri dari 5 angka</p>
                    {errors.wali_kodepos && <p className="text-[11px] text-rose-500 mt-1">{errors.wali_kodepos}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Alamat Jalan</label>
                    <input
                      type="text"
                      value={formData.alamat.wali.jalan}
                      onChange={(e) => handleAlamatChange('wali', 'jalan', e.target.value)}
                      disabled={formData.alamat.wali.statusAlamatWali !== 'Lainnya' && formData.alamat.wali.statusAlamatWali !== ''}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 disabled:bg-slate-100 text-[13px] text-slate-700"
                    />
                  </div>
                </div>
              </section>

              {/* Alamat Siswa & Transport */}
              <section className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 mb-2 pb-2 border-b border-slate-100 uppercase tracking-widest">
                  4. Alamat Domisili & Transportasi Siswa
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Status Tempat Tinggal</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.alamat.domisili.statusTempatTinggal}
                      onChange={(val) => handleDomisiliChange('statusTempatTinggal', val)}
                      options={['Tinggal dengan Ayah Kandung', 'Tinggal dengan Ibu Kandung', 'Tinggal dengan Wali', 'Ikut Saudara/Kerabat', 'Asrama Madrasah', 'Asrama Pesantren', 'Panti Asuhan', 'Rumah Singgah', 'Lainnya']}
                      placeholder="-- Pilih --"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Jarak Tempat Tinggal - Madrasah</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.alamat.domisili.jarak}
                      onChange={(val) => handleDomisiliChange('jarak', val)}
                      options={['Kurang dari 5 KM', 'Antara 5 - 10 KM', 'Antara 11 - 20 KM', 'Antara 21 - 30 KM', 'Lebih dari 30 KM']}
                      placeholder="-- Pilih --"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Transportasi Ke Sekolah</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.alamat.domisili.transportasi}
                      onChange={(val) => handleDomisiliChange('transportasi', val)}
                      options={['Jalan Kaki', 'Sepeda', 'Sepeda Motor', 'Mobil Pribadi', 'Antar Jemput Sekolah', 'Angkutan Umum', 'Perahu/Sampan', 'Lainnya']}
                      placeholder="-- Pilih --"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Waktu Tempuh</label>
                    <SearchableSelect
                      showSearch={false}
                      value={formData.alamat.domisili.waktuTempuh}
                      onChange={(val) => handleDomisiliChange('waktuTempuh', val)}
                      options={['1 - 10 Menit', '10 - 19 Menit', '20 - 29 Menit', '30 - 39 Menit', '1 - 2 Jam', 'Lebih dari 2 Jam']}
                      placeholder="-- Pilih --"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 z-10 flex-shrink-0">
          {activeTab === 'siswa' ? (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-[13px] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
          ) : (
            <button
              onClick={handlePrevTab}
              className="px-6 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-[13px] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Kembali
            </button>
          )}

          {activeTab === 'alamat' ? (
            <button
              onClick={handleSave}
              className="px-8 py-2.5 rounded-lg bg-[#10b981] text-white font-bold text-[13px] hover:bg-[#059669] shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Simpan Data
            </button>
          ) : (
            <button
              onClick={handleNextTab}
              className="px-8 py-2.5 rounded-lg bg-[#3b82f6] text-white font-bold text-[13px] hover:bg-[#2563eb] shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Lanjut
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
