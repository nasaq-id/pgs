"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useParams } from "next/navigation"
import { X } from "lucide-react"

const ALL_DAYS = [
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
  "minggu",
]

interface TeacherAvailabilityConfiguratorProps {
  teachers: any[]
  selectedTeacherIds: string[]
  setSelectedTeacherIds: React.Dispatch<React.SetStateAction<string[]>>
  teacherExceptions: Record<string, { excludedDays: string[]; jpExceptions: Record<string, number[]> }>
  setTeacherExceptions: React.Dispatch<React.SetStateAction<Record<string, { excludedDays: string[]; jpExceptions: Record<string, number[]> }>>>
  onSave: () => void
}

export const TeacherAvailabilityConfigurator = ({
  teachers,
  selectedTeacherIds,
  setSelectedTeacherIds,
  teacherExceptions,
  setTeacherExceptions,
  onSave,
}: TeacherAvailabilityConfiguratorProps) => {
  const { selectedTeacherId } = useParams()

  const teachersToRender = selectedTeacherIds.length > 0
    ? teachers.filter((t: any) => selectedTeacherIds.includes(t.id))
    : teachers.slice(0, 3)

  // Compute disabled JP numbers per day for each teacher
  const disabledJPsPerDay = useMemo(() => {
    const result: Record<string, Set<number>> = {}
    teachersToRender.forEach((teacher: any) => {
      const exceptions = teacherExceptions[teacher.id] || { excludedDays: [], jpExceptions: {} }
      ALL_DAYS.forEach((day) => {
        const jpList = exceptions.jpExceptions[day] || []
        result[day] = new Set(jpList.filter((n: number) => !isNaN(n)))
      })
    })
    return result
  }, [teachersToRender, teacherExceptions])

  const toggleExcludedDay = useCallback((teacherId: string, day: string) => {
    setTeacherExceptions(prev => {
      const current = prev[teacherId]?.excludedDays || []
      if (current.includes(day)) {
        return {
          ...prev,
          [teacherId]: {
            excludedDays: current.filter(d => d !== day),
            jpExceptions: prev[teacherId]?.jpExceptions || {},
          },
        }
      } else {
        return {
          ...prev,
          [teacherId]: {
            excludedDays: [...current, day],
            jpExceptions: prev[teacherId]?.jpExceptions || {},
          },
        }
      }
    })
  }, [])

  const toggleJPException = useCallback((teacherId: string, day: string, jpNum: number) => {
    setTeacherExceptions(prev => {
      const currentJpExceptions = prev[teacherId]?.jpExceptions || {}
      const newJpExceptions = {
        ...currentJpExceptions,
        [day]: currentJpExceptions[day]
          ? currentJpExceptions[day].filter(n => n !== jpNum)
          : [jpNum],
      }
      return {
        ...prev,
        [teacherId]: {
          excludedDays: prev[teacherId]?.excludedDays || [],
          jpExceptions: newJpExceptions,
        },
      }
    })
  }, [])

  return (
    <Card className="neumo-card p-6">
      <CardHeader>
        <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
          Ketersediaan Guru
        </CardTitle>
      </CardHeader>

      <CardContent>
        {teachersToRender.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada guru yang dipilih</p>
        ) : (
          <div className="space-y-4">
            {teachersToRender.map((teacher: any) => {
              const exceptions = teacherExceptions[teacher.id] || {
                excludedDays: [],
                jpExceptions: {},
              }
              const isMulti = selectedTeacherIds.length > 1

              return (
                <div
                  key={teacher.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-500 text-white font-black flex items-center justify-center text-sm shrink-0">
                        {teacher.nama?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 tracking-tight">{teacher.nama}</h4>
                        {teacher.nipNuptk && (
                          <p className="text-xs text-slate-500">NIP/NUPTK: {teacher.nipNuptk}</p>
                        )}
                      </div>
                    </div>

                    {isMulti && (
                      <button
                        onClick={() => {
                          setSelectedTeacherIds(prev => prev.filter((id: string) => id !== teacher.id))
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                        title="Hapus dari daftar pilihan"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Hari Libur Mengajar Section */}
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      1. Libur Mengajar Seharian
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Guru {teacher.nama} tidak akan dijadwalkan mengajar pada hari yang dipilih.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ALL_DAYS.map((day) => {
                        const isExcluded = exceptions.excludedDays.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleExcludedDay(teacher.id, day)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              isExcluded
                                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {day} {isExcluded ? '✓' : ''}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Atur JP Kosong Section */}
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      2. Atur JP Kosong (Jam Pelajaran)
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Pilih nomor JP yang dikosongkan untuk {teacher.nama} setiap hari.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {ALL_DAYS.map((day) => (
                        <div key={day} className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            {day}
                          </Label>
                          <Select
                            value={Object.keys(exceptions.jpExceptions[day] || {}).join(",") || ""}
                            onValueChange={((val: string | null) => {
                              const jpNums = val ? val.split(",").map(Number).filter(n => n > 0 && !isNaN(n)) : []
                              // Toggle each JP number
                              jpNums.forEach((num) => toggleJPException(teacher.id, day, num))
                              // Also toggle the reverse: if a JP was previously excluded and is now not in the list, un-exclude it
                              const currentExcluded = exceptions.jpExceptions[day] || []
                              const currentlyExcludedSet = new Set(currentExcluded)
                              ;(currentExcluded || []).forEach((num) => {
                                if (!jpNums.includes(num)) {
                                  toggleJPException(teacher.id, day, num)
                                }
                              })
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih JP" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 20 }, (_, i) => i + 1).map((jpNum) => {
                                const isJpExcluded = disabledJPsPerDay[day]?.has(jpNum) ?? false
                                return (
                                  <SelectItem
                                    key={jpNum}
                                    value={jpNum.toString()}
                                    disabled={isJpExcluded}
                                  >
                                    {jpNum}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}