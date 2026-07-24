import { safeJSONParse } from "./lib/json";
import { safeStorage } from "./lib/safeStorage";
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Toast, ToastMessage } from './components/Toast';
import { DashboardView } from './components/DashboardView';
import { LembagaView } from './components/LembagaView';
import { SiswaView } from './components/SiswaView';
import { GuruView } from './components/GuruView';
import { SarprasView } from './components/SarprasView';
import { AkademikView } from './components/AkademikView';
import { JurnalMengajarView } from './components/JurnalMengajarView';
import { AsesmenView } from './components/AsesmenView';
import { EMateriView } from './components/EMateriView';
import { PresensiView } from './components/PresensiView';
import { KesiswaanView } from './components/KesiswaanView';
import { SettingsView } from './components/SettingsView';
import { SupabaseView } from './components/SupabaseView';
import { StudentModal } from './components/StudentModal';
import { TeacherModal } from './components/TeacherModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { TeacherDetailModal } from './components/TeacherDetailModal';
import { LandingPage } from './components/LandingPage';
import { PrintStudentPage } from './components/PrintStudentPage';
import { PrintTeacherPage } from './components/PrintTeacherPage';
import { Student, Teacher, Institution, NotificationItem, Kelas, UserRole, StudentMutation, ClassPromotion, StudentGraduation } from './types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, INITIAL_INSTITUTION, INITIAL_NOTIFICATIONS } from './mockData';
import { LogOut, Key, Eye, EyeOff, Trash2 } from 'lucide-react';
import { 
  syncStudentToSupabase, 
  deleteStudentFromSupabase, 
  syncTeacherToSupabase, 
  deleteTeacherFromSupabase, 
  syncInstitutionToSupabase,
  syncClassToSupabase,
  deleteClassFromSupabase,
  getStoredSupabaseConfig,
  generateUUID,
  pullAllDataFromSupabase
} from './lib/supabaseClient';

const sortClasses = (classList: Kelas[]) => {
  return [...classList].sort((a, b) => {
    if (a.tingkat !== b.tingkat) return (a.tingkat || '').localeCompare(b.tingkat || '', undefined, { numeric: true });
    return (a.nama || '').localeCompare(b.nama || '', undefined, { numeric: true });
  });
};


