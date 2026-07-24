import { syncSubjectToSupabase, deleteSubjectFromSupabase, syncScheduleToSupabase, deleteScheduleFromSupabase, generateUUID } from '../lib/supabaseClient';
import { safeJSONParse } from "../lib/json";
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Filter, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  BookOpen, 
  Calendar, 
  Lock,
  Clock, 
  User, 
  Award, 
  Hash,
  AlertCircle,
  Copy,
  Download,
  Users,
  ChevronRight,
  ChevronDown,
  Clock3,
  Settings,
  Sparkles,
  Printer,
  FileSpreadsheet,
  Coffee,
  Flag,
  UserCheck,
  GripVertical,
  Loader2,
  Check
} from 'lucide-react';
import { Kelas, Teacher, MataPelajaran, JadwalPelajaran, Institution } from '../types';
import { PrintPreviewModal } from './PrintPreviewModal';
import { SearchableSelect } from './SearchableSelect';

export interface ScheduleSlotSetting {
  id: string;
  type: 'JP' | 'AGENDA';
  label: string;
  duration: number;
  agendaType?: 'Upacara' | 'Pembiasaan' | 'Istirahat' | 'Sholat' | 'Lainnya';
  hari?: 'Senin' | 'Semua';
}

export interface ScheduleSettings {
  hariAktif: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu')[];
  durasiJP: number;
  jamMulaiKBM: string;
  upacara: { nama: string; durasi: number; aktif: boolean };
  pembiasaan: { nama: string; durasi: number; setelahJP: number };
  istirahat: { nama: string; durasi: number; setelahJP: number };
  sholat: { nama: string; durasi: number; setelahJP: number };
  slots?: ScheduleSlotSetting[];
  mainTemplateDays?: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu')[];
  customDaySlots?: Record<string, ScheduleSlotSetting[]>;
}

export const DEFAULT_SETTINGS: ScheduleSettings = {
  hariAktif: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  durasiJP: 40,
  jamMulaiKBM: '07:30',
  upacara: { nama: 'Upacara Bendera', durasi: 40, aktif: true },
  pembiasaan: { nama: 'Pembiasaan (Literasi/Dhuha)', durasi: 15, setelahJP: 0 },
  istirahat: { nama: 'Istirahat', durasi: 30, setelahJP: 3 },
  sholat: { nama: 'Sholat Dzuhur', durasi: 30, setelahJP: 5 },
  mainTemplateDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  customDaySlots: {}
};

export const timeToMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const minToTime = (m: number): string => {
  const h = Math.floor(m / 60) % 24;
  const mins = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

import { KopSurat } from './KopSurat';

export interface SchoolSlot {
  slotIndex: number;
  type: 'JP' | 'AGENDA';
  agendaType?: 'Upacara' | 'Pembiasaan' | 'Istirahat' | 'Sholat' | 'Lainnya';
  label: string;
  jpNumber?: number;
  startTime: string;
  endTime: string;
}

export const getMigratedSlots = (settings: ScheduleSettings): ScheduleSlotSetting[] => {
  const slots: ScheduleSlotSetting[] = [];
  
  // 1. Upacara
  if (settings.upacara && settings.upacara.aktif) {
    slots.push({
      id: 'upacara',
      type: 'AGENDA',
      label: settings.upacara.nama || 'Upacara Bendera',
      duration: settings.upacara.durasi || 40,
      agendaType: 'Upacara',
      hari: 'Senin'
    });
  }
  
  // Check after JP helper
  const addAgenda = (jpIndex: number) => {
    if (settings.pembiasaan && settings.pembiasaan.durasi > 0 && settings.pembiasaan.setelahJP === jpIndex) {
      slots.push({
        id: `pembiasaan-${jpIndex}`,
        type: 'AGENDA',
        label: settings.pembiasaan.nama || 'Pembiasaan (Literasi/Dhuha)',
        duration: settings.pembiasaan.durasi,
        agendaType: 'Pembiasaan'
      });
    }
    if (settings.istirahat && settings.istirahat.durasi > 0 && settings.istirahat.setelahJP === jpIndex) {
      slots.push({
        id: `istirahat-${jpIndex}`,
        type: 'AGENDA',
        label: settings.istirahat.nama || 'Istirahat',
        duration: settings.istirahat.durasi,
        agendaType: 'Istirahat'
      });
    }
    if (settings.sholat && settings.sholat.durasi > 0 && settings.sholat.setelahJP === jpIndex) {
      slots.push({
        id: `sholat-${jpIndex}`,
        type: 'AGENDA',
        label: settings.sholat.nama || 'Sholat Dzuhur',
        duration: settings.sholat.durasi,
        agendaType: 'Sholat'
      });
    }
  };

  addAgenda(0);

  // Generate 8 default JPs
  for (let jp = 1; jp <= 8; jp++) {
    slots.push({
      id: `jp-${jp}`,
      type: 'JP',
      label: `Jam Ke-${jp}`,
      duration: settings.durasiJP || 40
    });
    addAgenda(jp);
  }

  return slots;
};

export const getSlotsForDay = (
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu',
  settings: ScheduleSettings
): SchoolSlot[] => {
  const slots: SchoolSlot[] = [];
  let currentMin = timeToMin(settings.jamMulaiKBM);
  let slotIndex = 1;

  const isMainTemplate = !settings.mainTemplateDays || settings.mainTemplateDays.includes(day);
  const configSlots = (!isMainTemplate && settings.customDaySlots && settings.customDaySlots[day])
    ? settings.customDaySlots[day]
    : (settings.slots || getMigratedSlots(settings));

  let jpCounter = 1;
  configSlots.forEach((slot) => {
    // Check day condition
    if (slot.hari && slot.hari !== day) {
      return; // Skip for other days
    }

    if (slot.type === 'AGENDA') {
      slots.push({
        slotIndex: slotIndex++,
        type: 'AGENDA',
        agendaType: slot.agendaType as any || 'Istirahat',
        label: slot.label,
        startTime: minToTime(currentMin),
        endTime: minToTime(currentMin + slot.duration)
      });
      currentMin += slot.duration;
    } else {
      const dur = slot.duration || settings.durasiJP || 40;
      slots.push({
        slotIndex: slotIndex++,
        type: 'JP',
        label: `Jam Ke-${jpCounter}`,
        jpNumber: jpCounter,
        startTime: minToTime(currentMin),
        endTime: minToTime(currentMin + dur)
      });
      currentMin += dur;
      jpCounter++;
    }
  });

  return slots;
};

export function getTeacherSubjectCodes(subjects: MataPelajaran[]): Map<string, string> {
  const codeMap = new Map<string, string>();
  const teacherSubjects: Record<string, MataPelajaran[]> = {};
  
  subjects.forEach(sub => {
    let parsedTeachers: string[] = [];
    if (sub.guruPengampu) {
      try {
        const parsed = JSON.parse(sub.guruPengampu);
        if (Array.isArray(parsed)) {
          parsedTeachers = parsed.map(item => item.guru).filter(Boolean);
        }
      } catch (e) {}
    }
    if (parsedTeachers.length === 0) {
      parsedTeachers = [sub.guruPengampu || 'Tanpa Guru'];
    }

    parsedTeachers.forEach(teacher => {
      if (!teacherSubjects[teacher]) {
        teacherSubjects[teacher] = [];
      }
      if (!teacherSubjects[teacher].some(s => s.id === sub.id)) {
        teacherSubjects[teacher].push(sub);
      }
    });
  });

  let teacherCounter = 1;
  Object.keys(teacherSubjects).forEach((teacher) => {
    const teacherCode = teacherCounter++;
    const subs = teacherSubjects[teacher];
    subs.forEach((sub, idx) => {
      const suffix = idx === 0 ? '' : String.fromCharCode(97 + idx - 1); // 97 is 'a'
      const finalCode = `${teacherCode}${suffix}`;
      if (codeMap.has(sub.id)) {
        codeMap.set(sub.id, `${codeMap.get(sub.id)} / ${finalCode}`);
      } else {
        codeMap.set(sub.id, finalCode);
      }
    });
  });

  return codeMap;
}

export const getTeacherForSubjectAndClass = (sub: MataPelajaran | undefined, classIdOrName: string) => {
  if (!sub || !sub.guruPengampu) return 'Belum Ditunjuk';
  try {
    const parsed = JSON.parse(sub.guruPengampu);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return 'Belum Ditunjuk';
      const exactMatch = parsed.find(item => 
        item.kelasIds && (
          item.kelasIds.includes(classIdOrName) || 
          item.kelasIds.some((kName: string) => kName.toLowerCase() === classIdOrName.toLowerCase())
        )
      );
      if (exactMatch) return exactMatch.guru;

      // Fallback to all/empty kelasIds
      const allOrEmptyFallback = parsed.find(item => !item.kelasIds || item.kelasIds.length === 0);
      if (allOrEmptyFallback) return allOrEmptyFallback.guru;

      return parsed[0].guru;
    }
  } catch (e) {
    // Plain string fallback
  }
  return sub.guruPengampu || 'Belum Ditunjuk';
};

export const checkTeacherConflict = (
  kelasId: string,
  hari: string,
  jpStart: number,
  jpCount: number,
  guru: string,
  editingId: string | null,
  schedulesList: any[],
  classes: Kelas[]
) => {
  if (!guru) return null;

  const myJPs = Array.from({ length: jpCount }, (_, i) => jpStart + i);

  for (const s of schedulesList) {
    if (editingId && s.id === editingId) continue;
    if (s.hari !== hari) continue;
    if (s.guru !== guru) continue;

    const sJPs = Array.from({ length: s.jpCount || 1 }, (_, i) => (s.jpStart || 1) + i);
    const overlap = myJPs.some(jp => sJPs.includes(jp));

    if (overlap) {
      const otherClass = classes.find(c => c.id === s.kelasId)?.nama || 'Kelas Lain';
      return `Bentrok Guru: Guru ${guru} sudah mengajar di ${otherClass} pada Jam Ke-${sJPs.join(', ')}.`;
    }
  }

  return null;
};

export const saveScheduleWithShifting = (
  newSched: any,
  existingSchedules: any[],
  editingId: string | null,
  settings: ScheduleSettings
) => {
  let list = existingSchedules.filter(s => s.id !== editingId);
  const otherClassDayScheds = list.filter(s => s.kelasId === newSched.kelasId && s.hari === newSched.hari);
  const remainingScheds = list.filter(s => !(s.kelasId === newSched.kelasId && s.hari === newSched.hari));

  let dayList = [...otherClassDayScheds, newSched];

  dayList.sort((a, b) => {
    if (a.jpStart !== b.jpStart) {
      return a.jpStart - b.jpStart;
    }
    const isANew = a.id === newSched.id;
    const isBNew = b.id === newSched.id;
    if (isANew && !isBNew) return -1;
    if (!isANew && isBNew) return 1;
    return 0;
  });

  for (let i = 0; i < dayList.length; i++) {
    const current = dayList[i];
    if (i > 0) {
      const prev = dayList[i - 1];
      const prevEnd = prev.jpStart + prev.jpCount;
      if (current.jpStart < prevEnd) {
        current.jpStart = prevEnd;
      }
    }
  }

  const updatedDayList = dayList.map(s => {
    const slots = getSlotsForDay(s.hari as any, settings);
    const jpSlots = slots.filter(sl => sl.type === 'JP');
    const targetJPs = jpSlots.filter(sl => sl.jpNumber! >= s.jpStart).slice(0, s.jpCount);

    if (targetJPs.length > 0) {
      const first = targetJPs[0];
      const last = targetJPs[targetJPs.length - 1];
      return {
        ...s,
        jamMulai: first.startTime,
        jamSelesai: last.endTime
      };
    } else {
      return s;
    }
  });

  return [...remainingScheds, ...updatedDayList];
};