// Automatically clear corrupted "undefined" or "null" string values from localStorage on startup
const clearCorruptedStorage = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        if (val === null) continue;
        
        const trimmed = val.trim();
        if (
          trimmed === 'undefined' || 
          trimmed === 'null' || 
          trimmed === '' || 
          trimmed === '"undefined"' || 
          trimmed === '"null"'
        ) {
          keysToRemove.push(key);
        } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            JSON.parse(trimmed);
          } catch (e) {
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Failed to remove key ${key}:`, e);
      }
    });
  } catch (e) {
    console.error("Failed to clear corrupted storage:", e);
  }
};
clearCorruptedStorage();

export default function App() {
  const [printStudentId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('print-student');
  });

  const [inlinePrintConfig, setInlinePrintConfig] = useState<{
    type: 'student' | 'class' | 'all' | 'teacher' | 'all-teachers';
    studentId?: string;
    teacherId?: string;
    className?: string;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Authentication State
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    return (safeStorage.getItem('mts_user_role') as UserRole) || null;
  });
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const saved = safeStorage.getItem('mts_current_user');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLoginSuccess = (role: UserRole, user: any) => {
    setUserRole(role);
    setCurrentUser(user);
    safeStorage.setItem('mts_user_role', role);
    safeStorage.setItem('mts_current_user', JSON.stringify(user));
    
    // Sync with existing role simulator on dashboard
    if (role === 'siswa') {
      safeStorage.setItem('mts_active_role', 'siswa');
    } else if (role === 'guru') {
      safeStorage.setItem('mts_active_role', 'guru');
    } else if (role === 'kepsek') {
      safeStorage.setItem('mts_active_role', 'kepsek');
    } else {
      safeStorage.setItem('mts_active_role', 'admin');
    }
    window.dispatchEvent(new Event('roleChanged'));
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentUser(null);
    safeStorage.removeItem('mts_user_role');
    safeStorage.removeItem('mts_current_user');
    safeStorage.removeItem('mts_active_role');
    setLogoutModalOpen(false);
  };

  // Core Entity States - Cached in localStorage
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = safeStorage.getItem('mts_students');
      const parsed = (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : INITIAL_STUDENTS;
      if (Array.isArray(parsed)) {
        return parsed.filter((s: any) => s && typeof s === 'object' && s.id && s.nama);
      }
      return INITIAL_STUDENTS;
    } catch (e) {
      console.error("Failed to parse mts_students:", e);
      return INITIAL_STUDENTS;
    }
  });
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = safeStorage.getItem('mts_teachers');
      const parsed = (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : INITIAL_TEACHERS;
      if (Array.isArray(parsed)) {
        return parsed.filter((t: any) => t && typeof t === 'object' && t.id && t.nama);
      }
      return INITIAL_TEACHERS;
    } catch (e) {
      console.error("Failed to parse mts_teachers:", e);
      return INITIAL_TEACHERS;
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = safeStorage.getItem('mts_notifications');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : INITIAL_NOTIFICATIONS;
    } catch (e) {
      console.error("Failed to parse mts_notifications:", e);
      return INITIAL_NOTIFICATIONS;
    }
  });
  const [institution, setInstitution] = useState<Institution>(() => {
    try {
      const saved = safeStorage.getItem('mts_institution');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : INITIAL_INSTITUTION;
    } catch (e) {
      console.error("Failed to parse mts_institution:", e);
      return INITIAL_INSTITUTION;
    }
  });

  const [classes, setClasses] = useState<Kelas[]>(() => {
    try {
      const saved = safeStorage.getItem('mts_classes');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        return sortClasses(safeJSONParse(saved) || []);
      }
    } catch (e) {
      console.error("Failed to parse mts_classes:", e);
    }
    
    // Default classes to begin with
    const defaults: Kelas[] = [
      { id: 'class-1', tingkat: '7', nama: 'Kelas 7-A', kapasitas: 32, siswaIds: [] },
      { id: 'class-2', tingkat: '8', nama: 'Kelas 8-B', kapasitas: 32, siswaIds: [] },
      { id: 'class-3', tingkat: '9', nama: 'Kelas 9-A', kapasitas: 32, siswaIds: [] },
    ];
    
    // Map our initial students to their respective classes
    INITIAL_STUDENTS.forEach((std) => {
      if (std.kelas === 'Kelas 7-A') defaults[0].siswaIds.push(std.id);
      else if (std.kelas === 'Kelas 8-B') defaults[1].siswaIds.push(std.id);
      else if (std.kelas === 'Kelas 9-A') defaults[2].siswaIds.push(std.id);
    });
    
    return sortClasses(defaults);
  });

  const [mutations, setMutations] = useState<StudentMutation[]>(() => {
    try {
      const saved = safeStorage.getItem('mts_mutations');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [promotions, setPromotions] = useState<ClassPromotion[]>(() => {
    try {
      const saved = safeStorage.getItem('mts_promotions');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [graduations, setGraduations] = useState<StudentGraduation[]>(() => {
    try {
      const saved = safeStorage.getItem('mts_graduations');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Safe setItem to catch QuotaExceededError
  const safeSetItem = (key: string, value: string) => {
    safeStorage.setItem(key, value);
  };

  // Save changes to local storage
  useEffect(() => {
    safeSetItem('mts_students', JSON.stringify(students));
    (window as any).__MTS_STUDENTS__ = students;
  }, [students]);

  useEffect(() => {
    safeSetItem('mts_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    safeSetItem('mts_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeSetItem('mts_institution', JSON.stringify(institution));
    (window as any).__MTS_INSTITUTION__ = institution;
  }, [institution]);

  useEffect(() => {
    safeSetItem('mts_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => { safeSetItem('mts_mutations', JSON.stringify(mutations)); }, [mutations]);
  useEffect(() => { safeSetItem('mts_promotions', JSON.stringify(promotions)); }, [promotions]);
  useEffect(() => { safeSetItem('mts_graduations', JSON.stringify(graduations)); }, [graduations]);



  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Custom Confirmation Dialog State
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Modal States
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentDetailOpen, setStudentDetailOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherDetailOpen, setTeacherDetailOpen] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Reset Password States
  const [resetPasswordStudent, setResetPasswordStudent] = useState<Student | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState<string>('');
  const [showNewPasswordInModal, setShowNewPasswordInModal] = useState<boolean>(false);

  // Toast Helpers
  const addToast = (message: string, action: string = 'Sistem Database', type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, action, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Add Notification Helper
  const addNotification = (title: string, message: string) => {
    const id = generateUUID();
    const newNotif: NotificationItem = {
      id,
      title,
      message,
      time: 'Baru saja',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Notification actions
  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast('Semua notifikasi ditandai sebagai dibaca', 'Pusat Informasi', 'success');
  };

  // Load initial data from Supabase on mount if connected
  const [isDbLoading, setIsDbLoading] = useState(false);
  useEffect(() => {
    const { url, anonKey } = getStoredSupabaseConfig();
    if (url && anonKey) {
      setIsDbLoading(true);
      pullAllDataFromSupabase().then((res) => {
        if (res.success) {
          if (res.students && res.students.length > 0) {
            setStudents(res.students);
          }
          if (res.teachers && res.teachers.length > 0) {
            setTeachers(res.teachers);
          }
          if (res.classes && res.classes.length > 0) {
            setClasses(sortClasses(res.classes));
          }
          if (res.institution) {
            setInstitution(res.institution);
          }
          if (res.notifications && res.notifications.length > 0) {
            setNotifications(res.notifications);
          }
          if (res.subjects && res.subjects.length > 0) {
            safeStorage.setItem('mts_subjects', JSON.stringify(res.subjects));
          }
          if (res.schedules && res.schedules.length > 0) {
            safeStorage.setItem('mts_schedules', JSON.stringify(res.schedules));
          }
          if (res.materials && res.materials.length > 0) {
            safeStorage.setItem('mts_emateri', JSON.stringify(res.materials));
          }
          if (res.mutations && res.mutations.length > 0) {
            setMutations(res.mutations);
          }
          if (res.promotions && res.promotions.length > 0) {
            setPromotions(res.promotions);
          }
          if (res.graduations && res.graduations.length > 0) {
            setGraduations(res.graduations);
          }
          addToast('Sinkronisasi cloud berhasil: Terhubung ke database Supabase!', 'Database Cloud', 'success');
        } else {
          console.warn('Initial background pull from Supabase failed:', res.error);
        }
        setIsDbLoading(false);
      }).catch((err) => {
        console.error('Error during initial Supabase background sync:', err);
        setIsDbLoading(false);
      });
    }
  }, []);

  // Student Actions
  const handleAddStudentClick = () => {
    setEditingStudent(null);
    setStudentModalOpen(true);
  };

  const handleEditStudentClick = (student: Student) => {
    setEditingStudent(student);
    setStudentModalOpen(true);
  };

  const handleSaveStudent = (student: Student) => {
    const isEditing = students.some((s) => s.id === student.id);
    if (isEditing) {
      setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
      addToast(`Data siswa "${student.nama}" berhasil diperbarui`, 'Edit Siswa', 'success');
      addNotification('Pembaruan Data Siswa', `Data administratif siswa bernama ${student.nama} berhasil diperbarui oleh Administrator.`);
    } else {
      setStudents((prev) => [student, ...prev]);
      addToast(`Siswa "${student.nama}" berhasil ditambahkan ke database`, 'Tambah Siswa', 'success');
      addNotification('Siswa Baru Terdaftar', `Siswa baru bernama ${student.nama} (NIS: ${student.nis}) berhasil ditambahkan. Kelas: ${student.kelas || 'Belum Ditentukan'}.`);
    }
    setStudentModalOpen(false);

    // Direct sync to Supabase in the background (if configured)
    const { url, anonKey } = getStoredSupabaseConfig();
    if (url && anonKey) {
      syncStudentToSupabase(student, true).then((res) => {
        if (res.success) {
          addToast(`Siswa "${student.nama}" berhasil disinkronkan ke Supabase Cloud`, 'Database Sync', 'success');
        } else {
          addToast(`Gagal menyinkronkan "${student.nama}" ke Supabase: ${res.error || 'Periksa koneksi Anda.'}`, 'Database Sync', 'error');
        }
      });
    }
  };

  const handleImportStudents = (newStudents: Student[]) => {
    setStudents((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const existingNis = new Set(prev.map((s) => s.nis));
      const filteredNew = newStudents.filter((s) => !existingIds.has(s.id) && !existingNis.has(s.nis));
      
      if (filteredNew.length === 0) {
        addToast('Tidak ada data siswa baru yang diimpor (sudah ada di database)', 'Import Siswa', 'info');
        return prev;
      }
      
      addToast(`${filteredNew.length} siswa berhasil diimpor`, 'Import Siswa', 'success');
      addNotification('Impor Data Siswa', `${filteredNew.length} data siswa berhasil diimpor ke dalam database.`);
      
      // Auto-sync each imported student
      filteredNew.forEach(student => {
        syncStudentToSupabase(student);
      });
      
      return [...filteredNew, ...prev];
    });
  };

  const handleDeleteStudent = (student: Student) => {
    setConfirmDelete({
      isOpen: true,
      title: 'Hapus Siswa',
      message: `Apakah Anda yakin ingin menghapus data siswa "${student.nama}"?`,
      onConfirm: () => {
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        addToast(`Data siswa "${student.nama}" berhasil dihapus dari sistem`, 'Hapus Siswa', 'error');
        addNotification('Siswa Dihapus', `Data administratif siswa bernama ${student.nama} telah dihapus permanen oleh Administrator.`);
        
        // Auto-delete from Supabase in the background
        deleteStudentFromSupabase(student.id, true).then((res) => {
          if (res.success) {
            addToast(`Siswa "${student.nama}" otomatis dihapus dari Supabase Cloud`, 'Database Sync', 'info');
          }
        });
        setConfirmDelete(null);
      }
    });
  };

  const handleResetPassword = (student: Student) => {
    setResetPasswordStudent(student);
    // Generate a random 6-digit number as default suggested password
    const suggestedPassword = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPasswordValue(suggestedPassword);
    setShowNewPasswordInModal(false);
  };

  const handleSaveResetPassword = () => {
    if (!resetPasswordStudent) return;
    if (!newPasswordValue.trim()) {
      addToast('Password baru tidak boleh kosong', 'Reset Password', 'error');
      return;
    }
    const updatedStudent = { ...resetPasswordStudent, password: newPasswordValue };
    setStudents((prev) =>
      prev.map((s) =>
        s.id === resetPasswordStudent.id ? updatedStudent : s
      )
    );
    addToast(`Password siswa "${resetPasswordStudent.nama}" berhasil di-reset`, 'Reset Password', 'success');
    addNotification('Reset Password Siswa', `Password akun Siswa untuk ${resetPasswordStudent.nama} berhasil di-reset menjadi "${newPasswordValue}" oleh Administrator.`);
    setResetPasswordStudent(null);

    // Direct sync password update to Supabase (if configured)
    const { url, anonKey } = getStoredSupabaseConfig();
    if (url && anonKey) {
      syncStudentToSupabase(updatedStudent, true).then((res) => {
        if (res.success) {
          addToast(`Pembaruan password "${updatedStudent.nama}" berhasil disinkronkan ke Supabase`, 'Database Sync', 'success');
        }
      });
    }
  };

  const handleViewStudentDetail = (student: Student) => {
    setViewingStudent(student);
    setStudentDetailOpen(true);
  };

  // Teacher Actions
  const handleAddTeacherClick = () => {
    setEditingTeacher(null);
    setTeacherModalOpen(true);
  };

  const handleEditTeacherClick = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTeacherModalOpen(true);
  };

  const handleSaveTeacher = (teacher: Teacher) => {
    const isEditing = teachers.some((t) => t.id === teacher.id);
    if (isEditing) {
      setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
      addToast(`Data guru "${teacher.nama}" berhasil diperbarui`, 'Edit Guru', 'success');
    } else {
      setTeachers((prev) => [...prev, teacher]);
      addToast(`Guru "${teacher.nama}" berhasil ditambahkan ke database`, 'Tambah Guru', 'success');
    }
    setTeacherModalOpen(false);

    // Direct sync to Supabase in the background (if configured)
    const { url, anonKey } = getStoredSupabaseConfig();
    if (url && anonKey) {
      syncTeacherToSupabase(teacher, true).then((res) => {
        if (res.success) {
          addToast(`Guru/Tendik "${teacher.nama}" berhasil disinkronkan ke Supabase Cloud`, 'Database Sync', 'success');
        } else {
          addToast(`Gagal menyinkronkan "${teacher.nama}" ke Supabase: ${res.error || 'Periksa koneksi Anda.'}`, 'Database Sync', 'error');
        }
      });
    }
  };

  const handleImportTeachers = (newTeachers: Teacher[]) => {
    setTeachers((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const existingNik = new Set(prev.map((t) => t.nik));
      const filteredNew = newTeachers.filter((t) => !existingIds.has(t.id) && !existingNik.has(t.nik));
      
      if (filteredNew.length === 0) {
        addToast('Tidak ada data guru baru yang diimpor (sudah ada di database)', 'Import Guru', 'info');
        return prev;
      }
      
      addToast(`${filteredNew.length} guru berhasil diimpor`, 'Import Guru', 'success');
      addNotification('Impor Data Guru', `${filteredNew.length} data guru berhasil diimpor ke dalam database.`);
      
      // Auto-sync each imported teacher
      filteredNew.forEach(teacher => {
        syncTeacherToSupabase(teacher);
      });
      
      return [...filteredNew, ...prev];
    });
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    setConfirmDelete({
      isOpen: true,
      title: 'Hapus Guru / Tenaga Kependidikan',
      message: `Apakah Anda yakin ingin menghapus data guru "${teacher.nama}"?`,
      onConfirm: () => {
        setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
        addToast(`Data guru "${teacher.nama}" berhasil dihapus dari sistem`, 'Hapus Guru', 'error');
        addNotification('Guru Dihapus', `Data guru/tendik bernama ${teacher.nama} telah dihapus permanen oleh Administrator.`);

        // Auto-delete from Supabase in the background
        deleteTeacherFromSupabase(teacher.id, true).then((res) => {
          if (res.success) {
            addToast(`Guru "${teacher.nama}" otomatis dihapus dari Supabase Cloud`, 'Database Sync', 'info');
          }
        });
        setConfirmDelete(null);
      }
    });
  };

  const handleToggleTeacherStatus = (teacher: Teacher) => {
    const newStatus = teacher.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    const updatedTeacher = { ...teacher, status: newStatus as 'Aktif' | 'Non-Aktif' | 'Lulus' | 'Mutasi/Pindah' | 'Dikeluarkan' };
    
    setTeachers((prev) => prev.map((t) => t.id === teacher.id ? updatedTeacher : t));
    addToast(`Status guru "${teacher.nama}" berhasil diubah menjadi ${newStatus}`, 'Ubah Status', 'success');

    // Direct sync of teacher status update to Supabase
    const { url, anonKey } = getStoredSupabaseConfig();
    if (url && anonKey) {
      syncTeacherToSupabase(updatedTeacher, true).then((res) => {
        if (res.success) {
          addToast(`Perubahan status guru/tendik "${teacher.nama}" berhasil disinkronkan ke Supabase Cloud`, 'Database Sync', 'success');
        }
      });
    }
  };

  // Institution Profile Update
  const handleSaveInstitution = (updated: Institution) => {
    setInstitution(updated);
    addToast('Identitas lembaga berhasil diperbarui', 'Konfigurasi Lembaga', 'success');
    addNotification('Identitas Lembaga Diperbarui', `Informasi identitas ${updated.name} (NPSN: ${updated.npsn}) berhasil diperbarui.`);

    // Direct sync to Supabase in the background (if configured)
    const { url, anonKey } = getStoredSupabaseConfig();
    if (url && anonKey) {
      syncInstitutionToSupabase(updated, true).then((res) => {
        if (res.success) {
          addToast(`Profil lembaga berhasil disinkronkan ke Supabase Cloud`, 'Database Sync', 'success');
        } else {
          addToast(`Gagal menyinkronkan profil lembaga: ${res.error || 'Periksa koneksi Anda.'}`, 'Database Sync', 'error');
        }
      });
    }
  };

  const handleSyncData = () => {
    addToast('Sinkronisasi data dengan server Dapodik selesai', 'Sinkronisasi Realtime', 'success');
    addNotification('Data Lembaga Sinkron', 'Proses penyesuaian profil dan rekap administratif dengan server pusat selesai.');
  };

  const handleSaveClass = (updatedClass: Kelas) => {
    const isEditing = classes.some((c) => c.id === updatedClass.id);
    const oldClass = classes.find((c) => c.id === updatedClass.id);
    const oldName = oldClass ? oldClass.nama : '';
    
    // 1. Update the classes list
    let nextClasses: Kelas[];
    if (isEditing) {
      nextClasses = classes.map((c) => (c.id === updatedClass.id ? updatedClass : c));
    } else {
      nextClasses = [updatedClass, ...classes];
    }
    setClasses(sortClasses(nextClasses));

    // 2. Sync students' kelas fields
    setStudents((prevStudents) => {
      return prevStudents.map((std) => {
        // If student is selected in this class, set their kelas name to the new name
        if (updatedClass.siswaIds.includes(std.id)) {
          return { ...std, kelas: updatedClass.nama };
        }
        // If student was in this class but now is not, reset their kelas to unassigned ("-")
        if ((std.kelas === updatedClass.nama || (oldName && std.kelas === oldName)) && !updatedClass.siswaIds.includes(std.id)) {
          return { ...std, kelas: '-' };
        }
        return std;
      });
    });
    
    // Add toast and notification
    if (isEditing) {
      addToast(`Data kelas "${updatedClass.nama}" berhasil diperbarui`, 'Edit Kelas', 'success');
      addNotification('Pembaruan Data Kelas', `Data administratif kelas "${updatedClass.nama}" berhasil diperbarui.`);
    } else {
      addToast(`Kelas "${updatedClass.nama}" berhasil ditambahkan ke database`, 'Tambah Kelas', 'success');
      addNotification('Kelas Baru Ditambahkan', `Kelas baru "${updatedClass.nama}" dengan kapasitas ${updatedClass.kapasitas} siswa telah ditambahkan ke database.`);
    }

    // Direct sync to Supabase in the background (if configured)
    const { url, anonKey } = getStoredSupabaseConfig();
    if (url && anonKey) {
      syncClassToSupabase(updatedClass, true).then((res) => {
        if (res.success) {
          addToast(`Rombel kelas "${updatedClass.nama}" berhasil disinkronkan ke Supabase Cloud`, 'Database Sync', 'success');
        } else {
          let errMsg = res.error || 'Periksa koneksi Anda.';
          if (errMsg.includes('PGRST204') || errMsg.toLowerCase().includes('schema cache')) {
            errMsg += ' 💡 Solusi: Jalankan "NOTIFY pgrst, \'reload schema\';" di SQL Editor Supabase Anda untuk memuat ulang cache.';
          }
          addToast(`Gagal menyinkronkan "${updatedClass.nama}" ke Supabase: ${errMsg}`, 'Database Sync', 'error');
        }
      });
    }
  };

  const handleDeleteClass = (classId: string, className: string) => {
    setConfirmDelete({
      isOpen: true,
      title: 'Hapus Rombongan Belajar',
      message: `Apakah Anda yakin ingin menghapus kelas "${className}"? Semua siswa di kelas ini akan menjadi tidak memiliki kelas.`,
      onConfirm: () => {
        setClasses((prev) => sortClasses(prev.filter((c) => c.id !== classId)));
        setStudents((prevStudents) =>
          prevStudents.map((std) => (std.kelas === className ? { ...std, kelas: '-' } : std))
        );
        addToast(`Data kelas "${className}" berhasil dihapus`, 'Hapus Kelas', 'error');
        addNotification('Kelas Dihapus', `Data rombel kelas "${className}" telah dihapus permanen oleh Administrator.`);

        // Direct sync delete to Supabase in the background (if configured)
        const { url, anonKey } = getStoredSupabaseConfig();
        if (url && anonKey) {
          deleteClassFromSupabase(classId, true).then((res) => {
            if (res.success) {
              addToast(`Rombel kelas "${className}" berhasil dihapus dari Supabase Cloud`, 'Database Sync', 'success');
            }
          });
        }
        setConfirmDelete(null);
      }
    });
  };

  if (inlinePrintConfig) {
    if (inlinePrintConfig.type === 'teacher' || inlinePrintConfig.type === 'all-teachers') {
      return (
        <PrintTeacherPage
          teacherId={inlinePrintConfig.teacherId}
          teachers={teachers}
          institution={institution}
          onClose={() => setInlinePrintConfig(null)}
        />
      );
    }
    return (
      <PrintStudentPage
        studentId={inlinePrintConfig.studentId}
        printClass={inlinePrintConfig.className}
        printAll={inlinePrintConfig.type === 'all'}
        students={students}
        institution={institution}
        onClose={() => setInlinePrintConfig(null)}
      />
    );
  }

  if (printStudentId) {
    return (
      <PrintStudentPage
        studentId={printStudentId}
        students={students}
        institution={institution}
      />
    );
  }

  if (!userRole) {
    return (
      <>
        <LandingPage
          students={students}
          teachers={teachers}
          institution={institution}
          onLoginSuccess={handleLoginSuccess}
          addToast={addToast}
        />
        <Toast toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Sidebar Component */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
        institution={institution}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        userRole={userRole}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        {/* Header Component */}
        <Header
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          institution={institution}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onLogoutClick={() => setLogoutModalOpen(true)}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          userRole={userRole}
          currentUser={currentUser}
        />

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-6 md:pb-12 scrollbar-hide">
          <div className="max-w-7xl mx-auto">
            {currentPage === 'dashboard' && (
              <DashboardView
                students={students}
                teachers={teachers}
                onNavigate={setCurrentPage}
                userRole={userRole}
                currentUser={currentUser}
              />
            )}

            {currentPage === 'profil' && (
              <LembagaView
                institution={institution}
                onUpdateTrigger={handleSyncData}
                onSaveInstitution={handleSaveInstitution}
              />
            )}

            {currentPage === 'siswa' && (
              <SiswaView
                institution={institution}
                students={students}
                setStudents={setStudents}
                mutations={mutations}
                setMutations={setMutations}
                promotions={promotions}
                setPromotions={setPromotions}
                graduations={graduations}
                setGraduations={setGraduations}
                onAddClick={handleAddStudentClick}
                onEditClick={handleEditStudentClick}
                onDeleteClick={handleDeleteStudent}
                onResetPassword={handleResetPassword}
                onViewDetail={handleViewStudentDetail}
                onImportStudents={handleImportStudents}
                addToast={addToast}
                onPrintBiodata={(config) => setInlinePrintConfig(config)}
              />
            )}

            {currentPage === 'sarpras' && (
              <SarprasView
                classes={classes}
                students={students}
                teachers={teachers}
                institution={institution}
                onSaveClass={handleSaveClass}
                onDeleteClass={handleDeleteClass}
                addToast={addToast}
                addNotification={addNotification}
              />
            )}

            {currentPage === 'akademik' && (
              <AkademikView
                institution={institution}
                classes={classes}
                teachers={teachers}
                addToast={addToast}
                addNotification={addNotification}
              />
            )}

            {currentPage === 'guru' && (
              <GuruView
                institution={institution}
                teachers={teachers}
                onAddClick={handleAddTeacherClick}
                onEditClick={handleEditTeacherClick}
                onDeleteClick={handleDeleteTeacher}
                onImportTeachers={handleImportTeachers}
                onToggleStatus={handleToggleTeacherStatus}
                onPrintBiodata={(config) => setInlinePrintConfig(config)}
                onViewDetail={(tch) => {
                  setViewingTeacher(tch);
                  setTeacherDetailOpen(true);
                }}
                addToast={addToast}
              />
            )}

            {currentPage === 'database' && (
              <SupabaseView 
                students={students}
                setStudents={setStudents}
                teachers={teachers}
                setTeachers={setTeachers}
                classes={classes}
                setClasses={setClasses}
                institution={institution}
                setInstitution={setInstitution}
                notifications={notifications}
                setNotifications={setNotifications}
                addToast={addToast}
                addNotification={addNotification}
              />
            )}

            {currentPage === 'settings' && (
              <SettingsView
                institution={institution}
                onSaveInstitution={handleSaveInstitution}
              />
            )}

            {currentPage === 'lms-emateri' && (
              <EMateriView
                classes={classes}
                teachers={teachers}
                institution={institution}
                addToast={addToast}
                addNotification={addNotification}
                currentUser={currentUser}
                userRole={userRole}
              />
            )}

            {currentPage === 'lms-jurnal' && (
              <JurnalMengajarView
                classes={classes}
                teachers={teachers}
                students={students}
                addToast={addToast}
                addNotification={addNotification}
                userRole={userRole}
                currentUser={currentUser}
              />
            )}

            {currentPage === 'lms-asesmen' && (
              <AsesmenView
                classes={classes}
                teachers={teachers}
                students={students}
                addToast={addToast}
                addNotification={addNotification}
                userRole={userRole}
                currentUser={currentUser}
              />
            )}

            {currentPage === 'presensi' && (
              <PresensiView
                classes={classes}
                teachers={teachers}
                students={students}
                institution={institution}
                addToast={addToast}
                addNotification={addNotification}
              />
            )}

            {currentPage.startsWith('kesiswaan-') && (
              <KesiswaanView
                currentPage={currentPage}
                students={students}
                teachers={teachers}
                classes={classes}
                addToast={addToast}
                addNotification={addNotification}
                currentUser={currentUser}
                userRole={userRole}
              />
            )}

            {currentPage === 'notifikasi' && (
              <div className="animate-fade-in block">
                <div className="bento-card bg-white max-w-3xl mx-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <h3 className="font-extrabold text-slate-800 text-lg">Pusat Informasi & Notifikasi</h3>
                    {notifications.some((n) => !n.read) && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        Tandai Semua Dibaca
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {notifications.length === 0 ? (
                      <p className="text-center py-10 text-slate-400 font-semibold text-sm">Belum ada notifikasi</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            notif.read ? 'bg-slate-50/50 border-slate-100 text-slate-500' : 'bg-teal-50/20 border-teal-100 text-slate-800 font-medium'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-slate-800">{notif.title}</h4>
                            <span className="text-[10px] text-slate-400">{notif.time}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{notif.message}</p>
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkNotificationRead(notif.id)}
                              className="text-[10px] text-teal-600 hover:text-teal-700 font-bold uppercase tracking-wider mt-3 block cursor-pointer"
                            >
                              Tandai Telah Dibaca
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Custom Toast System */}
      <Toast toasts={toasts} onClose={removeToast} />

      {/* Student Add/Edit Modal */}
      <StudentModal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        onSave={handleSaveStudent}
        editingStudent={editingStudent}
        students={students}
      />

      {/* Teacher Add/Edit Modal */}
      <TeacherModal
        isOpen={teacherModalOpen}
        onClose={() => setTeacherModalOpen(false)}
        onSave={handleSaveTeacher}
        editingTeacher={editingTeacher}
      />

      {/* Student Detail Viewer Modal */}
      <StudentDetailModal
        isOpen={studentDetailOpen}
        onClose={() => {
          setStudentDetailOpen(false);
          setViewingStudent(null);
        }}
        student={viewingStudent}
        institution={institution}
        onPrintBiodata={(id) => setInlinePrintConfig({ type: 'student', studentId: id })}
      />

      {/* Teacher Detail Viewer Modal */}
      <TeacherDetailModal
        isOpen={teacherDetailOpen}
        onClose={() => {
          setTeacherDetailOpen(false);
          setViewingTeacher(null);
        }}
        teacher={viewingTeacher}
        institution={institution}
        onPrintBiodata={(id) => setInlinePrintConfig({ type: 'teacher', teacherId: id })}
      />

      {/* Reset Password Student Modal */}
      {resetPasswordStudent && (
        <div id="reset-password-modal" className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setResetPasswordStudent(null)}></div>
          <div className="bg-white rounded-[2rem] p-10 max-w-sm w-full relative shadow-2xl animate-fade-in z-50 text-left">
            <div className="w-16 h-16 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Key size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Reset Password Siswa</h3>
            <p className="text-slate-400 text-center text-xs font-semibold mb-6">
              Mengubah kata sandi untuk siswa <span className="text-slate-800 font-extrabold">{resetPasswordStudent.nama}</span> (NIS: {resetPasswordStudent.nis})
            </p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showNewPasswordInModal ? 'text' : 'password'}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-sm font-bold text-slate-700 pr-10"
                    placeholder="Masukkan sandi baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordInModal(!showNewPasswordInModal)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPasswordInModal ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">Disarankan menggunakan kata sandi unik yang mudah diingat siswa.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setResetPasswordStudent(null)}
                className="py-3.5 px-4 bg-slate-50 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveResetPassword}
                className="py-3.5 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100 transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div id="logout-modal" className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setLogoutModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] p-10 max-w-sm w-full relative shadow-2xl animate-fade-in z-50">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Keluar Aplikasi?</h3>
            <p className="text-slate-400 text-center text-sm font-medium mb-8 leading-relaxed">
              Anda perlu masuk kembali untuk mengakses data manajemen lembaga.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="py-3.5 px-4 bg-slate-50 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="py-3.5 px-4 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-100 transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog (Durable & Iframe-Safe) */}
      {confirmDelete && (
        <div id="confirm-delete-modal" className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setConfirmDelete(null)}></div>
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full relative shadow-2xl animate-fade-in z-[160] text-left">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 text-center mb-2">{confirmDelete.title}</h3>
            <p className="text-slate-400 text-center text-xs font-semibold mb-6 leading-relaxed">
              {confirmDelete.message}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="py-3 px-4 bg-slate-50 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs uppercase tracking-wider cursor-pointer text-center border border-slate-200"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete.onConfirm}
                className="py-3 px-4 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-100 transition-colors text-xs uppercase tracking-wider cursor-pointer text-center"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