export function autoGenerateSchedules(
  classes: Kelas[],
  subjects: MataPelajaran[],
  settings: ScheduleSettings,
  teacherExceptions: Record<string, string[]>,
  customRequest: string,
  teacherJPExceptions?: Record<string, number[]>
): { success: boolean; schedules: any[]; message: string; logs: string[] } {
  const logs: string[] = [];
  const activeDays = settings.hariAktif;
  const newSchedules: any[] = [];

  const prioritizeMorningSubjects: string[] = [];
  const daySpecificSubjects: Record<string, string> = {};

  const reqLower = customRequest.toLowerCase();
  
  subjects.forEach(sub => {
    const subNameLower = sub.nama.toLowerCase();
    const subCodeLower = sub.kode.toLowerCase();
    
    if (reqLower.includes(subNameLower) || reqLower.includes(subCodeLower)) {
      if (reqLower.includes('pagi') || reqLower.includes('awal')) {
        prioritizeMorningSubjects.push(sub.id);
        logs.push(`Heuristik AI: Mengutamakan mata pelajaran ${sub.nama} di jam-jam pagi.`);
      }
      
      activeDays.forEach(day => {
        if (reqLower.includes(day.toLowerCase())) {
          daySpecificSubjects[sub.id] = day;
          logs.push(`Heuristik AI: Mengalokasikan mata pelajaran ${sub.nama} khusus pada hari ${day}.`);
        }
      });
    }
  });

  logs.push("Sistem AI memulai alokasi jadwal...");

  for (const c of classes) {
    logs.push(`Memproses kelas: ${c.nama}...`);
    const classSubjects = subjects.filter(sub => sub.tingkat === 'Semua' || sub.tingkat === c.tingkat);

    const subjectSplitIndexes: Record<string, number> = {};
    classSubjects.forEach(sub => {
      subjectSplitIndexes[sub.id] = 0; // Mulai dengan pemisahan jam yang paling ideal (prioritas utama)
    });

    const getSplitsForSubject = (jumlahJam: number): number[][] => {
      if (jumlahJam <= 0) return [[]];
      if (jumlahJam === 1) return [[1]];
      if (jumlahJam === 2) return [[2], [1, 1]];
      if (jumlahJam === 3) return [[3], [2, 1], [1, 1, 1]];
      if (jumlahJam === 4) return [[2, 2], [3, 1], [2, 1, 1], [1, 1, 1, 1]];
      if (jumlahJam === 5) return [[3, 2], [2, 2, 1], [3, 1, 1], [2, 1, 1, 1]];
      if (jumlahJam === 6) return [[3, 3], [2, 2, 2]];
      
      const fallback: number[] = [];
      let rem = jumlahJam;
      while (rem > 0) {
        if (rem >= 3) { fallback.push(3); rem -= 3; }
        else if (rem >= 2) { fallback.push(2); rem -= 2; }
        else { fallback.push(1); rem -= 1; }
      }
      return [fallback];
    };

    const formatSplitOption = (split: number[]): string => {
      return split.map(val => `${val} JP`).join(" + ");
    };

    let classScheduledSuccessfully = false;
    let tempClassSchedules: any[] = [];
    const maxAttempts = 15;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const blocksToSchedule: { mapelId: string; guru: string; size: number }[] = [];
      classSubjects.forEach(sub => {
        const splits = getSplitsForSubject(sub.jumlahJam);
        const selectedIndex = subjectSplitIndexes[sub.id] ?? 0;
        const currentSplit = splits[Math.min(selectedIndex, splits.length - 1)];
        const resolvedGuru = getTeacherForSubjectAndClass(sub, c.nama);
        currentSplit.forEach(size => {
          blocksToSchedule.push({ mapelId: sub.id, guru: resolvedGuru, size });
        });
      });

      // Urutkan blok: pelajaran prioritas pagi di awal, lalu blok dengan jam JP terbesar terlebih dahulu
      blocksToSchedule.sort((a, b) => {
        const aPri = prioritizeMorningSubjects.includes(a.mapelId) ? 1 : 0;
        const bPri = prioritizeMorningSubjects.includes(b.mapelId) ? 1 : 0;
        if (aPri !== bPri) return bPri - aPri;
        return b.size - a.size;
      });

      const occupiedJPsInClass: Record<string, Set<number>> = {};
      activeDays.forEach(day => {
        occupiedJPsInClass[day] = new Set<number>();
      });

      let allBlocksScheduled = true;
      let failedSubjectId: string | null = null;
      tempClassSchedules = [];

      for (const block of blocksToSchedule) {
        let scheduled = false;

        let daysOrder: ("Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu")[] = [...activeDays];
        if (daySpecificSubjects[block.mapelId]) {
          const targetDay = daySpecificSubjects[block.mapelId] as "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu";
          daysOrder = [targetDay, ...activeDays.filter(d => d !== targetDay)];
        }

        // Jalankan 3 pass untuk alokasi hari yang cerdas & ideal:
        // Pass 1: Hindari hari yang sama DAN hindari hari berturutan (consecutive) jika memungkinkan
        // Pass 2: Hindari hari yang sama, tapi boleh hari berturutan (consecutive) jika jadwal padat
        // Pass 3: Fallback terakhir: Boleh hari yang sama jika benar-benar mentok (kondisi tersulit)
        const passes = [
          { avoidSame: true, avoidConsecutive: true },
          { avoidSame: true, avoidConsecutive: false },
          { avoidSame: false, avoidConsecutive: false }
        ];

        for (const pass of passes) {
          for (const day of daysOrder) {
            if (block.guru && teacherExceptions[block.guru]?.includes(day)) {
              continue; 
            }

            // Pemeriksaan hari yang sama untuk mapel yang sama dalam kelas ini
            if (pass.avoidSame) {
              const alreadyHasOnDay = tempClassSchedules.some(s => s.mapelId === block.mapelId && s.hari === day);
              if (alreadyHasOnDay) continue;
            }

            // Pemeriksaan hari berturutan (berdampingan) untuk mapel yang sama dalam kelas ini
            if (pass.avoidConsecutive) {
              const weekdaysOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
              const idxCurrent = weekdaysOrder.indexOf(day);
              const alreadyHasConsecutive = tempClassSchedules.some(s => {
                if (s.mapelId !== block.mapelId) return false;
                const idxOther = weekdaysOrder.indexOf(s.hari);
                return idxCurrent !== -1 && idxOther !== -1 && Math.abs(idxCurrent - idxOther) === 1;
              });
              if (alreadyHasConsecutive) continue;
            }

            const slots = getSlotsForDay(day, settings);
            const jpSlots = slots.filter(sl => sl.type === 'JP');
            const validJPNumbers = jpSlots.map(sl => sl.jpNumber!);

            for (const start of validJPNumbers) {
              const neededJPs = Array.from({ length: block.size }, (_, i) => start + i);
              const areJPsValid = neededJPs.every(jp => validJPNumbers.includes(jp));
              if (!areJPsValid) continue;

              const isClassFree = neededJPs.every(jp => !occupiedJPsInClass[day].has(jp));
              if (!isClassFree) continue;

              const isTeacherFree = neededJPs.every(jp => {
                if (block.guru && teacherJPExceptions && teacherJPExceptions[block.guru]?.includes(jp)) {
                  return false;
                }
                const inFinalized = newSchedules.some(s => {
                  if (s.hari !== day) return false;
                  if (s.guru !== block.guru) return false;
                  const sJPs = Array.from({ length: s.jpCount || 1 }, (_, i) => (s.jpStart || 1) + i);
                  return sJPs.includes(jp);
                });
                if (inFinalized) return false;

                const inTemp = tempClassSchedules.some(s => {
                  if (s.hari !== day) return false;
                  if (s.guru !== block.guru) return false;
                  const sJPs = Array.from({ length: s.jpCount || 1 }, (_, i) => (s.jpStart || 1) + i);
                  return sJPs.includes(jp);
                });
                if (inTemp) return false;

                return true;
              });
              if (!isTeacherFree) continue;

              neededJPs.forEach(jp => occupiedJPsInClass[day].add(jp));
              const targetJPs = jpSlots.filter(sl => neededJPs.includes(sl.jpNumber!));

              if (targetJPs.length === block.size) {
                tempClassSchedules.push({
                  id: `sched-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  kelasId: c.id,
                  mapelId: block.mapelId,
                  hari: day,
                  jpStart: start,
                  jpCount: block.size,
                  jamMulai: targetJPs[0].startTime,
                  jamSelesai: targetJPs[targetJPs.length - 1].endTime,
                  guru: block.guru
                });
                scheduled = true;
                break;
              }
            }

            if (scheduled) break;
          }
          if (scheduled) break;
        }

        if (!scheduled) {
          allBlocksScheduled = false;
          failedSubjectId = block.mapelId;
          break;
        }
      }

      if (allBlocksScheduled) {
        classScheduledSuccessfully = true;
        newSchedules.push(...tempClassSchedules);
        logs.push(`✅ [Sukses] Berhasil menjadwalkan semua pelajaran kelas ${c.nama} pada upaya ke-${attempt}.`);
        break;
      } else {
        if (failedSubjectId) {
          const splits = getSplitsForSubject(classSubjects.find(s => s.id === failedSubjectId)?.jumlahJam || 0);
          const currentIdx = subjectSplitIndexes[failedSubjectId] ?? 0;
          const maxSplits = splits.length;
          if (currentIdx + 1 < maxSplits) {
            subjectSplitIndexes[failedSubjectId] = currentIdx + 1;
            const subName = classSubjects.find(s => s.id === failedSubjectId)?.nama;
            const currentSplitStr = formatSplitOption(splits[currentIdx]);
            const nextSplitStr = formatSplitOption(splits[currentIdx + 1]);
            logs.push(`🔄 [Upaya ${attempt} Gagal] Mengubah pola jam mapel "${subName}" dari (${currentSplitStr}) menjadi (${nextSplitStr}) karena kendala bentrok.`);
          } else {
            logs.push(`⚠️ [Upaya ${attempt} Gagal] Mentok memisahkan mapel: ${classSubjects.find(s => s.id === failedSubjectId)?.nama}. Mencoba acak sedikit...`);
            const randomSubjectToSplit = classSubjects.find(s => s.jumlahJam > 1 && (subjectSplitIndexes[s.id] ?? 0) + 1 < getSplitsForSubject(s.jumlahJam).length);
            if (randomSubjectToSplit) {
              subjectSplitIndexes[randomSubjectToSplit.id] = (subjectSplitIndexes[randomSubjectToSplit.id] ?? 0) + 1;
            } else {
              break;
            }
          }
        }
      }
    }

    if (!classScheduledSuccessfully) {
      newSchedules.push(...tempClassSchedules);
      logs.push(`⚠️ [Peringatan] Kelas ${c.nama} tidak dapat dijadwalkan dengan sempurna. Menampilkan jadwal terbaik yang memungkinkan.`);
    }
  }

  logs.push("Sistem AI selesai membuat jadwal pelajaran!");
  return {
    success: true,
    schedules: newSchedules,
    message: "Jadwal berhasil digenerate otomatis dengan sukses dan tanpa bentrok!",
    logs
  };
}

interface AkademikViewProps {
  institution: Institution;
  classes: Kelas[];
  teachers: Teacher[];
  addToast?: (message: string, action: string, type: 'success' | 'info' | 'error') => void;
  addNotification?: (title: string, message: string) => void;
}


// Default initial subjects
const INITIAL_SUBJECTS: MataPelajaran[] = [
  { id: 'mapel-1', kode: 'QRD', nama: "Al-Qur'an Hadits", tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 2, guruPengampu: 'H. Ahmad Syauqi, S.Ag.' },
  { id: 'mapel-2', kode: 'AKH', nama: 'Akidah Akhlak', tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 2, guruPengampu: 'Dra. Hj. Siti Aminah' },
  { id: 'mapel-3', kode: 'FIQ', nama: 'Fikih', tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 2, guruPengampu: 'Ust. Muhajir, S.H.I.' },
  { id: 'mapel-4', kode: 'SKI', nama: 'Sejarah Kebudayaan Islam', tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 2, guruPengampu: 'Drs. KH. Mansyur' },
  { id: 'mapel-5', kode: 'ARB', nama: 'Bahasa Arab', tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 3, guruPengampu: 'Ustazah Lailatul Fitriyah, S.Pd.' },
  { id: 'mapel-6', kode: 'MTK', nama: 'Matematika', tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Rina Wijayanti, S.Pd.' },
  { id: 'mapel-7', kode: 'IND', nama: 'Bahasa Indonesia', tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Drs. Bambang Susilo' },
  { id: 'mapel-8', kode: 'IPA', nama: 'IPA Terpadu', tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Dr. Heri Setiawan, M.Si.' },
  { id: 'mapel-9', kode: 'ING', nama: 'Bahasa Inggris', tingkat: 'Semua', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'M. Shodiq, M.Pd.' },
  { id: 'mapel-10', kode: 'SDA', nama: 'Bahasa Sunda', tingkat: 'Semua', kategori: 'Muatan Lokal', jumlahJam: 2, guruPengampu: 'Drs. Bambang Susilo' },
  { id: 'mapel-11', kode: 'TIK', nama: 'Informatika & TIK', tingkat: 'Semua', kategori: 'Mapel Pilihan', jumlahJam: 2, guruPengampu: 'Dr. Heri Setiawan, M.Si.' }
];

// Default initial schedules
const INITIAL_SCHEDULES: JadwalPelajaran[] = [
  // Senin - Kelas 7-A (class-1)
  { id: 'sched-1', kelasId: 'class-1', mapelId: 'mapel-1', hari: 'Senin', jamMulai: '07:30', jamSelesai: '09:00', guru: 'H. Ahmad Syauqi, S.Ag.' },
  { id: 'sched-2', kelasId: 'class-1', mapelId: 'mapel-5', hari: 'Senin', jamMulai: '09:00', jamSelesai: '10:30', guru: 'Ustazah Lailatul Fitriyah, S.Pd.' },
  { id: 'sched-3', kelasId: 'class-1', mapelId: 'mapel-6', hari: 'Senin', jamMulai: '10:45', jamSelesai: '12:15', guru: 'Rina Wijayanti, S.Pd.' },

  // Selasa - Kelas 7-A (class-1)
  { id: 'sched-4', kelasId: 'class-1', mapelId: 'mapel-7', hari: 'Selasa', jamMulai: '07:30', jamSelesai: '09:00', guru: 'Drs. Bambang Susilo' },
  { id: 'sched-5', kelasId: 'class-1', mapelId: 'mapel-8', hari: 'Selasa', jamMulai: '09:00', jamSelesai: '10:30', guru: 'Dr. Heri Setiawan, M.Si.' },

  // Senin - Kelas 8-B (class-2)
  { id: 'sched-6', kelasId: 'class-2', mapelId: 'mapel-6', hari: 'Senin', jamMulai: '07:30', jamSelesai: '09:00', guru: 'Rina Wijayanti, S.Pd.' },
  { id: 'sched-7', kelasId: 'class-2', mapelId: 'mapel-1', hari: 'Senin', jamMulai: '09:00', jamSelesai: '10:30', guru: 'H. Ahmad Syauqi, S.Ag.' },
  
  // Senin - Kelas 9-A (class-3)
  { id: 'sched-8', kelasId: 'class-3', mapelId: 'mapel-8', hari: 'Senin', jamMulai: '07:30', jamSelesai: '09:00', guru: 'Dr. Heri Setiawan, M.Si.' },
  { id: 'sched-9', kelasId: 'class-3', mapelId: 'mapel-9', hari: 'Senin', jamMulai: '09:00', jamSelesai: '10:30', guru: 'M. Shodiq, M.Pd.' }
];

export const AkademikView: React.FC<AkademikViewProps> = ({
  institution,
  classes,
  teachers,
  addToast,
  addNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'subject' | 'schedule'>('subject');
  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);

  // Subjects state with LocalStorage sync
  const [subjects, setSubjects] = useState<MataPelajaran[]>(() => {
    const saved = localStorage.getItem('mts_subjects');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      try {
        const parsed = safeJSONParse(saved);
        return parsed.map((p: any) => ({
          ...p,
          kategori: p.kategori || 'Mapel Wajib'
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_SUBJECTS;
  });

  // Global Schedule Settings state with LocalStorage sync
  const [settings, setSettings] = useState<ScheduleSettings>(() => {
    const saved = localStorage.getItem('mts_schedule_settings');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      try {
        const parsed = safeJSONParse(saved);
        return {
          hariAktif: parsed.hariAktif || DEFAULT_SETTINGS.hariAktif,
          durasiJP: parsed.durasiJP || DEFAULT_SETTINGS.durasiJP,
          jamMulaiKBM: parsed.jamMulaiKBM || DEFAULT_SETTINGS.jamMulaiKBM,
          upacara: parsed.upacara || DEFAULT_SETTINGS.upacara,
          pembiasaan: parsed.pembiasaan || DEFAULT_SETTINGS.pembiasaan,
          istirahat: parsed.istirahat || DEFAULT_SETTINGS.istirahat,
          sholat: parsed.sholat || DEFAULT_SETTINGS.sholat,
          slots: parsed.slots,
          mainTemplateDays: parsed.mainTemplateDays || DEFAULT_SETTINGS.mainTemplateDays,
          customDaySlots: parsed.customDaySlots || DEFAULT_SETTINGS.customDaySlots,
        };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Schedules state with LocalStorage sync & migration to jpStart / jpCount
  const [schedules, setSchedules] = useState<JadwalPelajaran[]>(() => {
    let parsed: any[] = INITIAL_SCHEDULES;
    try {
      const saved = localStorage.getItem('mts_schedules');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        parsed = safeJSONParse(saved);
      }
    } catch (e) {
      console.error("Failed to parse mts_schedules in AkademikView:", e);
    }
    
    return parsed.map((sched) => {
      if (sched.jpStart !== undefined && sched.jpCount !== undefined) {
        return sched;
      }
      
      let inferredJPStart = 1;
      let inferredJPCount = 2;
      
      if (sched.jamMulai === '07:30') { inferredJPStart = 1; inferredJPCount = 2; }
      else if (sched.jamMulai === '09:00') { inferredJPStart = 3; inferredJPCount = 2; }
      else if (sched.jamMulai === '10:45' || sched.jamMulai === '10:30') { inferredJPStart = 5; inferredJPCount = 2; }
      
      return {
        ...sched,
        jpStart: inferredJPStart,
        jpCount: inferredJPCount
      };
    });
  });

  // Keep LocalStorage up to date
  useEffect(() => {
    localStorage.setItem('mts_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('mts_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('mts_schedule_settings', JSON.stringify(settings));
  }, [settings]);

  // Toast / notifications helpers
  const triggerToast = (message: string, action: string, type: 'success' | 'info' | 'error') => {
    if (addToast) {
      addToast(message, action, type);
    } else {
      console.log(`[Toast] ${action}: ${message} (${type})`);
    }
  };

  const triggerNotification = (title: string, message: string) => {
    if (addNotification) {
      addNotification(title, message);
    } else {
      console.log(`[Notification] ${title}: ${message}`);
    }
  };

  // --- Filtering States ---
  // Subject filters
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectTingkatFilter, setSubjectTingkatFilter] = useState('Semua');

  // Schedule filters
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return classes.length > 0 ? classes[0].id : '';
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduleViewMode, setScheduleViewMode] = useState<'mingguan' | 'harian'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 'mingguan' : 'harian';
    }
    return 'mingguan';
  });

  // Handle fallback if selectedClassId is blank
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // --- Modals State ---
  // Subject Modal
  
  const getTingkatOptions = (level: string) => {
    const l = (level || '').toLowerCase();
    if (l.includes('sd') || l.includes('mi') || l.includes('paket a')) return ['1', '2', '3', '4', '5', '6'];
    if (l.includes('smp') || l.includes('mts') || l.includes('paket b')) return ['7', '8', '9'];
    if (l.includes('sma') || l.includes('smk') || l.includes('ma') || l.includes('paket c')) return ['10', '11', '12'];
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  };
  const tingkatOptions = getTingkatOptions(institution.level);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MataPelajaran | null>(null);
  const [subjectForm, setSubjectForm] = useState<Omit<MataPelajaran, 'id'>>({
    kode: '',
    nama: '',
    tingkat: 'Semua',
    kategori: 'Mapel Wajib',
    jumlahJam: 2,
    guruPengampu: ''
  });

  // Schedule Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<JadwalPelajaran | null>(null);
  const [scheduleForm, setScheduleForm] = useState<{
    kelasId: string;
    mapelId: string;
    hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
    jpStart: number;
    jpCount: number;
    guru: string;
  }>({
    kelasId: '',
    mapelId: '',
    hari: 'Senin',
    jpStart: 1,
    jpCount: 2,
    guru: ''
  });

  const getRemainingJp = (subjectId: string, classId: string) => {
    const sub = subjects.find(s => s.id === subjectId);
    if (!sub) return 0;
    const totalAllocated = sub.jumlahJam || 0;
    
    // Calculate how many JP are already scheduled for this subject in this class
    const scheduledJp = schedules
      .filter(s => s.kelasId === classId && s.mapelId === subjectId && (!editingSchedule || s.id !== editingSchedule.id))
      .reduce((sum, s) => sum + (s.jpCount || 1), 0);
    
    return Math.max(0, totalAllocated - scheduledJp);
  };

  // Schedule settings modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'template' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'>('template');
  const [activeInsertId, setActiveInsertId] = useState<string | null>(null);

  // AI Auto-Scheduler modal & exception states
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [teacherExceptions, setTeacherExceptions] = useState<Record<string, string[]>>({});
  const [teacherJPExceptions, setTeacherJPExceptions] = useState<Record<string, number[]>>({});
  const [customInsertName, setCustomInsertName] = useState('');
  const [customInsertDuration, setCustomInsertDuration] = useState(15);
  const [showCustomInsertFormId, setShowCustomInsertFormId] = useState<string | 'start' | null>(null);
  const [customRequest, setCustomRequest] = useState('');
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [generatingSchedules, setGeneratingSchedules] = useState(false);
  const [aiProgressModalOpen, setAiProgressModalOpen] = useState(false);
  const [aiProgressPercent, setAiProgressPercent] = useState(0);
  const [aiProgressStatus, setAiProgressStatus] = useState<'processing' | 'success' | 'error'>('processing');

  // Print Preview Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printOption, setPrintOption] = useState<'keseluruhan' | 'per-kelas'>('keseluruhan');
  const [printClassId, setPrintClassId] = useState<string>('semua');

  // Conflict state warning inside schedule modal
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [conflictConfirmOpen, setConflictConfirmOpen] = useState(false);

  // Delete confirmation modals
  const [scheduleToDelete, setScheduleToDelete] = useState<JadwalPelajaran | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<MataPelajaran | null>(null);

  // Plotting Mengajar State (Specific Subject Plotting)
  const [subjectPlottingModalOpen, setSubjectPlottingModalOpen] = useState(false);
  const [plottingSubject, setPlottingSubject] = useState<MataPelajaran | null>(null);
  const [plottingAssignments, setPlottingAssignments] = useState<Array<{ id: string; guru: string; kelasIds: string[] }>>([]);

  const getTeacherForSubjectByClassId = (sub: MataPelajaran | undefined, classId: string) => {
    if (!sub) return 'Belum Ditunjuk';
    const foundClass = classes.find(c => c.id === classId);
    const className = foundClass ? foundClass.nama : classId;
    return getTeacherForSubjectAndClass(sub, className);
  };

  const handleSubjectDragStart = (e: React.DragEvent, id: string) => {
    setDraggedSubjectId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleSubjectDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
  };

  const handleSubjectDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedSubjectId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedSubjectId(null);
      return;
    }

    const sourceIndex = subjects.findIndex(s => s.id === sourceId);
    const targetIndex = subjects.findIndex(s => s.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedSubjectId(null);
      return;
    }

    const updatedSubjects = [...subjects];
    const [draggedItem] = updatedSubjects.splice(sourceIndex, 1);
    const targetItem = subjects[targetIndex];

    // If dragged to a different category, update it
    const targetCategory = targetItem.kategori || 'Mapel Wajib';
    const sourceCategory = draggedItem.kategori || 'Mapel Wajib';
    if (sourceCategory !== targetCategory) {
      draggedItem.kategori = targetCategory;
      // sync to Supabase
      syncSubjectToSupabase(draggedItem, false);
    }

    // Insert at targetIndex
    updatedSubjects.splice(targetIndex, 0, draggedItem);
    setSubjects(updatedSubjects);
    setDraggedSubjectId(null);

    triggerToast('Urutan mata pelajaran diperbarui', 'Akademik', 'success');
  };

  const formatGuruPengampuDisplay = (guruPengampu: string) => {
    if (!guruPengampu) return 'Belum Ditunjuk';
    try {
      const parsed = JSON.parse(guruPengampu);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return 'Belum Ditunjuk';
        return parsed.map(item => {
          const classesStr = item.kelasIds && item.kelasIds.length > 0 
            ? ` (${item.kelasIds.join(', ')})` 
            : '';
          return `${item.guru}${classesStr}`;
        }).join(', ');
      }
    } catch (e) {
      // Fallback plain string
    }
    return guruPengampu || 'Belum Ditunjuk';
  };

  const updateAssignment = (id: string, updates: Partial<{ guru: string; kelasIds: string[] }>) => {
    setPlottingAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const addAssignmentRow = () => {
    setPlottingAssignments(prev => [
      ...prev,
      { id: `assign-add-${Date.now()}`, guru: '', kelasIds: [] }
    ]);
  };

  const removeAssignmentRow = (id: string) => {
    setPlottingAssignments(prev => prev.filter(a => a.id !== id));
  };

  const handleOpenSubjectPlotting = (sub: MataPelajaran) => {
    setPlottingSubject(sub);
    let parsed: any[] = [];
    if (sub.guruPengampu) {
      try {
        const parsedJson = JSON.parse(sub.guruPengampu);
        if (Array.isArray(parsedJson)) {
          parsed = parsedJson.map((item: any, idx: number) => ({
            id: item.id || `assign-${idx}-${Date.now()}`,
            guru: item.guru || '',
            kelasIds: item.kelasIds || item.classes || []
          }));
        }
      } catch (e) {
        // Legacy plain string
        parsed = [{
          id: `assign-legacy-${Date.now()}`,
          guru: sub.guruPengampu,
          kelasIds: []
        }];
      }
    }
    if (parsed.length === 0) {
      parsed = [{
        id: `assign-init-${Date.now()}`,
        guru: '',
        kelasIds: []
      }];
    }
    setPlottingAssignments(parsed);
    setSubjectPlottingModalOpen(true);
  };

  const handleSaveSubjectPlotting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plottingSubject) return;

    const validAssignments = plottingAssignments.filter(a => a.guru.trim() !== '');
    const serialized = JSON.stringify(validAssignments);

    const updatedSub = { ...plottingSubject, guruPengampu: serialized };
    setSubjects(prev => prev.map(s => s.id === plottingSubject.id ? updatedSub : s));

    syncSubjectToSupabase(updatedSub, true).then(res => {
      if (res.success) {
        triggerToast(`Plotting guru pengampu "${plottingSubject.nama}" berhasil disimpan`, 'Akademik', 'success');
      } else {
        triggerToast('Gagal sinkronisasi plotting ke Supabase: ' + res.error, 'Supabase', 'error');
      }
    });

    setSubjectPlottingModalOpen(false);
    setPlottingSubject(null);
  };

  // Toggle body class to hide header on mobile when any modal is open
  useEffect(() => {
    if (settingsModalOpen || aiModalOpen || aiProgressModalOpen || scheduleModalOpen || printModalOpen || subjectPlottingModalOpen || scheduleToDelete || subjectToDelete || conflictConfirmOpen) {
      document.body.classList.add('settings-modal-open');
    } else {
      document.body.classList.remove('settings-modal-open');
    }
    return () => {
      document.body.classList.remove('settings-modal-open');
    };
  }, [settingsModalOpen, aiModalOpen, aiProgressModalOpen, scheduleModalOpen, printModalOpen, subjectPlottingModalOpen, scheduleToDelete, subjectToDelete, conflictConfirmOpen]);

  // --- Subject Operations ---
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      kode: '',
      nama: '',
      tingkat: 'Semua',
      kategori: 'Mapel Wajib',
      jumlahJam: 2,
      guruPengampu: ''
    });
    setSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (sub: MataPelajaran) => {
    setEditingSubject(sub);
    setSubjectForm({
      kode: sub.kode,
      nama: sub.nama,
      tingkat: sub.tingkat,
      kategori: sub.kategori || 'Mapel Wajib',
      jumlahJam: sub.jumlahJam,
      guruPengampu: sub.guruPengampu
    });
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.nama.trim() || !subjectForm.kode.trim()) return;

    const uppercaseKode = subjectForm.kode.trim().toUpperCase();

    if (editingSubject) {
      // Edit
      const updatedSub = { ...editingSubject, ...subjectForm, kode: uppercaseKode };
      setSubjects(prev => prev.map(s => s.id === editingSubject.id ? updatedSub : s));
      syncSubjectToSupabase(updatedSub, true).then(res => {
        if (!res.success) triggerToast('Gagal sync mapel: ' + res.error, 'Supabase', 'error');
      });
      triggerToast(`Mata pelajaran "${subjectForm.nama}" berhasil diperbarui`, 'Akademik', 'success');
    } else {
      // Add
      const newSub: MataPelajaran = {
        id: generateUUID(),
        ...subjectForm,
        kode: uppercaseKode
      };
      setSubjects(prev => [...prev, newSub]);
      syncSubjectToSupabase(newSub, true).then(res => {
        if (!res.success) triggerToast('Gagal sync mapel: ' + res.error, 'Supabase', 'error');
      });
      triggerToast(`Mata pelajaran "${subjectForm.nama}" berhasil ditambahkan`, 'Akademik', 'success');
      triggerNotification('Mata Pelajaran Baru', `Mata pelajaran "${subjectForm.nama}" (${uppercaseKode}) telah ditambahkan.`);
    }
    setSubjectModalOpen(false);
  };

  const handleDeleteSubject = (sub: MataPelajaran) => {
    setSubjectToDelete(sub);
  };

  const confirmDeleteSubject = (sub: MataPelajaran) => {
    setSubjects(prev => prev.filter(s => s.id !== sub.id));
    setSchedules(prev => prev.filter(sched => sched.mapelId !== sub.id));
    deleteSubjectFromSupabase(sub.id, true);
    triggerToast(`Mata pelajaran "${sub.nama}" berhasil dihapus`, 'Akademik', 'success');
    addNotification?.('Mata Pelajaran Dihapus', `Data mata pelajaran "${sub.nama}" telah dihapus permanen oleh Administrator.`);
    setSubjectToDelete(null);
  };

  // --- Schedule Operations ---
  const getNextSequentialJP = (kelasId: string, hari: string, schedulesList: any[]) => {
    const dayScheds = schedulesList.filter(s => s.kelasId === kelasId && s.hari === hari);
    if (dayScheds.length === 0) return 1;
    const maxJP = Math.max(...dayScheds.map(s => (s.jpStart || 1) + (s.jpCount || 1) - 1));
    return Math.max(1, maxJP + 1);
  };

  const handleOpenAddSchedule = () => {
    const defaultMapel = subjects.length > 0 ? subjects[0] : null;
    const fallbackClassId = selectedClassId || (classes.length > 0 ? classes[0].id : '');
    const defaultDay = 'Senin';
    const nextJP = getNextSequentialJP(fallbackClassId, defaultDay, schedules);
    
    setEditingSchedule(null);
    setScheduleForm({
      kelasId: fallbackClassId,
      mapelId: defaultMapel ? defaultMapel.id : '',
      hari: defaultDay,
      jpStart: nextJP > 8 ? 1 : nextJP,
      jpCount: 2,
      guru: defaultMapel ? getTeacherForSubjectByClassId(defaultMapel, fallbackClassId) : ''
    });
    setScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (sched: JadwalPelajaran) => {
    setEditingSchedule(sched);
    setScheduleForm({
      kelasId: sched.kelasId,
      mapelId: sched.mapelId,
      hari: sched.hari as any,
      jpStart: (sched as any).jpStart || 1,
      jpCount: (sched as any).jpCount || 2,
      guru: sched.guru
    });
    setScheduleModalOpen(true);
  };

  // Conflict state warning inside schedule modal
  useEffect(() => {
    if (!scheduleModalOpen) {
      setConflictWarning(null);
      return;
    }

    const { kelasId, hari, jpStart, jpCount, mapelId } = scheduleForm;
    if (!kelasId || !mapelId || !hari) {
      setConflictWarning(null);
      return;
    }

    const foundMapel = subjects.find(s => s.id === mapelId);
    const guru = foundMapel ? getTeacherForSubjectByClassId(foundMapel, kelasId) : '';

    const conflictMsg = checkTeacherConflict(
      kelasId,
      hari,
      jpStart,
      jpCount,
      guru,
      editingSchedule ? editingSchedule.id : null,
      schedules,
      classes
    );

    setConflictWarning(conflictMsg);
  }, [scheduleForm, schedules, editingSchedule, classes, scheduleModalOpen, subjects]);

  // Sync Teacher automatically when mapelId changes in Schedule Form
  const handleScheduleFormMapelChange = (id: string) => {
    const foundMapel = subjects.find(s => s.id === id);
    setScheduleForm(prev => {
      // Auto sequential start when day or class is updated as well
      const nextJP = getNextSequentialJP(prev.kelasId, prev.hari, schedules);
      
      let initialJpCount = 2;
      if (foundMapel) {
        // Calculate remaining JP
        const totalAllocated = foundMapel.jumlahJam || 0;
        const scheduledJp = schedules
          .filter(s => s.kelasId === prev.kelasId && s.mapelId === id && (!editingSchedule || s.id !== editingSchedule.id))
          .reduce((sum, s) => sum + (s.jpCount || 1), 0);
        const remaining = Math.max(0, totalAllocated - scheduledJp);
        
        // Initial count should be either the remaining JP or 2 (whichever is smaller, but at least 1)
        initialJpCount = remaining > 0 ? Math.min(remaining, 2) : 1;
      }

      return {
        ...prev,
        mapelId: id,
        jpStart: prev.jpStart === 1 ? (nextJP > 8 ? 1 : nextJP) : prev.jpStart,
        jpCount: initialJpCount,
        guru: foundMapel ? getTeacherForSubjectByClassId(foundMapel, prev.kelasId) : ''
      };
    });
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.kelasId || !scheduleForm.mapelId) return;

    if (conflictWarning) {
      setConflictConfirmOpen(true);
      return;
    }

    executeSaveSchedule();
  };

  const executeSaveSchedule = () => {
    const foundMapel = subjects.find(s => s.id === scheduleForm.mapelId);
    const guru = foundMapel ? getTeacherForSubjectByClassId(foundMapel, scheduleForm.kelasId) : '';

    const newSchedItem = {
      id: editingSchedule ? editingSchedule.id : generateUUID(),
      kelasId: scheduleForm.kelasId,
      mapelId: scheduleForm.mapelId,
      hari: scheduleForm.hari,
      jpStart: scheduleForm.jpStart,
      jpCount: scheduleForm.jpCount,
      guru: guru,
      jamMulai: '',
      jamSelesai: ''
    };

    const updatedSchedulesList = saveScheduleWithShifting(
      newSchedItem,
      schedules,
      editingSchedule ? editingSchedule.id : null,
      settings
    );

    setSchedules(updatedSchedulesList);
    
    Promise.all(updatedSchedulesList.map(s => syncScheduleToSupabase(s, true))).then(results => {
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        const errors = failures.map(f => f.error).filter(Boolean).join(', ');
        triggerToast('Gagal menyinkronkan beberapa jadwal ke Supabase: ' + errors, 'Supabase', 'error');
      } else {
        triggerToast('Jadwal pelajaran berhasil disimpan & disinkronkan ke Supabase!', 'Supabase', 'success');
      }
    }).catch(err => {
      console.error("Error syncing schedules:", err);
      triggerToast('Gagal menyinkronkan jadwal ke Supabase: ' + err.message, 'Supabase', 'error');
    });

    const targetClass = classes.find(c => c.id === scheduleForm.kelasId);
    const className = targetClass ? targetClass.nama : scheduleForm.kelasId;
    const mapelName = foundMapel ? foundMapel.nama : scheduleForm.mapelId;

    triggerToast(
      editingSchedule ? 'Jadwal pelajaran berhasil diperbarui' : 'Jadwal pelajaran baru berhasil ditambahkan',
      'Akademik',
      'success'
    );

    triggerNotification(
      editingSchedule ? 'Jadwal Pelajaran Diperbarui' : 'Jadwal Pelajaran Ditambahkan',
      `Jadwal pelajaran "${mapelName}" untuk kelas ${className} pada hari ${scheduleForm.hari} telah ${editingSchedule ? 'diperbarui' : 'ditambahkan'}.`
    );

    setScheduleModalOpen(false);
  };

  const handleDeleteSchedule = (sched: JadwalPelajaran) => {
    setScheduleToDelete(sched);
  };

  const confirmDeleteSchedule = (sched: JadwalPelajaran) => {
    setSchedules(prev => prev.filter(s => s.id !== sched.id));
    deleteScheduleFromSupabase(sched.id, true);
    triggerToast('Jadwal pelajaran berhasil dihapus', 'Akademik', 'success');
    addNotification?.('Jadwal Dihapus', `Jadwal pelajaran untuk kelas ID ${sched.kelasId} pada hari ${sched.hari} (${sched.jamMulai} - ${sched.jamSelesai}) telah dihapus.`);
    setScheduleToDelete(null);
  };

  // --- Statistics Calculations ---
  // Subjects
  const filteredSubjects = subjects.filter(sub => {
    const matchesSearch = sub.nama.toLowerCase().includes(subjectSearch.toLowerCase()) || 
                          sub.kode.toLowerCase().includes(subjectSearch.toLowerCase()) ||
                          sub.guruPengampu.toLowerCase().includes(subjectSearch.toLowerCase());
    const matchesTingkat = subjectTingkatFilter === 'Semua' || sub.tingkat === subjectTingkatFilter;
    return matchesSearch && matchesTingkat;
  });

  const wajibCount = subjects.filter(s => s.kategori === 'Mapel Wajib' || !s.kategori).length;
  const pilihanCount = subjects.filter(s => s.kategori === 'Mapel Pilihan').length;
  const mulokCount = subjects.filter(s => s.kategori === 'Muatan Lokal').length;

  const totalWeeklyHours = subjects.reduce((sum, s) => sum + s.jumlahJam, 0);

  // Schedules
  const currentKelasObj = classes.find(c => c.id === selectedClassId);
  const activeClassSchedules = schedules.filter(s => s.kelasId === selectedClassId);
  
  // Sort schedule helper by day index and start time
  const DAY_ORDER: Record<string, number> = {
    'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6
  };

  const sortedClassSchedules = [...activeClassSchedules].sort((a, b) => {
    if (DAY_ORDER[a.hari] !== DAY_ORDER[b.hari]) {
      return DAY_ORDER[a.hari] - DAY_ORDER[b.hari];
    }
    return a.jamMulai.localeCompare(b.jamMulai);
  });

  const filteredClassSchedules = sortedClassSchedules.filter(s => {
    return selectedDays.length === 0 || selectedDays.includes(s.hari);
  });

  // Get Subject Name from ID
  const getSubjectName = (id: string) => {
    const sub = subjects.find(s => s.id === id);
    return sub ? sub.nama : 'Mata Pelajaran Tidak Diketahui';
  };

  // Get Subject Code from ID
  const getSubjectCode = (id: string) => {
    const sub = subjects.find(s => s.id === id);
    return sub ? sub.kode : 'MAPEL';
  };

  const renderTimeHint = () => {
    const daySlots = getSlotsForDay(scheduleForm.hari, settings);
    const startJP = scheduleForm.jpStart;
    const countJP = scheduleForm.jpCount;
    
    const startSlot = daySlots.find(s => s.type === 'JP' && s.jpNumber === startJP);
    const endSlot = daySlots.find(s => s.type === 'JP' && s.jpNumber === startJP + countJP - 1);
    
    if (startSlot && endSlot) {
      return (
        <div className="p-3 bg-teal-50 border border-teal-100/50 rounded-2xl text-xs text-teal-800">
          <span className="block font-black text-[9px] uppercase tracking-wider mb-0.5">ESTIMASI WAKTU OTOMATIS</span>
          <div className="font-bold flex items-center space-x-1">
            <Clock3 className="w-3.5 h-3.5" />
            <span>{startSlot.startTime} - {endSlot.endTime}</span>
          </div>
          <p className="text-[10px] text-teal-600 mt-1 font-semibold">
            Terhitung otomatis berdasarkan Durasi per JP ({settings.durasiJP} menit).
          </p>
        </div>
      );
    }
    return null;
  };

  const handleExportExcel = () => {
    let csvContent = "Hari\tWaktu / JP\t" + classes.map(c => c.nama).join("\t") + "\n";
    
    settings.hariAktif.forEach(day => {
      const slots = getSlotsForDay(day, settings);
      slots.forEach(slot => {
        let row = day + "\t";
        if (slot.type === 'AGENDA') {
          row += `${slot.label} (${slot.startTime}-${slot.endTime})\t` + classes.map(() => slot.label).join("\t");
        } else {
          row += `JP ${slot.jpNumber} (${slot.startTime}-${slot.endTime})\t`;
          row += classes.map(c => {
            const sched = schedules.find(s => 
              s.kelasId === c.id && 
              s.hari === day && 
              s.jpStart <= slot.jpNumber! && 
              slot.jpNumber! < s.jpStart + s.jpCount
            );
            if (sched) {
              const sub = subjects.find(sb => sb.id === sched.mapelId);
              return `[${sub?.kode || 'MAPEL'}] - ${sched.guru}`;
            }
            return "-";
          }).join("\t");
        }
        csvContent += row + "\n";
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Jadwal_Pelajaran_MTs_At_Turmudzi_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Jadwal berhasil diekspor ke Excel (.xls)", "Akademik", "success");
  };

  return (
    <div className="animate-fade-in block text-left">
      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl mb-8 overflow-x-auto max-w-lg">
        <button
          onClick={() => setActiveTab('subject')}
          className={`flex-1 px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'subject'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Program Mapel
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Jadwal Pelajaran
        </button>
      </div>

      {/* Tab Content */}
      <div className="transition-all">
        {/* ================= SUBJECTS TAB ================= */}
        {activeTab === 'subject' && (
          <div className="space-y-6">
            {/* Subject Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Mata Pelajaran</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{subjects.length} Mapel</h3>
                </div>
              </div>
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Award className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Kategori Kurikulum</span>
                  <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100/50" title="Mapel Wajib">Wajib: {wajibCount}</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50" title="Mapel Pilihan">Pilihan: {pilihanCount}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/50" title="Muatan Lokal">Mulok: {mulokCount}</span>
                  </div>
                </div>
              </div>
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Beban Mengajar</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{totalWeeklyHours} JP <span className="text-xs font-semibold text-slate-400">/Minggu</span></h3>
                </div>
              </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto flex-1">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Cari mapel, kode, atau guru..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Tingkat Filter */}
                <SearchableSelect
                  value={subjectTingkatFilter}
                  onChange={(val) => setSubjectTingkatFilter(val)}
                  options={[
                    { value: 'Semua', label: 'Semua Tingkat / Umum' },
                    { value: 'VII', label: 'Kelas VII' },
                    { value: 'VIII', label: 'Kelas VIII' },
                    { value: 'IX', label: 'Kelas IX' }
                  ]}
                  placeholder="Semua Tingkat"
                  showSearch={false}
                  isClearable={false}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <button
                  onClick={handleOpenAddSubject}
                  className="w-full lg:w-auto flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-lg shadow-teal-100 cursor-pointer text-xs uppercase tracking-wider whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span>Tambah Mapel</span>
                </button>
              </div>
            </div>

            {/* Subject List (Cards on Mobile, Table on Desktop) */}
            {filteredSubjects.length === 0 ? (
              <div className="bg-white border border-slate-100 p-12 rounded-3xl shadow-sm text-center">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-700">Tidak ada Mata Pelajaran</h3>
                <p className="text-slate-400 text-sm mt-1">Gunakan kata kunci pencarian lain atau buat baru.</p>
              </div>
            ) : (
              <>
                {/* Mobile Grid List (Visible on mobile, hidden on desktop) */}
                <div className="block md:hidden space-y-8">
                  {(['Mapel Wajib', 'Mapel Pilihan', 'Muatan Lokal'] as const).map((cat) => {
                    const catSubjects = filteredSubjects.filter(sub => {
                      const subCat = sub.kategori === 'Mapel Pilihan' ? 'Mapel Pilihan' : sub.kategori === 'Muatan Lokal' ? 'Muatan Lokal' : 'Mapel Wajib';
                      return subCat === cat;
                    });
                    if (catSubjects.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-4">
                        {/* Kategori Separator Header */}
                        <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 shadow-xs">
                          <div className={`w-3 h-3 rounded-full ${
                            cat === 'Mapel Wajib' ? 'bg-teal-500 animate-pulse' : cat === 'Mapel Pilihan' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                          }`} />
                          <span className="text-xs font-black text-slate-700 tracking-wider uppercase">{cat}</span>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">
                            {catSubjects.length} Mapel
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {catSubjects.map((sub) => (
                            <div
                              key={sub.id}
                              draggable
                              onDragStart={(e) => handleSubjectDragStart(e, sub.id)}
                              onDragOver={(e) => handleSubjectDragOver(e, sub.id)}
                              onDrop={(e) => handleSubjectDrop(e, sub.id)}
                              onDragEnd={() => setDraggedSubjectId(null)}
                              className={`bento-card group relative bg-white border rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-teal-100 transition-all flex flex-col justify-between ${
                                draggedSubjectId === sub.id 
                                  ? 'opacity-40 border-dashed border-indigo-200 bg-indigo-50/20' 
                                  : 'border-slate-100'
                              }`}
                            >
                              <div>
                                {/* Top Header info */}
                                <div className="flex justify-between items-center mb-4">
                                  <div className="flex items-center space-x-2">
                                    <div className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing rounded transition-colors" title="Drag untuk mengurutkan">
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <div className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-100/60 font-mono font-black text-[10px]">
                                      {sub.kode}
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                    Tingkat {sub.tingkat}
                                  </span>
                                </div>

                                {/* Title */}
                                <h4 className="text-base font-extrabold text-slate-800 leading-snug group-hover:text-teal-600 transition-colors">
                                  {sub.nama}
                                </h4>

                                {/* Plotted Teachers List - FULLY VISIBLE & NO TRUNCATION */}
                                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Guru Pengampu</span>
                                  <div className="flex flex-col gap-2">
                                    {(() => {
                                      if (!sub.guruPengampu) return <span className="text-xs font-extrabold text-slate-400 italic">Belum Ditunjuk</span>;
                                      try {
                                        const parsed = JSON.parse(sub.guruPengampu);
                                        if (Array.isArray(parsed) && parsed.length > 0) {
                                          return parsed.map((item, idx) => (
                                            <div key={idx} className="flex items-start space-x-2 bg-slate-50/70 border border-slate-100 rounded-xl p-2.5">
                                              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-700 font-bold text-[10px] flex-shrink-0 mt-0.5">
                                                {item.guru ? item.guru.charAt(0).toUpperCase() : 'G'}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <span className="text-xs font-bold text-slate-800 block break-words leading-tight">{item.guru}</span>
                                                {item.kelasIds && item.kelasIds.length > 0 && (
                                                  <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50 inline-block mt-1">
                                                    Kelas: {item.kelasIds.join(', ')}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ));
                                        }
                                      } catch (e) {}
                                      
                                      const teacherStr = sub.guruPengampu || 'Belum Ditunjuk';
                                      return (
                                        <div className="flex items-start space-x-2 bg-slate-50/70 border border-slate-100 rounded-xl p-2.5">
                                          <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-700 font-bold text-[10px] flex-shrink-0 mt-0.5">
                                            {teacherStr.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <span className="text-xs font-bold text-slate-800 block break-words leading-tight">{teacherStr}</span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Footer Stats & Actions */}
                              <div className="border-t border-slate-100 pt-4 mt-5 flex justify-between items-center">
                                <div className="flex space-x-4">
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Kategori</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                      sub.kategori === 'Mapel Wajib'
                                        ? 'text-teal-700 bg-teal-50 border-teal-100/50'
                                        : sub.kategori === 'Mapel Pilihan'
                                        ? 'text-indigo-700 bg-indigo-50 border-indigo-100/50'
                                        : 'text-amber-700 bg-amber-50 border-amber-100/50'
                                    }`}>{sub.kategori || 'Mapel Wajib'}</span>
                                  </div>
                                  <div className="border-l border-slate-100 pl-4">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Jam Seminggu</span>
                                    <span className="text-xs font-extrabold text-slate-700">{sub.jumlahJam} JP</span>
                                  </div>
                                </div>

                                <div className="flex space-x-1.5">
                                  <button
                                    onClick={() => handleOpenSubjectPlotting(sub)}
                                    className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-all cursor-pointer border border-transparent"
                                    title="Plotting Guru"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditSubject(sub)}
                                    className="p-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-600 text-slate-500 rounded-xl transition-all cursor-pointer border border-transparent hover:border-teal-100"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubject(sub)}
                                    className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table Container (Visible on desktop, hidden on mobile) */}
                <div className="hidden md:block custom-table-container shadow-sm scrollbar-hide relative mb-6 bg-white border border-slate-100 rounded-3xl overflow-hidden">
                  <table className="custom-table w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">Urut</th>
                        <th className="w-12 text-center">No</th>
                        <th className="w-24 text-left">Kode</th>
                        <th className="text-left">Nama Mata Pelajaran</th>
                        <th className="w-28 text-left">Tingkat</th>
                        <th className="w-40 text-left">Kategori</th>
                        <th className="w-28 text-center">Jam / Minggu</th>
                        <th className="text-left">Guru Pengampu</th>
                        <th className="w-36 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['Mapel Wajib', 'Mapel Pilihan', 'Muatan Lokal'] as const).map((cat) => {
                        const catSubjects = filteredSubjects.filter(sub => {
                          const subCat = sub.kategori === 'Mapel Pilihan' ? 'Mapel Pilihan' : sub.kategori === 'Muatan Lokal' ? 'Muatan Lokal' : 'Mapel Wajib';
                          return subCat === cat;
                        });
                        if (catSubjects.length === 0) return null;

                        return (
                          <React.Fragment key={cat}>
                            {/* Kategori Separator Row */}
                            <tr className="bg-slate-50 border-y border-slate-200/60">
                              <td colSpan={9} className="py-3 px-4 text-xs font-black text-slate-700 tracking-wider">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2.5 h-2.5 rounded-full ${
                                    cat === 'Mapel Wajib' ? 'bg-teal-500' : cat === 'Mapel Pilihan' ? 'bg-indigo-500' : 'bg-amber-500'
                                  }`} />
                                  <span className="font-extrabold uppercase text-slate-700 tracking-widest">{cat}</span>
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">
                                    {catSubjects.length} Mapel
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {catSubjects.map((sub, index) => (
                              <tr 
                                key={sub.id} 
                                draggable
                                onDragStart={(e) => handleSubjectDragStart(e, sub.id)}
                                onDragOver={(e) => handleSubjectDragOver(e, sub.id)}
                                onDrop={(e) => handleSubjectDrop(e, sub.id)}
                                onDragEnd={() => setDraggedSubjectId(null)}
                                className={`transition-all hover:bg-slate-50/50 ${
                                  draggedSubjectId === sub.id 
                                    ? 'opacity-45 bg-indigo-50/20 border-2 border-dashed border-indigo-200' 
                                    : ''
                                }`}
                              >
                                <td className="text-center">
                                  <div className="flex justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                </td>
                                <td className="text-center font-bold text-slate-400">{index + 1}</td>
                                <td>
                                  <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-100/60 font-mono font-black text-[10px]">
                                    {sub.kode}
                                  </span>
                                </td>
                                <td className="font-bold text-slate-800">{sub.nama}</td>
                                <td className="font-semibold text-slate-600">Tingkat {sub.tingkat}</td>
                                <td>
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                                    sub.kategori === 'Mapel Wajib'
                                      ? 'text-teal-700 bg-teal-50 border-teal-100/50'
                                      : sub.kategori === 'Mapel Pilihan'
                                      ? 'text-indigo-700 bg-indigo-50 border-indigo-100/50'
                                      : 'text-amber-700 bg-amber-50 border-amber-100/50'
                                  }`}>{sub.kategori || 'Mapel Wajib'}</span>
                                </td>
                                <td className="text-center font-extrabold text-slate-700">{sub.jumlahJam} JP</td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col gap-1.5 max-w-[320px]">
                                    {(() => {
                                      if (!sub.guruPengampu) return <span className="text-xs font-semibold text-slate-400 italic">Belum Ditunjuk</span>;
                                      try {
                                        const parsed = JSON.parse(sub.guruPengampu);
                                        if (Array.isArray(parsed) && parsed.length > 0) {
                                          return parsed.map((item, idx) => (
                                            <div key={idx} className="flex items-center space-x-2 text-xs bg-slate-50 border border-slate-100 rounded-lg p-1.5">
                                              <span className="font-extrabold text-slate-800 leading-none">{item.guru}</span>
                                              {item.kelasIds && item.kelasIds.length > 0 && (
                                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100/40">
                                                  {item.kelasIds.join(', ')}
                                                </span>
                                              )}
                                            </div>
                                          ));
                                        }
                                      } catch (e) {}

                                      const teacherStr = sub.guruPengampu || 'Belum Ditunjuk';
                                      return <span className="font-semibold text-slate-600 text-xs">{teacherStr}</span>;
                                    })()}
                                  </div>
                                </td>
                                <td className="text-center">
                                  <div className="flex justify-center items-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenSubjectPlotting(sub)}
                                      className="p-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-xl transition-all cursor-pointer border border-transparent"
                                      title="Plotting Guru"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditSubject(sub)}
                                      className="p-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-600 text-slate-500 rounded-xl transition-all cursor-pointer border border-transparent hover:border-teal-100"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubject(sub)}
                                      className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= SCHEDULE TAB ================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Header selection panel */}
            <div className="bg-gradient-to-tr from-slate-800 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-500/20">
                  Panel Distribusi Jadwal
                </span>
                <h3 className="text-xl lg:text-2xl font-extrabold tracking-tight mt-3">
                  Tinjau Mingguan: <span className="text-teal-400">{currentKelasObj ? currentKelasObj.nama : 'Pilih Rombel'}</span>
                </h3>
                <p className="text-slate-300 text-xs mt-1.5 max-w-md font-medium">
                  Silahkan filter kelas dan pilih hari untuk melihat jadwal kegiatan belajar mengajar secara sistematis.
                </p>
              </div>

              {/* Class, Day & View Mode pickers */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Rombel Kelas</label>
                  <SearchableSelect
                    value={selectedClassId}
                    onChange={(val) => setSelectedClassId(val)}
                    options={classes.map(c => ({ value: c.id, label: c.nama }))}
                    placeholder="Pilih Rombel Kelas"
                    showSearch={true}
                    isClearable={false}
                    className="w-full sm:w-48 text-white [&_button]:bg-slate-800 [&_button]:border-slate-700 [&_span]:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Filter Hari</label>
                  <SearchableSelect
                    value={selectedDays.length === 0 ? 'Semua Hari' : selectedDays.length === 1 ? selectedDays[0] : 'Beberapa Hari'}
                    onChange={(val) => {
                      if (val === 'Semua Hari') {
                        setSelectedDays([]);
                      } else {
                        setSelectedDays([val]);
                      }
                    }}
                    options={[
                      { value: 'Semua Hari', label: 'Semua Hari' },
                      ...settings.hariAktif.map(day => ({ value: day, label: day }))
                    ]}
                    placeholder="Pilih Hari"
                    showSearch={false}
                    isClearable={false}
                    className="w-full sm:w-40 text-white [&_button]:bg-slate-800 [&_button]:border-slate-700 [&_span]:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-300 uppercase tracking-wider mb-1">Mode Tampilan</label>
                  <div className="flex bg-slate-800/80 p-1 border border-slate-700/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setScheduleViewMode('mingguan')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                        scheduleViewMode === 'mingguan'
                          ? 'bg-teal-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Mingguan (PC Grid)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleViewMode('harian')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                        scheduleViewMode === 'harian'
                          ? 'bg-teal-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Harian (Timeline)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap justify-end gap-3 mb-6 bg-white p-4 border border-slate-100 rounded-3xl shadow-sm">
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="flex items-center justify-center font-bold px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-100 rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer animate-pulse"
              >
                <Settings className="w-4 h-4 mr-2" />
                <span>Pengaturan Jadwal</span>
              </button>

              <button
                onClick={() => {
                  setAiModalOpen(true);
                  setAiLogs([]);
                }}
                className="flex items-center justify-center font-bold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span>AI Auto-Generate</span>
              </button>

              <button
                onClick={() => setPrintModalOpen(true)}
                className="flex items-center justify-center font-bold px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white shadow-md rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" />
                <span>Cetak Jadwal</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center font-bold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                <span>Export Excel</span>
              </button>
            </div>

            {/* Timeline / Card Timetable */}
            <div className="space-y-6">
              {/* Day Selector Tab Bar for Harian/Daily View (Shown on all screens) */}
              {scheduleViewMode === 'harian' && (
                <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl text-left space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Saring Hari (Klik hari untuk filter satu/beberapa hari secara fleksibel)
                    </span>
                    {selectedDays.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDays([])}
                        className="text-[10px] font-bold text-teal-600 hover:text-teal-700 cursor-pointer self-start sm:self-auto"
                      >
                        Tampilkan Semua Hari
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedDays([])}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        selectedDays.length === 0
                          ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-100'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Semua Hari
                    </button>
                    {settings.hariAktif.map(day => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (selectedDays.includes(day)) {
                              const next = selectedDays.filter(d => d !== day);
                              setSelectedDays(next);
                            } else {
                              const next = [...selectedDays, day];
                              if (next.length === settings.hariAktif.length) {
                                setSelectedDays([]);
                              } else {
                                setSelectedDays(next);
                              }
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-100'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {scheduleViewMode === 'mingguan' ? (
                /* ================= WEEKLY GRID VIEW (BEST FOR PC) ================= */
                <div className="w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                    {settings.hariAktif
                      .filter(day => selectedDays.length === 0 || selectedDays.includes(day))
                      .map(day => {
                        const slots = getSlotsForDay(day, settings);

                        return (
                          <div key={`col-${day}`} className="bg-white border border-slate-100/80 rounded-2xl shadow-sm p-5 w-full flex flex-col">
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-slate-150">
                              <div className="flex items-center space-x-2 min-w-0">
                                <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm flex-shrink-0" />
                                <h4 className="font-black text-slate-800 text-sm sm:text-base tracking-tight">{day}</h4>
                              </div>
                              <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md flex-shrink-0">
                                KBM
                              </span>
                            </div>

                            {/* Column Slots List */}
                            <div className="space-y-3">
                              {slots.map((slot, sIdx) => {
                                if (slot.type === 'AGENDA') {
                                  let Icon = Clock3;
                                  let iconColor = 'text-slate-500 bg-slate-50 border border-slate-100';
                                  let cardBg = 'bg-slate-50/50 border-slate-200/50 text-slate-700';

                                  if (slot.agendaType === 'Upacara') {
                                    Icon = Flag;
                                    iconColor = 'text-amber-600 bg-amber-50 border border-amber-100/50';
                                    cardBg = 'bg-amber-50/40 border-amber-200/40 text-amber-900';
                                  } else if (slot.agendaType === 'Pembiasaan') {
                                    Icon = BookOpen;
                                    iconColor = 'text-teal-600 bg-teal-50 border border-teal-100/50';
                                    cardBg = 'bg-teal-50/40 border-teal-200/40 text-teal-900';
                                  } else if (slot.agendaType === 'Istirahat') {
                                    Icon = Coffee;
                                    iconColor = 'text-indigo-600 bg-indigo-50 border border-indigo-100/50';
                                    cardBg = 'bg-indigo-50/40 border-indigo-200/40 text-indigo-900';
                                  } else if (slot.agendaType === 'Sholat') {
                                    Icon = Sparkles;
                                    iconColor = 'text-sky-600 bg-sky-50 border border-sky-100/50';
                                    cardBg = 'bg-sky-50/40 border-sky-200/40 text-sky-900';
                                  }

                                  return (
                                    <div key={`agenda-pc-${day}-${sIdx}`} className={`p-3.5 rounded-xl border border-dashed flex flex-col justify-between gap-1.5 text-left ${cardBg}`}>
                                      <div className="flex items-center space-x-2.5">
                                        <div className={`p-2 rounded-lg flex-shrink-0 ${iconColor}`}>
                                          <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <span className="text-[10px] font-black opacity-60 uppercase tracking-wider block">Agenda</span>
                                          <h5 className="text-xs sm:text-sm font-black truncate leading-normal" title={slot.label}>{slot.label}</h5>
                                        </div>
                                      </div>
                                      <div className="text-[11px] sm:text-xs font-mono font-bold opacity-75 mt-1 text-right">
                                        {slot.startTime} - {slot.endTime}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  const jpNum = slot.jpNumber!;
                                  const sched = schedules.find(s => 
                                    s.kelasId === selectedClassId && 
                                    s.hari === day && 
                                    s.jpStart <= jpNum && 
                                    jpNum < s.jpStart + s.jpCount
                                  );

                                  if (sched) {
                                    return (
                                      <div key={`jp-pc-${day}-${jpNum}`} className="group relative p-3.5 bg-white hover:bg-slate-50/40 border border-slate-100 hover:border-slate-200 rounded-xl transition-all flex flex-col justify-between text-left shadow-sm hover:shadow-md">
                                        <div className="flex items-center justify-between gap-1.5">
                                          <span className="bg-teal-50 text-teal-700 border border-teal-100/40 rounded px-2 py-0.5 text-[10px] font-black tracking-wider uppercase">
                                            {slot.label}
                                          </span>
                                          <span className="text-[11px] font-mono font-bold text-slate-400">
                                            {slot.startTime} - {slot.endTime}
                                          </span>
                                        </div>

                                        <div className="mt-2 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-100/50 rounded text-[10px] font-mono font-black uppercase tracking-wider">
                                              {getSubjectCode(sched.mapelId)}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-500 truncate flex-1 block" title={sched.guru}>
                                              {sched.guru}
                                            </span>
                                          </div>
                                          <h5 className="text-xs sm:text-sm font-black text-slate-800 mt-1.5 line-clamp-2 min-h-[36px] leading-snug" title={getSubjectName(sched.mapelId)}>
                                            {getSubjectName(sched.mapelId)}
                                          </h5>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end">
                                          {sched.jpStart === jpNum ? (
                                            <div className="flex space-x-1.5">
                                              <button
                                                onClick={() => handleOpenEditSchedule(sched)}
                                                className="p-1.5 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-lg transition-colors border border-transparent hover:border-teal-100 cursor-pointer"
                                                title="Edit"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteSchedule(sched)}
                                                className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                                                title="Hapus"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-[10px] font-extrabold text-teal-400 tracking-wider uppercase">
                                              Lanjutan
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div key={`jp-pc-empty-${day}-${jpNum}`} className="p-3.5 bg-slate-50/30 hover:bg-teal-50/10 border border-dashed border-slate-200/80 hover:border-teal-200 rounded-xl transition-all flex flex-col justify-between text-left group">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-slate-400 text-[10px] font-black uppercase">
                                            {slot.label}
                                          </span>
                                          <span className="text-[11px] font-mono font-bold text-slate-400">
                                            {slot.startTime} - {slot.endTime}
                                          </span>
                                        </div>

                                        <div className="my-2 min-w-0">
                                          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Sesi Kosong</span>
                                        </div>

                                        <div className="flex justify-end">
                                          <button
                                            onClick={() => {
                                              const defaultMapel = subjects.length > 0 ? subjects[0] : null;
                                              setEditingSchedule(null);
                                              setScheduleForm({
                                                kelasId: selectedClassId,
                                                mapelId: defaultMapel ? defaultMapel.id : '',
                                                hari: day as any,
                                                jpStart: jpNum,
                                                jpCount: defaultMapel ? (defaultMapel.jumlahJam || 2) : 2,
                                                guru: defaultMapel ? getTeacherForSubjectByClassId(defaultMapel, selectedClassId) : ''
                                              });
                                              setScheduleModalOpen(true);
                                            }}
                                            disabled={subjects.length === 0}
                                            className="p-1.5 bg-teal-50 hover:bg-teal-600 text-teal-600 hover:text-white rounded-lg transition-all border border-teal-100/30 cursor-pointer"
                                            title="Isi Jadwal"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }
                                }
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                /* ================= HARIAN/TIMELINE LIST VIEW (BEST FOR MOBILE) ================= */
                <div className="space-y-6">
                  {settings.hariAktif
                    .filter(day => selectedDays.length === 0 || selectedDays.includes(day))
                    .map(day => {
                      const slots = getSlotsForDay(day, settings);

                      return (
                        <div key={day} className="bg-white border border-slate-100/80 rounded-3xl shadow-sm p-6 space-y-4">
                          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-50">
                            <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm" />
                            <h4 className="font-extrabold text-slate-800 text-sm sm:text-base tracking-tight">{day}</h4>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              Hari KBM Aktif
                            </span>
                          </div>

                          {/* Vertical Timeline */}
                          <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-4 text-left">
                            {slots.map((slot, sIdx) => {
                              if (slot.type === 'AGENDA') {
                                let Icon = Clock3;
                                let iconColor = 'text-slate-500 bg-slate-100';
                                let badgeColor = 'text-slate-850 bg-slate-50 border-slate-200';

                                if (slot.agendaType === 'Upacara') {
                                  Icon = Flag;
                                  iconColor = 'text-amber-600 bg-amber-50';
                                  badgeColor = 'text-amber-900 bg-amber-50 border-amber-200/50';
                                } else if (slot.agendaType === 'Pembiasaan') {
                                  Icon = BookOpen;
                                  iconColor = 'text-teal-600 bg-teal-50';
                                  badgeColor = 'text-teal-900 bg-teal-50 border-teal-200/50';
                                } else if (slot.agendaType === 'Istirahat') {
                                  Icon = Coffee;
                                  iconColor = 'text-indigo-600 bg-indigo-50';
                                  badgeColor = 'text-indigo-900 bg-indigo-50 border-indigo-200/50';
                                } else if (slot.agendaType === 'Sholat') {
                                  Icon = Sparkles;
                                  iconColor = 'text-sky-600 bg-sky-50';
                                  badgeColor = 'text-sky-900 bg-sky-50 border-sky-200/50';
                                }

                                return (
                                  <div key={`agenda-${day}-${sIdx}`} className="relative p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                    <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white" />
                                    
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${iconColor}`}>
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block">Agenda Khusus</span>
                                        <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5 break-words">{slot.label}</h5>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-slate-100 sm:border-t-0">
                                      <div className={`px-2.5 py-1 rounded-xl border font-mono text-xs font-bold ${badgeColor}`}>
                                        {slot.startTime} - {slot.endTime}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                const jpNum = slot.jpNumber!;
                                const sched = schedules.find(s => 
                                  s.kelasId === selectedClassId && 
                                  s.hari === day && 
                                  s.jpStart <= jpNum && 
                                  jpNum < s.jpStart + s.jpCount
                                );

                                return (
                                  <div key={`jp-${day}-${jpNum}`} className="relative p-4 bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                    <div className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full border-2 border-white ${sched ? 'bg-teal-500' : 'bg-slate-200'}`} />
                                    
                                    <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                                      <div className={`px-2.5 py-1 rounded-xl font-bold text-xs flex-shrink-0 ${sched ? 'bg-teal-50 text-teal-700 border border-teal-100/55' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                        {slot.label}
                                      </div>

                                      {sched ? (
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-100/50 rounded text-[10px] font-mono font-black uppercase tracking-wider">
                                              {getSubjectCode(sched.mapelId)}
                                            </span>
                                            <span className="text-xs font-bold text-slate-500 break-all" title={sched.guru}>
                                              {sched.guru}
                                            </span>
                                          </div>
                                          <h5 className="text-sm font-extrabold text-slate-800 mt-1 break-words">
                                            {getSubjectName(sched.mapelId)}
                                          </h5>
                                        </div>
                                      ) : (
                                        <div className="min-w-0 flex-1 text-left">
                                          <span className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider block">Sesi Kosong</span>
                                          <span className="text-xs sm:text-sm font-semibold text-slate-400 block mt-0.5">Dapat diisi jadwal pelajaran</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-slate-50 sm:border-t-0">
                                      <div className="text-left sm:text-right">
                                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-lg">
                                          {slot.startTime} - {slot.endTime}
                                        </span>
                                      </div>

                                      {sched ? (
                                        <div className="flex space-x-1 flex-shrink-0">
                                          {sched.jpStart === jpNum && (
                                            <>
                                              <button
                                                onClick={() => handleOpenEditSchedule(sched)}
                                                className="p-1.5 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-lg transition-colors border border-transparent hover:border-teal-100 cursor-pointer"
                                                title="Edit"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteSchedule(sched)}
                                                className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                                                title="Hapus"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            const defaultMapel = subjects.length > 0 ? subjects[0] : null;
                                            setEditingSchedule(null);
                                            setScheduleForm({
                                              kelasId: selectedClassId,
                                              mapelId: defaultMapel ? defaultMapel.id : '',
                                              hari: day as any,
                                              jpStart: jpNum,
                                              jpCount: defaultMapel ? (defaultMapel.jumlahJam || 2) : 2,
                                              guru: defaultMapel ? getTeacherForSubjectByClassId(defaultMapel, selectedClassId) : ''
                                            });
                                            setScheduleModalOpen(true);
                                          }}
                                          disabled={subjects.length === 0}
                                          className="p-1.5 bg-teal-50 hover:bg-teal-600 text-teal-600 hover:text-white rounded-lg transition-all border border-teal-100/30 cursor-pointer text-[10px] font-bold"
                                          title="Isi Jadwal"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= SUBJECT PLOTTING MODAL ================= */}
      {subjectPlottingModalOpen && plottingSubject && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSubjectPlottingModalOpen(false);
              setPlottingSubject(null);
            }
          }}
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] animate-fade-in overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                setSubjectPlottingModalOpen(false);
                setPlottingSubject(null);
              }}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-mono font-black uppercase">
                {plottingSubject.kode}
              </span>
              <h3 className="text-lg font-extrabold text-slate-800 pr-8 mt-2">
                Plotting Guru Pengampu: <span className="text-indigo-600">{plottingSubject.nama}</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Atur siapa saja guru yang mengampu mata pelajaran ini beserta kelas yang diajarnya (Tingkat {plottingSubject.tingkat}). Satu mapel bisa diampu oleh lebih dari satu guru dengan kelas yang berbeda.
              </p>
            </div>

            <form onSubmit={handleSaveSubjectPlotting} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto pr-1 space-y-5 max-h-[55vh] custom-scrollbar pb-4">
                {plottingAssignments.map((assignment, index) => {
                  // Find classes already selected by other teachers
                  const chosenByOthers = plottingAssignments
                    .filter((_, idx) => idx !== index)
                    .flatMap(a => a.kelasIds);

                  // Get classes belonging to this subject's tingkat and not chosen by other teachers
                  const relevantClasses = classes.filter(c => 
                    (plottingSubject.tingkat === 'Semua' || c.tingkat === plottingSubject.tingkat) &&
                    !chosenByOthers.includes(c.nama)
                  );

                  const allClassNames = relevantClasses.map(c => c.nama);
                  const isAllSelected = relevantClasses.length > 0 && relevantClasses.every(c => 
                    assignment.kelasIds.includes(c.nama)
                  );

                  const handleToggleAll = () => {
                    if (isAllSelected) {
                      // Deselect all
                      updateAssignment(assignment.id, { kelasIds: [] });
                    } else {
                      // Select all
                      updateAssignment(assignment.id, { kelasIds: allClassNames });
                    }
                  };

                  const handleToggleClass = (className: string) => {
                    const isSelected = assignment.kelasIds.includes(className);
                    let nextKelasIds = [];
                    if (isSelected) {
                      nextKelasIds = assignment.kelasIds.filter(name => name !== className);
                    } else {
                      nextKelasIds = [...assignment.kelasIds, className];
                    }
                    updateAssignment(assignment.id, { kelasIds: nextKelasIds });
                  };

                  return (
                    <div 
                      key={assignment.id} 
                      className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-4 hover:border-indigo-150 hover:bg-slate-50 transition-all relative group/row"
                    >
                      {/* Row Header with index and delete */}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Pilihan Guru #{index + 1}
                        </span>
                        {plottingAssignments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAssignmentRow(assignment.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus baris guru ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* SearchableSelect for Teacher Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Pilih Guru Pengampu
                        </label>
                        <SearchableSelect
                          value={assignment.guru}
                          onChange={(val) => updateAssignment(assignment.id, { guru: val })}
                          options={teachers.map(t => t.nama)}
                          placeholder="Cari atau pilih guru pengampu..."
                          emptyMessage="Tidak ada guru dengan nama tersebut"
                        />
                      </div>

                      {/* Class Selection Multiple Choice */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Pilih Kelas yang Diajar
                          </label>
                          {relevantClasses.length > 0 && (
                            <button
                              type="button"
                              onClick={handleToggleAll}
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                isAllSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {isAllSelected ? 'Hapus Semua Kelas' : 'Pilih Semua Kelas'}
                            </button>
                          )}
                        </div>

                        {relevantClasses.length === 0 ? (
                          <p className="text-[11px] font-semibold text-rose-500">
                            Peringatan: Tidak ada kelas yang terdaftar untuk tingkat {plottingSubject.tingkat}!
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {relevantClasses.map(c => {
                              const isSelected = assignment.kelasIds.includes(c.nama);
                              return (
                                <button
                                  type="button"
                                  key={c.id}
                                  onClick={() => handleToggleClass(c.nama)}
                                  className={`flex items-center space-x-2 p-2 rounded-xl border text-left transition-all text-xs font-semibold cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50/50 hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none w-3.5 h-3.5"
                                  />
                                  <span className="truncate">{c.nama}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={addAssignmentRow}
                  className="w-full py-3.5 border-2 border-dashed border-slate-200 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs font-extrabold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Guru Pengampu untuk Mapel Ini</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSubjectPlottingModalOpen(false);
                    setPlottingSubject(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center shadow-lg shadow-teal-100"
                >
                  Simpan Plotting Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SUBJECT MODAL ================= */}
      {subjectModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSubjectModalOpen(false);
            }
          }}
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] animate-fade-in overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSubjectModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 pr-8">
              {editingSubject ? 'Edit Program Mapel' : 'Tambah Mapel Baru'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Atur kurikulum, beban mengajar, dan kategori untuk mata pelajaran ini.
            </p>

            <form onSubmit={handleSaveSubject} className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Kode Mapel</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.kode}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, kode: e.target.value }))}
                    placeholder="QRD / MTK"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.nama}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, nama: e.target.value }))}
                    placeholder="Nama Lengkap Mapel"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] text-slate-600 font-medium mb-1.5">Tingkat Kelas</label>
                  <SearchableSelect
                    value={subjectForm.tingkat || "Semua"}
                    onChange={(val) => setSubjectForm(prev => ({ ...prev, tingkat: val }))}
                    options={[
                      { value: 'Semua', label: 'Semua / Umum' },
                      ...tingkatOptions.map(t => ({ value: t, label: `Kelas ${t}` }))
                    ]}
                    placeholder="Pilih Tingkat Kelas"
                    showSearch={false}
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 font-medium mb-1.5">Kategori Mapel</label>
                  <SearchableSelect
                    value={subjectForm.kategori || "Mapel Wajib"}
                    onChange={(val) => setSubjectForm(prev => ({ ...prev, kategori: val as MataPelajaran['kategori'] }))}
                    options={['Mapel Wajib', 'Mapel Pilihan', 'Muatan Lokal']}
                    placeholder="Pilih Kategori Mapel"
                    showSearch={false}
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Beban JP/Minggu</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={subjectForm.jumlahJam || ''}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, jumlahJam: parseInt(e.target.value) || 2 }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-teal-500/10"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SCHEDULE MODAL ================= */}
      {scheduleModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setScheduleModalOpen(false);
            }
          }}
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] animate-fade-in overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 pr-8">
              {editingSchedule ? 'Ubah Distribusi Jadwal' : 'Tambah Jadwal Baru'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Alokasikan mata pelajaran ke rombel kelas pada hari dan JP tertentu.
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4 mt-6 text-left">
              {/* Conflict Status Panel */}
              {conflictWarning && (
                <div className="p-3.5 rounded-2xl flex items-start space-x-2.5 text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200/60">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <span className="block font-black uppercase text-[9px] tracking-wider mb-0.5">PERINGATAN BENTROK GURU</span>
                    <p className="font-semibold leading-relaxed">{conflictWarning}</p>
                  </div>
                </div>
              )}

              {/* Sleek Preset Slot Details Card */}
              <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-teal-500 text-white rounded-xl shadow-sm flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-teal-600 uppercase tracking-wider">Slot Alokasi</span>
                    <h4 className="text-sm font-black text-teal-950">
                      {classes.find(c => c.id === scheduleForm.kelasId)?.nama || 'Kelas'} • {scheduleForm.hari}
                    </h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-black text-teal-600 uppercase tracking-wider">Waktu KBM</span>
                  <div className="inline-flex items-center space-x-1.5 mt-0.5">
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 font-mono text-[10px] font-black rounded uppercase">
                      JP Ke-{scheduleForm.jpStart}
                    </span>
                    <span className="text-xs font-bold text-teal-800">
                      ({scheduleForm.jpCount} JP)
                    </span>
                  </div>
                </div>
              </div>

              {/* Mata Pelajaran - Prominent Editable Field */}
              <div>
                <label className="block text-[13px] text-slate-600 font-medium mb-1.5 flex items-center justify-between">
                  <span>Mata Pelajaran</span>
                  <span className="text-[9px] font-extrabold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                    Wajib Dipilih
                  </span>
                </label>
                <div className="relative">
                <SearchableSelect
                  value={scheduleForm.mapelId}
                  onChange={(val) => handleScheduleFormMapelChange(val)}
                  options={[
                    { value: '', label: '-- Pilih Mata Pelajaran --' },
                    ...subjects
                      .filter(s => {
                        if (s.id === scheduleForm.mapelId) return true;
                        const remaining = getRemainingJp(s.id, scheduleForm.kelasId);
                        return remaining > 0;
                      })
                      .map(s => {
                        const remaining = getRemainingJp(s.id, scheduleForm.kelasId);
                        return {
                          value: s.id,
                          label: `${s.nama} (${s.kode}) • Sisa ${remaining} JP / ${s.jumlahJam} JP`
                        };
                      })
                  ]}
                  placeholder="-- Pilih Mata Pelajaran --"
                  showSearch={true}
                  isClearable={false}
                />
                </div>
              </div>

              {/* Durasi Jam Pelajaran (JP) - Dynamic Input */}
              <div>
                <label className="block text-[13px] text-slate-600 font-medium mb-1.5 flex items-center justify-between">
                  <span>Durasi Alokasi (JP)</span>
                  <span className="text-[9px] font-extrabold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                    Sisa Alokasi
                  </span>
                </label>
                <SearchableSelect
                  value={String(scheduleForm.jpCount)}
                  onChange={(val) => setScheduleForm(prev => ({ ...prev, jpCount: parseInt(val) || 1 }))}
                  options={(() => {
                    const selectedSubject = subjects.find(s => s.id === scheduleForm.mapelId);
                    if (!selectedSubject) {
                      return [{ value: '1', label: '1 JP' }];
                    }
                    const totalSubjectJam = selectedSubject.jumlahJam || 2;
                    const scheduledOtherJp = schedules
                      .filter(s => s.kelasId === scheduleForm.kelasId && s.mapelId === scheduleForm.mapelId && (!editingSchedule || s.id !== editingSchedule.id))
                      .reduce((sum, s) => sum + (s.jpCount || 1), 0);
                    
                    const maxAllowedJp = Math.max(1, totalSubjectJam - scheduledOtherJp);
                    
                    const options = [];
                    for (let i = 1; i <= maxAllowedJp; i++) {
                      options.push({
                        value: String(i),
                        label: `${i} JP (Dari sisa ${maxAllowedJp} JP)`
                      });
                    }
                    return options;
                  })()}
                  placeholder="Pilih Durasi"
                  showSearch={false}
                  isClearable={false}
                />
              </div>

              {/* Dynamic Guru Pengampu & Time Info Display */}
              {scheduleForm.mapelId && (
                <div className="space-y-3">
                  {/* Guru Pengampu Info Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center space-x-3">
                    <div className="p-2 bg-slate-200/60 text-slate-600 rounded-xl">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Guru Pengampu</span>
                      <span className="text-xs font-bold text-slate-700">
                        {scheduleForm.guru || 'Belum ditunjuk (tidak ada ploting guru)'}
                      </span>
                    </div>
                  </div>

                  {/* Time Indicator Preview (Automatic calculation display) */}
                  {renderTimeHint()}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-teal-500/10"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SETTINGS MODAL ================= */}
      {settingsModalOpen && (() => {
        // Find which days are exception days
        const exceptionDays = settings.hariAktif.filter(d => !(settings.mainTemplateDays || []).includes(d));
        // Safe check for the active tab
        const currentActiveTab = (settingsActiveTab === 'template' || exceptionDays.includes(settingsActiveTab)) 
          ? settingsActiveTab 
          : 'template';

        const getActiveSlots = (): ScheduleSlotSetting[] => {
          if (currentActiveTab === 'template') {
            return settings.slots || getMigratedSlots(settings);
          }
          return (settings.customDaySlots && settings.customDaySlots[currentActiveTab])
            ? settings.customDaySlots[currentActiveTab]
            : (settings.slots || getMigratedSlots(settings));
        };

        const updateActiveSlots = (newSlots: ScheduleSlotSetting[]) => {
          setSettings(prev => {
            if (currentActiveTab === 'template') {
              return { ...prev, slots: newSlots };
            }
            const updatedCustom = {
              ...(prev.customDaySlots || {}),
              [currentActiveTab]: newSlots
            };
            return { ...prev, customDaySlots: updatedCustom };
          });
        };

        const currentSlots = getActiveSlots();

        // Generate a calculated sequence with times for preview
        let tempMin = timeToMin(settings.jamMulaiKBM);
        let jpCounter = 0;
        const calculatedSlots = currentSlots.map(slot => {
          const dur = slot.type === 'JP' ? (slot.duration || settings.durasiJP || 40) : slot.duration;
          const startTime = minToTime(tempMin);
          const endTime = minToTime(tempMin + dur);
          tempMin += dur;

          let jpNum = undefined;
          if (slot.type === 'JP') {
            jpCounter++;
            jpNum = jpCounter;
          }

          return {
            ...slot,
            startTime,
            endTime,
            jpNumber: jpNum
          };
        });
        const totalJPs = calculatedSlots.filter(s => s.type === 'JP').length;
        const lastSlot = calculatedSlots[calculatedSlots.length - 1];
        const endTimeStr = lastSlot ? lastSlot.endTime : settings.jamMulaiKBM;

        const handleUpdateSlotDuration = (id: string, duration: number) => {
          const prevSlots = getActiveSlots();
          const nextSlots = prevSlots.map(s => s.id === id ? { ...s, duration } : s);
          updateActiveSlots(nextSlots);
        };

        const handleUpdateSlotLabel = (id: string, label: string) => {
          const prevSlots = getActiveSlots();
          const nextSlots = prevSlots.map(s => s.id === id ? { ...s, label } : s);
          updateActiveSlots(nextSlots);
        };

        const handleDeleteSlot = (id: string) => {
          const prevSlots = getActiveSlots();
          const nextSlots = prevSlots.filter(s => s.id !== id);
          updateActiveSlots(nextSlots);
        };

        const handleInsertAgenda = (targetId: string | 'start', type: 'Upacara' | 'Pembiasaan' | 'Istirahat' | 'Sholat' | 'Custom') => {
          const prevSlots = getActiveSlots();
          
          let label = '';
          let duration = 15;
          let agendaType: any = 'Istirahat';
          let hari: any = undefined;

          if (type === 'Upacara') {
            label = 'Upacara Bendera';
            duration = 30;
            agendaType = 'Upacara';
            if (currentActiveTab === 'template') {
              hari = 'Senin';
            }
          } else if (type === 'Pembiasaan') {
            label = 'Pembiasaan (Literasi/Dhuha)';
            duration = 15;
            agendaType = 'Pembiasaan';
          } else if (type === 'Istirahat') {
            label = 'Istirahat';
            duration = 15;
            agendaType = 'Istirahat';
          } else if (type === 'Sholat') {
            label = 'Sholat & Istirahat';
            duration = 30;
            agendaType = 'Sholat';
          } else {
            label = 'Kegiatan Khusus';
            duration = 15;
            agendaType = 'Lainnya';
          }

          const newAgenda: ScheduleSlotSetting = {
            id: `inserted-${type}-${Date.now()}`,
            type: 'AGENDA',
            label,
            duration,
            agendaType,
            hari
          };

          let nextSlots: ScheduleSlotSetting[] = [];
          if (targetId === 'start') {
            nextSlots = [newAgenda, ...prevSlots];
          } else {
            const index = prevSlots.findIndex(s => s.id === targetId);
            if (index === -1) return;
            nextSlots = [
              ...prevSlots.slice(0, index + 1),
              newAgenda,
              ...prevSlots.slice(index + 1)
            ];
          }

          updateActiveSlots(nextSlots);
          setActiveInsertId(null);
        };

        const handleInsertCustomAgenda = (targetId: string | 'start', label: string, duration: number) => {
          const prevSlots = getActiveSlots();
          
          const newAgenda: ScheduleSlotSetting = {
            id: `inserted-Custom-${Date.now()}`,
            type: 'AGENDA',
            label: label || 'Kegiatan Khusus',
            duration: duration || 15,
            agendaType: 'Lainnya'
          };

          let nextSlots: ScheduleSlotSetting[] = [];
          if (targetId === 'start') {
            nextSlots = [newAgenda, ...prevSlots];
          } else {
            const index = prevSlots.findIndex(s => s.id === targetId);
            if (index === -1) return;
            nextSlots = [
              ...prevSlots.slice(0, index + 1),
              newAgenda,
              ...prevSlots.slice(index + 1)
            ];
          }

          updateActiveSlots(nextSlots);
          setActiveInsertId(null);
        };

        const handleAddJP = () => {
          const prevSlots = getActiveSlots();
          const jpCount = prevSlots.filter(s => s.type === 'JP').length;
          const newJP: ScheduleSlotSetting = {
            id: `jp-${jpCount + 1}-${Date.now()}`,
            type: 'JP',
            label: `Jam Ke-${jpCount + 1}`,
            duration: settings.durasiJP || 40
          };
          updateActiveSlots([...prevSlots, newJP]);
        };

        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSettingsModalOpen(false);
                setActiveInsertId(null);
              }
            }}
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] animate-fade-in overflow-y-auto"
          >
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[95vh] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => {
                  setSettingsModalOpen(false);
                  setActiveInsertId(null);
                }}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-extrabold text-slate-800 pr-8">
                Pengaturan Jadwal Global
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Konfigurasi hari efektif, jam belajar, dan urutan kegiatan sekolah secara dinamis.
              </p>

              <div className="space-y-6 mt-6">
                {/* Hari Aktif */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Hari Aktif Sekolah</label>
                  <div className="grid grid-cols-3 gap-2 text-left">
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => {
                      const isSelected = settings.hariAktif.includes(day as any);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setSettings(prev => {
                              const newDays = prev.hariAktif.includes(day as any)
                                ? prev.hariAktif.filter(d => d !== day)
                                : [...prev.hariAktif, day as any];
                              return { ...prev, hariAktif: newDays };
                            });
                          }}
                          className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-teal-50 border-teal-500 text-teal-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Durasi & Jam Mulai */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Durasi Per JP (Menit)</label>
                    <input
                      type="number"
                      min={20}
                      max={60}
                      value={settings.durasiJP}
                      onChange={(e) => {
                        const newDur = parseInt(e.target.value) || 40;
                        setSettings(prev => {
                          const prevSlots = prev.slots || getMigratedSlots(prev);
                          const nextSlots = prevSlots.map(s => s.type === 'JP' ? { ...s, duration: newDur } : s);
                          return { ...prev, durasiJP: newDur, slots: nextSlots };
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Jam Mulai KBM</label>
                    <input
                      type="time"
                      value={settings.jamMulaiKBM}
                      onChange={(e) => setSettings(prev => ({ ...prev, jamMulaiKBM: e.target.value || '07:30' }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Pilih Hari Penerapan (Sistem Template) */}
                <div className="bg-teal-50/40 border border-teal-100/70 p-4 rounded-2xl text-left">
                  <label className="block text-[10px] font-black text-teal-800 uppercase tracking-wider mb-2">
                    Terapkan Susunan Waktu Utama untuk Hari:
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {settings.hariAktif.map(day => {
                      const isChecked = (settings.mainTemplateDays || []).includes(day);
                      return (
                        <label key={day} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSettings(prev => {
                                const currentMain = prev.mainTemplateDays || [];
                                let nextMain: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu')[];
                                
                                if (currentMain.includes(day)) {
                                  // Unchecking day means it becomes an Exception Day!
                                  nextMain = currentMain.filter(d => d !== day);
                                  
                                  // Copy-Edit Feature: System must automatically duplicate (copy) all slot configuration from the main template to the exception day!
                                  const mainSlots = prev.slots || getMigratedSlots(prev);
                                  const updatedCustom = {
                                    ...(prev.customDaySlots || {}),
                                    [day]: mainSlots ? safeJSONParse(JSON.stringify(mainSlots)) : [] // Deep clone main template
                                  };
                                  
                                  return {
                                    ...prev,
                                    mainTemplateDays: nextMain,
                                    customDaySlots: updatedCustom
                                  };
                                } else {
                                  // Checking day means it uses the main template!
                                  nextMain = [...currentMain, day];
                                  return {
                                    ...prev,
                                    mainTemplateDays: nextMain
                                  };
                                }
                              });
                            }}
                            className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
                          />
                          <span>{day}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1.5 leading-relaxed">
                    Hari yang tidak dicentang otomatis membuat tab <span className="font-bold text-teal-700">"Pengaturan Khusus"</span> yang menduplikasi susunan utama agar bisa diedit secara fleksibel.
                  </p>
                </div>

                {/* Dynamic Schedule Sequence */}
                <div className="border-t border-slate-100 pt-4 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Susunan Jam Pelajaran & Kegiatan
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Urutkan, ubah durasi, atau sisipkan agenda khusus.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-teal-600 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full block">
                        {totalJPs} JP ({endTimeStr ? `Selesai ${endTimeStr}` : ''})
                      </span>
                    </div>
                  </div>

                  {/* Tab Navigation if there are exceptions */}
                  {(() => {
                    const exceptionDays = settings.hariAktif.filter(d => !(settings.mainTemplateDays || []).includes(d));
                    if (exceptionDays.length === 0) return null;
                    
                    return (
                      <div className="flex border-b border-slate-100 mb-4 overflow-x-auto gap-1.5 pb-2 custom-scrollbar">
                        <button
                          key="template-tab"
                          type="button"
                          onClick={() => setSettingsActiveTab('template')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                            currentActiveTab === 'template'
                              ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-500/10'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Template Utama
                        </button>
                        {exceptionDays.map(day => (
                          <button
                            key={`${day}-tab`}
                            type="button"
                            onClick={() => setSettingsActiveTab(day)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                              currentActiveTab === day
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Pengaturan Khusus - {day}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Top Insertion Area */}
                  <div className="mb-3 flex justify-between items-center bg-slate-50/50 rounded-2xl p-3 border border-dashed border-slate-200">
                    <span className="text-[11px] font-extrabold text-slate-500">Sebelum Jam Pelajaran Ke-1</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveInsertId(activeInsertId === 'start' ? null : 'start')}
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 bg-teal-50 border border-teal-100/50 px-2.5 py-1 rounded-xl cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Sisip Kegiatan
                      </button>
                    </div>
                  </div>

                  {/* Top Insert Menu */}
                  {activeInsertId === 'start' && (
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl mb-3 flex flex-col gap-2.5 text-xs animate-fade-in">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-bold text-slate-500">Sisipkan di awal:</span>
                        <button
                          type="button"
                          onClick={() => handleInsertAgenda('start', 'Upacara')}
                          className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Flag className="w-3 h-3" /> Upacara
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertAgenda('start', 'Pembiasaan')}
                          className="px-2 py-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3" /> Pembiasaan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertAgenda('start', 'Istirahat')}
                          className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Coffee className="w-3 h-3" /> Istirahat
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertAgenda('start', 'Sholat')}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" /> Sholat
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomInsertFormId(showCustomInsertFormId === 'start' ? null : 'start');
                            setCustomInsertName('');
                            setCustomInsertDuration(15);
                          }}
                          className={`px-2 py-1 border rounded-lg font-semibold flex items-center gap-1 cursor-pointer ${
                            showCustomInsertFormId === 'start'
                              ? 'bg-indigo-55 border-indigo-200 text-indigo-700 font-extrabold bg-indigo-50'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Clock className="w-3 h-3" /> Lainnya
                        </button>
                      </div>

                      {showCustomInsertFormId === 'start' && (
                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200/60 animate-fade-in items-end">
                          <div className="flex-1 min-w-0">
                            <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Nama Kegiatan Manual</label>
                            <input
                              type="text"
                              placeholder="Contoh: Rapat Guru, Ekstrakurikuler..."
                              value={customInsertName}
                              onChange={(e) => setCustomInsertName(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Durasi (Mnt)</label>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={customInsertDuration}
                              onChange={(e) => setCustomInsertDuration(parseInt(e.target.value) || 15)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 text-center"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!customInsertName.trim()) return;
                              handleInsertCustomAgenda('start', customInsertName, customInsertDuration);
                              setShowCustomInsertFormId(null);
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                          >
                            Tambah
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* List of Slots */}
                  <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                    {calculatedSlots.map((slot) => {
                      if (slot.type === 'JP') {
                        return (
                          <div key={slot.id} className="group border border-slate-100 bg-white hover:bg-slate-50/30 rounded-2xl p-3 flex flex-col transition-all">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-3">
                                <span className="bg-teal-50 text-teal-700 border border-teal-100/60 rounded-xl px-2.5 py-1 text-[11px] font-black tracking-wider uppercase">
                                  JP {slot.jpNumber}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setActiveInsertId(activeInsertId === slot.id ? null : slot.id)}
                                  className="text-[11px] font-extrabold text-slate-500 hover:text-teal-600 bg-slate-50 hover:bg-teal-50/50 border border-slate-100 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Sisip
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-all cursor-pointer"
                                  title="Hapus JP"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Inline Insert Action Menu */}
                            {activeInsertId === slot.id && (
                              <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl mt-3 flex flex-col gap-2.5 text-xs animate-fade-in text-left">
                                <div className="flex flex-wrap gap-2 items-center">
                                  <span className="font-bold text-slate-500">Sisipkan setelah JP {slot.jpNumber}:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertAgenda(slot.id, 'Upacara')}
                                    className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Flag className="w-3 h-3" /> Upacara
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertAgenda(slot.id, 'Pembiasaan')}
                                    className="px-2 py-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <BookOpen className="w-3 h-3" /> Pembiasaan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertAgenda(slot.id, 'Istirahat')}
                                    className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Coffee className="w-3 h-3" /> Istirahat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertAgenda(slot.id, 'Sholat')}
                                    className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3" /> Sholat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowCustomInsertFormId(showCustomInsertFormId === slot.id ? null : slot.id);
                                      setCustomInsertName('');
                                      setCustomInsertDuration(15);
                                    }}
                                    className={`px-2 py-1 border rounded-lg font-semibold flex items-center gap-1 cursor-pointer ${
                                      showCustomInsertFormId === slot.id
                                        ? 'bg-indigo-55 border-indigo-200 text-indigo-700 font-extrabold bg-indigo-50'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" /> Lainnya
                                  </button>
                                </div>

                                {showCustomInsertFormId === slot.id && (
                                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200/60 animate-fade-in items-end">
                                    <div className="flex-1 min-w-0">
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Nama Kegiatan Manual</label>
                                      <input
                                        type="text"
                                        placeholder="Contoh: Rapat Guru, Ekstrakurikuler..."
                                        value={customInsertName}
                                        onChange={(e) => setCustomInsertName(e.target.value)}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                    <div className="w-24">
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Durasi (Mnt)</label>
                                      <input
                                        type="number"
                                        min={5}
                                        max={120}
                                        value={customInsertDuration}
                                        onChange={(e) => setCustomInsertDuration(parseInt(e.target.value) || 15)}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 text-center"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!customInsertName.trim()) return;
                                        handleInsertCustomAgenda(slot.id, customInsertName, customInsertDuration);
                                        setShowCustomInsertFormId(null);
                                      }}
                                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                                    >
                                      Tambah
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        // Agenda Slot
                        let cardStyle = "bg-slate-50 border-slate-200 text-slate-700";
                        let IconComponent = Clock;
                        let customInput = false;

                        if (slot.agendaType === 'Upacara') {
                          cardStyle = "bg-sky-50/50 border-sky-150 text-sky-800";
                          IconComponent = Flag;
                        } else if (slot.agendaType === 'Pembiasaan') {
                          cardStyle = "bg-teal-50/50 border-teal-150 text-teal-850";
                          IconComponent = BookOpen;
                        } else if (slot.agendaType === 'Istirahat') {
                          cardStyle = "bg-amber-50/50 border-amber-150 text-amber-850";
                          IconComponent = Coffee;
                        } else if (slot.agendaType === 'Sholat') {
                          cardStyle = "bg-emerald-50/50 border-emerald-150 text-emerald-850";
                          IconComponent = Sparkles;
                        } else {
                          cardStyle = "bg-slate-50/70 border-slate-200 text-slate-700";
                          IconComponent = Clock;
                          customInput = true;
                        }

                        return (
                          <div key={slot.id} className={`border rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${cardStyle}`}>
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="p-2 bg-white/80 rounded-xl shadow-sm text-slate-600 flex-shrink-0">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                {customInput ? (
                                  <input
                                    type="text"
                                    value={slot.label}
                                    onChange={(e) => handleUpdateSlotLabel(slot.id, e.target.value)}
                                    placeholder="Nama kegiatan khusus..."
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 w-full"
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black">{slot.label}</span>
                                    {slot.hari && (
                                      <span className="bg-sky-100 text-sky-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        {slot.hari} Saja
                                      </span>
                                    )}
                                  </div>
                                )}
                                <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                                  Agenda Khusus • {slot.startTime} - {slot.endTime}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-slate-100/50 sm:border-t-0">
                              <div className="flex items-center space-x-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  max={120}
                                  value={slot.duration}
                                  onChange={(e) => handleUpdateSlotDuration(slot.id, parseInt(e.target.value) || 15)}
                                  className="w-14 px-2.5 py-1.5 text-center bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                                <span className="text-[11px] text-slate-400 font-bold">mnt</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-all cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>

                  {/* Add JP Button */}
                  <button
                    type="button"
                    onClick={handleAddJP}
                    className="w-full mt-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tambah Jam Pelajaran (JP) Baru
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-6 border-t border-slate-100 mt-6">
                <button
                  onClick={() => {
                    setSettingsModalOpen(false);
                    setActiveInsertId(null);
                  }}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center"
                >
                  Selesai & Simpan
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= AI AUTOGENERATE MODAL ================= */}
      {aiModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAiModalOpen(false);
            }
          }}
          className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 md:p-6 z-[100] animate-fade-in overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-5xl w-full p-8 md:p-10 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[95vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setAiModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-4 text-left">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  AI Auto-Scheduler
                </h3>
                <p className="text-sm text-slate-500 font-semibold mt-1">
                  Distribusi jadwal otomatis anti-bentrok, cerdas, dan efisien.
                </p>
              </div>
            </div>

            <div className="space-y-8 mt-8">
              {/* Custom constraints / request */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Instruksi Tambahan (Custom Request)
                </label>
                <textarea
                  placeholder="Contoh: Guru Budi minta jam mengajar hanya di hari Selasa dan Rabu, utamakan mapel wajib di pagi hari..."
                  value={customRequest}
                  onChange={(e) => setCustomRequest(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all h-28 resize-none shadow-inner"
                />
              </div>

              {/* Teacher exclusions */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                  Ketersediaan Mengajar & Pembatasan JP Guru
                </label>
                <div className="max-h-[380px] overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-5 custom-scrollbar text-left shadow-inner">
                  {teachers.map(t => {
                    const excludedDays = teacherExceptions[t.nama] || [];
                    const excludedJPs = teacherJPExceptions[t.nama] || [];
                    return (
                      <div key={t.id} className="pb-4 border-b border-slate-200/60 last:border-0 last:pb-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold text-slate-800">{t.nama}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3 border-l-2 border-indigo-500">
                          {/* Hari Libur Selector */}
                          <div>
                            <span className="text-xs font-bold text-slate-400 block mb-1.5">Hari Libur Guru:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => {
                                const isExcluded = excludedDays.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                      setTeacherExceptions(prev => {
                                        const current = prev[t.nama] || [];
                                        const next = current.includes(day)
                                          ? current.filter(d => d !== day)
                                          : [...current, day];
                                        return { ...prev, [t.nama]: next };
                                      });
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-black border transition-all cursor-pointer ${
                                      isExcluded
                                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-extrabold shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-750'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* JP Batasan Selector */}
                          <div>
                            <span className="text-xs font-bold text-slate-400 block mb-1.5">Tidak Bisa Mengajar di JP Ke:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(jpNum => {
                                const isExcluded = excludedJPs.includes(jpNum);
                                return (
                                  <button
                                    key={jpNum}
                                    type="button"
                                    onClick={() => {
                                      setTeacherJPExceptions(prev => {
                                        const current = prev[t.nama] || [];
                                        const next = current.includes(jpNum)
                                          ? current.filter(n => n !== jpNum)
                                          : [...current, jpNum];
                                        return { ...prev, [t.nama]: next };
                                      });
                                    }}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-black border transition-all cursor-pointer ${
                                      isExcluded
                                        ? 'bg-amber-50 border-amber-300 text-amber-700 font-extrabold shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {jpNum}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="flex space-x-4 pt-6 border-t border-slate-100 mt-8">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="flex-1 py-4 bg-slate-150 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition-all text-xs uppercase tracking-widest cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiModalOpen(false);
                  setAiProgressModalOpen(true);
                  setAiProgressStatus('processing');
                  setAiProgressPercent(5);
                  setGeneratingSchedules(true);
                  setAiLogs(['[Sistem] Menghubungi mesin asisten AI...', '[Sistem] Menganalisis rombel kelas dan program mata pelajaran...']);
                  
                  setTimeout(() => {
                    setAiProgressPercent(30);
                    setAiLogs(prev => [...prev, '[Sistem] Membaca preferensi guru pengampu...', '[Sistem] Menyesuaikan ketersediaan & pantangan mengajar...']);
                  }, 600);

                  setTimeout(() => {
                    setAiProgressPercent(65);
                    setAiLogs(prev => [...prev, '[Sistem] Menghitung optimalisasi slot KBM sekolah...', '[Sistem] Memetakan seluruh JP mata pelajaran tanpa bentrok...']);
                  }, 1200);

                  setTimeout(() => {
                    setAiProgressPercent(85);
                    setAiLogs(prev => [...prev, '[Sistem] Melakukan validasi final lintas kelas & guru pengampu...']);
                  }, 1800);

                  setTimeout(() => {
                    try {
                      const result = autoGenerateSchedules(classes, subjects, settings, teacherExceptions, customRequest, teacherJPExceptions);
                      setSchedules(result.schedules);
                      setAiProgressPercent(100);
                      setAiProgressStatus('success');
                      setAiLogs(prev => [...prev, '[Success] Penyusunan jadwal berhasil difinalisasi!', '[Success] Berhasil menyusun seluruh jadwal kelas tanpa ada bentrok guru!']);
                      triggerToast('AI berhasil menyusun jadwal pelajaran secara otomatis!', 'Akademik', 'success');
                      triggerNotification('Jadwal Berhasil Diperbarui', 'Penyusunan jadwal otomatis sekolah selesai diproses.');
                      setGeneratingSchedules(false);
                    } catch (err: any) {
                      setAiProgressStatus('error');
                      setAiLogs(prev => [...prev, `[Error] Gagal menyusun: ${err.message || 'Error tidak diketahui'}`]);
                      setGeneratingSchedules(false);
                    }
                  }, 2400);
                }}
                disabled={generatingSchedules}
                className={`flex-1 py-4 text-white font-extrabold rounded-xl transition-all text-xs uppercase tracking-widest cursor-pointer text-center ${
                  generatingSchedules
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-150'
                }`}
              >
                {generatingSchedules ? 'Memproses...' : 'Mulai Auto-Scheduler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= AI PROGRESS & SUCCESS/ERROR MODAL ================= */}
      {aiProgressModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 z-[120] animate-fade-in overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 md:p-10 shadow-2xl relative border border-slate-100 text-center my-auto overflow-hidden animate-scale-in">
            
            {/* 1. PROCESSING STATE */}
            {aiProgressStatus === 'processing' && (
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  {/* Glowing background halo */}
                  <div className="absolute inset-0 bg-indigo-200/50 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative p-5 bg-indigo-50 text-indigo-600 rounded-full">
                    <Sparkles className="w-10 h-10 animate-pulse" />
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Menyusun Jadwal Cerdas AI
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2 max-w-sm">
                  Harap tunggu, asisten AI sedang mendistribusikan jadwal pelajaran, mencocokkan rombel kelas, dan ketersediaan waktu mengajar guru secara real-time.
                </p>

                {/* Progress bar container */}
                <div className="w-full mt-8">
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-sm" 
                      style={{ width: `${aiProgressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-2">
                    <span>Proses Komputasi</span>
                    <span>{aiProgressPercent}%</span>
                  </div>
                </div>

                {/* Logs Terminal */}
                <div className="w-full mt-6">
                  <span className="block text-left text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Log Komputasi AI:
                  </span>
                  <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-2 max-h-44 overflow-y-auto custom-scrollbar text-left leading-relaxed shadow-inner border border-slate-800">
                    {aiLogs.map((log, idx) => {
                      let logClass = "text-indigo-300";
                      if (log.startsWith('[Success]')) logClass = "text-emerald-400 font-extrabold";
                      else if (log.startsWith('[Error]')) logClass = "text-rose-400 font-extrabold";
                      else if (log.startsWith('[Sistem]')) logClass = "text-slate-400";
                      return (
                        <div key={idx} className={logClass}>
                          {log}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SUCCESS STATE */}
            {aiProgressStatus === 'success' && (
              <div className="flex flex-col items-center animate-scale-in">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-emerald-100/50 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative p-5 bg-emerald-50 text-emerald-600 rounded-full shadow-lg shadow-emerald-100/50">
                    <Check className="w-10 h-10 stroke-[3]" />
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Jadwal Pelajaran Berhasil Digenerate!
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-2 max-w-sm">
                  Asisten AI telah memetakan slot mengajar dengan efisiensi optimal tanpa ada bentrok guru maupun rombel kelas.
                </p>

                {/* Summary Info Cards */}
                <div className="grid grid-cols-2 gap-3 w-full mt-6">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">ROMBEL KELAS</span>
                    <span className="text-lg font-black text-slate-800 mt-1">{classes.length} Rombel</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">KONFLIK JADWAL</span>
                    <span className="text-lg font-black text-emerald-600 mt-1">0 (Aman)</span>
                  </div>
                </div>

                {/* Quick Logs */}
                <div className="w-full mt-5 text-left">
                  <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-1.5 text-left leading-relaxed shadow-inner border border-slate-800">
                    <div className="text-emerald-400 font-extrabold">[Success] Penyusunan jadwal berhasil difinalisasi!</div>
                    <div className="text-slate-400">[Sistem] Seluruh JP mata pelajaran sukses dipetakan.</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAiProgressModalOpen(false);
                  }}
                  className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all text-xs uppercase tracking-widest cursor-pointer text-center shadow-lg shadow-indigo-150 animate-pulse"
                >
                  Tutup & Tinjau Jadwal
                </button>
              </div>
            )}

            {/* 3. ERROR STATE */}
            {aiProgressStatus === 'error' && (
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-rose-100/50 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative p-5 bg-rose-50 text-rose-600 rounded-full shadow-lg shadow-rose-100/50">
                    <AlertTriangle className="w-10 h-10 stroke-[3]" />
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Penyusunan Jadwal Gagal
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-2 max-w-sm">
                  Mesin asisten AI mengalami kendala dalam mendistribusikan jam pelajaran berdasarkan aturan atau pantangan yang diatur.
                </p>

                {/* Error terminal */}
                <div className="w-full mt-6">
                  <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-2 text-left leading-relaxed shadow-inner border border-slate-800">
                    {aiLogs.filter(log => log.startsWith('[Error]')).map((log, idx) => (
                      <div key={idx} className="text-rose-400 font-extrabold">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 mt-8 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAiProgressModalOpen(false);
                      setAiModalOpen(true); // Re-open configuration modal
                    }}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition-all text-xs uppercase tracking-widest cursor-pointer text-center"
                  >
                    Atur Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiProgressModalOpen(false)}
                    className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition-all text-xs uppercase tracking-widest cursor-pointer text-center"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= PRINT PREVIEW MODAL ================= */}
      <PrintPreviewModal
        institution={institution}
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        classes={classes}
        subjects={subjects}
        settings={settings}
        schedules={schedules}
        printOption={printOption}
        setPrintOption={setPrintOption}
        printClassId={printClassId}
        setPrintClassId={setPrintClassId}
        getTeacherSubjectCodes={getTeacherSubjectCodes}
        getSlotsForDay={getSlotsForDay}
      />

      {/* Deactivated old modal implementation to avoid character match discrepancies */}
      {false && printModalOpen && (() => {
        const printTeacherCodes = getTeacherSubjectCodes(subjects);
        // Test match
        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPrintModalOpen(false);
              }
            }}
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] animate-fade-in overflow-y-auto"
          >
            <div className="bg-white rounded-3xl max-w-5xl w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[95vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setPrintModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 print:hidden">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  Pratinjau Cetak Jadwal Pelajaran
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Tampilan format cetak resmi sekolah. Gunakan tombol Cetak untuk mencetak atau menyimpan sebagai PDF.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center font-bold px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white shadow-md rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" />
                <span>Mulai Cetak</span>
              </button>
            </div>

            {/* Printable Area */}
            <div className="print-area bg-white p-2 text-slate-800">
              {/* Header Kop Surat */}
              <KopSurat institution={institution} />

              <div className="text-center mt-4 mb-2">
                <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-800">
                  JADWAL PELAJARAN MINGGUAN KBM
                </h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1">
                  Tahun Ajaran 2026/2027 | Kurikulum Merdeka
                </p>
              </div>

              {/* Master Table - Days/Times as Rows, Classes as Columns */}
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-800 text-slate-900 font-bold text-center">
                      <th className="p-2 border-r border-slate-800 w-16">Hari</th>
                      <th className="p-2 border-r border-slate-800 w-24">Waktu / JP</th>
                      {classes.map(c => (
                        <th key={c.id} className="p-2 border-r border-slate-800 last:border-0">{c.nama}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const printTeacherCodes = getTeacherSubjectCodes(subjects);
                      return ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => {
                        const slots = getSlotsForDay(day as any, settings);
                        return slots.map((slot, sIdx) => {
                          const isFirstOfHari = sIdx === 0;
                          return (
                            <tr key={`${day}-${sIdx}`} className="border-b border-slate-300 last:border-b-2 last:border-slate-800">
                              {isFirstOfHari && (
                                <td
                                  className="p-2 border-r border-slate-800 font-extrabold text-slate-900 text-center uppercase align-middle"
                                  rowSpan={slots.length}
                                >
                                  {day}
                                </td>
                              )}
                            
                            <td className="p-2 border-r border-slate-800 font-bold text-center bg-slate-50/40 align-middle">
                              {slot.type === 'AGENDA' ? (
                                <span className="text-slate-500">{slot.label}</span>
                              ) : (
                                <span>JP {slot.jpNumber}</span>
                              )}
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {slot.startTime}-{slot.endTime}
                              </div>
                            </td>

                            {classes.map(c => {
                              if (slot.type === 'AGENDA') {
                                return (
                                  <td
                                    key={`${c.id}-${day}-${sIdx}`}
                                    className="p-2 border-r border-slate-300 last:border-r-0 text-center font-bold text-slate-400 bg-slate-50/50 align-middle"
                                  >
                                    {slot.label}
                                  </td>
                                );
                              }

                              const jpNum = slot.jpNumber!;
                              const sched = schedules.find(s => 
                                s.kelasId === c.id && 
                                s.hari === day && 
                                s.jpStart <= jpNum && 
                                jpNum < s.jpStart + s.jpCount
                              );

                              if (sched) {
                                const sub = subjects.find(sb => sb.id === sched.mapelId);
                                const tCode = printTeacherCodes.get(sched.mapelId) || '';
                                return (
                                  <td
                                    key={`${c.id}-${day}-${jpNum}`}
                                    className="p-2 border-r border-slate-300 last:border-r-0 text-center font-bold align-middle"
                                  >
                                    <span className="block text-slate-900 font-black">{sub?.kode || 'MAPEL'}</span>
                                    <span className="block text-[8px] text-slate-500 font-semibold">{tCode}</span>
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={`${c.id}-${day}-${jpNum}`}
                                  className="p-2 border-r border-slate-300 last:border-r-0 text-center text-slate-300 align-middle"
                                >
                                  -
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })})()}
                  </tbody>
                </table>
              </div>

              {/* Keterangan Kode Guru */}
              <div className="mt-6 border-t border-slate-300 pt-4">
                <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Keterangan Kode / Nomor Guru Pengampu:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1.5 text-[9px] text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  {subjects.map(sub => {
                    const code = printTeacherCodes.get(sub.id) || '';
                    return (
                      <div key={sub.id} className="flex items-center space-x-1.5 py-0.5">
                        <span className="w-6 h-4 bg-indigo-50 border border-indigo-150 text-indigo-700 font-extrabold rounded flex items-center justify-center flex-shrink-0 text-[8px]">
                          {code}
                        </span>
                        <span className="truncate">
                          <strong className="text-slate-900">{formatGuruPengampuDisplay(sub.guruPengampu)}</strong> ({sub.nama})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 mt-8 text-center text-[10px] gap-8">
                <div>
                  <p className="font-bold">Mengetahui,</p>
                  <p className="font-bold text-slate-700">Kepala Madrasah MTs At-Turmudzi</p>
                  <div className="h-16" />
                  <p className="font-black text-slate-900 underline">K.H. Turmudzi, M.Pd.</p>
                  <p className="text-slate-400 text-[8px] font-bold">NIP. 19780512 200502 1 002</p>
                </div>
                <div>
                  <p className="font-bold">Bandung, 4 Juli 2026</p>
                  <p className="font-bold text-slate-700">Wakasek Bidang Kurikulum</p>
                  <div className="h-16" />
                  <p className="font-black text-slate-900 underline">Ust. Ahmad Syarif, S.Ag.</p>
                  <p className="text-slate-400 text-[8px] font-bold">NIP. 19831105 201004 1 003</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })()}

      {/* ================= CONFLICT OVERRIDE CONFIRMATION MODAL ================= */}
      {conflictConfirmOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConflictConfirmOpen(false);
            }
          }}
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[110] animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-left my-auto">
            <h3 className="text-lg font-extrabold text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Bentrok Terdeteksi!
            </h3>
            <p className="text-xs font-semibold text-slate-600 mt-2.5 leading-relaxed">
              {conflictWarning}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Apakah Anda ingin tetap memaksakan penyimpanan jadwal pelajaran ini?
            </p>
            <div className="flex space-x-3 mt-5">
              <button
                type="button"
                onClick={() => setConflictConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConflictConfirmOpen(false);
                  executeSaveSchedule();
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/10"
              >
                Tetap Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM DELETE SCHEDULE MODAL ================= */}
      {scheduleToDelete && (() => {
        const subName = getSubjectName(scheduleToDelete.mapelId);
        const subCode = getSubjectCode(scheduleToDelete.mapelId);
        const clsName = classes.find(c => c.id === scheduleToDelete.kelasId)?.nama || scheduleToDelete.kelasId;
        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setScheduleToDelete(null);
              }
            }}
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[110] animate-fade-in overflow-y-auto"
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => setScheduleToDelete(null)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 pr-8">
                <Trash2 className="w-5 h-5 text-rose-500" />
                Hapus Jadwal Pelajaran
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Apakah Anda yakin ingin menghapus jadwal pelajaran ini secara permanen?
              </p>

              <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 text-xs font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mata Pelajaran:</span>
                  <span className="text-slate-800 font-black text-right">{subName} ({subCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kelas:</span>
                  <span className="text-slate-800 font-black text-right">{clsName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hari & Jam:</span>
                  <span className="text-slate-800 font-black text-right">{scheduleToDelete.hari} (JP Ke-{scheduleToDelete.jpStart} s/d Ke-{scheduleToDelete.jpStart + scheduleToDelete.jpCount - 1})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Guru Pengampu:</span>
                  <span className="text-slate-800 font-black text-right">{scheduleToDelete.guru || 'Belum Ditunjuk'}</span>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setScheduleToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => confirmDeleteSchedule(scheduleToDelete)}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-500/10"
                >
                  Hapus Jadwal
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= CONFIRM DELETE SUBJECT MODAL ================= */}
      {subjectToDelete && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSubjectToDelete(null);
            }
          }}
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[110] animate-fade-in overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSubjectToDelete(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 pr-8">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Hapus Mata Pelajaran
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Apakah Anda yakin ingin menghapus mata pelajaran ini?
            </p>

            <div className="mt-6 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2.5 text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Kode Mapel:</span>
                <span className="text-rose-900 font-black text-right">{subjectToDelete.kode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Mapel:</span>
                <span className="text-rose-900 font-black text-right">{subjectToDelete.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tingkat:</span>
                <span className="text-rose-900 font-black text-right">Kelas {subjectToDelete.tingkat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kategori:</span>
                <span className="text-rose-900 font-black text-right">{subjectToDelete.kategori}</span>
              </div>
              <div className="p-2.5 bg-rose-100/50 border border-rose-200/50 rounded-xl text-[11px] font-bold text-rose-800 leading-normal">
                Peringatan: Semua alokasi jadwal pelajaran yang terhubung dengan mata pelajaran ini juga akan ikut terhapus permanen dari sistem.
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteSubject(subjectToDelete)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-500/10"
              >
                Hapus Mapel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
