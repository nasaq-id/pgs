import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, between, or, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { pengajuanIzin, siswa, guru, absensiSiswa, absensiGuru, kelas } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { createNotifikasi } from "@/server/notifikasi"

export const izinRouter = router({
  submitIzin: protectedProcedure
    .input(
      z.object({
        jenisIzin: z.enum(["terlambat", "pulang_cepat", "tidak_masuk"]),
        alasan: z.string().min(1),
        jamPulang: z.string().optional(),
        jumlahHari: z.number().optional().default(1),
        tanggalMulai: z.coerce.date(),
        bukti: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const email = ctx.session.user.email ?? ""
      const role = ctx.session.user.role

      let studentId: string | null = null
      let teacherId: string | null = null
      let tipePengaju: "siswa" | "guru" = "siswa"

      if (role === "siswa") {
        const std = await db.query.siswa.findFirst({
          where: and(eq(siswa.sekolahId, sekolahId), or(eq(siswa.usernameSiswa, email), eq(siswa.nisn, email))),
        })
        if (!std) throw new TRPCError({ code: "NOT_FOUND", message: "Profil siswa tidak ditemukan" })
        studentId = std.id
        tipePengaju = "siswa"
      } else if (role === "guru") {
        const teacher = await db.query.guru.findFirst({
          where: and(eq(guru.sekolahId, sekolahId), or(eq(guru.usernameGuru, email), eq(guru.email, email), eq(guru.nipnuptk, email))),
        })
        if (!teacher) throw new TRPCError({ code: "NOT_FOUND", message: "Profil guru tidak ditemukan" })
        teacherId = teacher.id
        tipePengaju = "guru"
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Hanya siswa atau guru yang dapat mengajukan izin" })
      }

      // Calculate tanggalSelesai
      const tMulai = new Date(input.tanggalMulai)
      const tSelesai = new Date(input.tanggalMulai)
      if (input.jenisIzin === "tidak_masuk" && input.jumlahHari > 1) {
        tSelesai.setDate(tMulai.getDate() + input.jumlahHari - 1)
      }

      const [created] = await db
        .insert(pengajuanIzin)
        .values({
          id: crypto.randomUUID(),
          sekolahId,
          tipePengaju,
          siswaId: studentId,
          guruId: teacherId,
          jenisIzin: input.jenisIzin,
          alasan: input.alasan,
          jamPulang: input.jamPulang || null,
          jumlahHari: input.jenisIzin === "tidak_masuk" ? input.jumlahHari : null,
          tanggalMulai: tMulai,
          tanggalSelesai: tSelesai,
          bukti: input.bukti || null,
          status: "pending",
        })
        .returning()

      await logAudit(ctx, { action: "submit_izin", entity: "pengajuan_izin", entityId: created.id })

      // Create notifications
      if (tipePengaju === "siswa" && studentId) {
        // Find Wali Kelas
        const stdProfile = await db.query.siswa.findFirst({
          where: eq(siswa.id, studentId),
          with: { kelas: true },
        })
        if (stdProfile?.kelas?.waliKelasId) {
          // Send notification to Wali Kelas ?
          // We can broadcast or send general info. In this system, notifications are bound to sekolahId.
          await createNotifikasi(ctx, {
            judul: "Pengajuan Izin Siswa",
            pesan: `Siswa ${stdProfile.namaLengkap} mengajukan izin: ${input.alasan}`,
            tipe: "warning",
            link: "/absensi/izin",
          })
        }
      } else if (tipePengaju === "guru") {
        await createNotifikasi(ctx, {
          judul: "Pengajuan Izin Guru",
          pesan: `Guru ${ctx.session.user.name} mengajukan izin: ${input.alasan}`,
          tipe: "warning",
          link: "/absensi/izin",
        })
      }

      return created
    }),

  getDaftarPengajuan: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "disetujui", "ditolak"]).optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const role = ctx.session.user.role
      const email = ctx.session.user.email ?? ""

      // 1. Siswa sees only their own
      if (role === "siswa") {
        const std = await db.query.siswa.findFirst({
          where: and(eq(siswa.sekolahId, sekolahId), or(eq(siswa.usernameSiswa, email), eq(siswa.nisn, email))),
        })
        if (!std) return { data: [], total: 0 }

        const conditions = [eq(pengajuanIzin.sekolahId, sekolahId), eq(pengajuanIzin.siswaId, std.id)]
        if (input.status) conditions.push(eq(pengajuanIzin.status, input.status))

        const rows = await db
          .select()
          .from(pengajuanIzin)
          .where(and(...conditions))
          .orderBy(desc(pengajuanIzin.createdAt))
          .limit(input.limit)
          .offset(input.offset)

        return { data: rows, total: rows.length }
      }

      // 2. Guru checks if they are Wali Kelas or Waka/Kepsek
      if (role === "guru") {
        const teacher = await db.query.guru.findFirst({
          where: and(eq(guru.sekolahId, sekolahId), or(eq(guru.usernameGuru, email), eq(guru.email, email), eq(guru.nipnuptk, email))),
        })
        if (!teacher) return { data: [], total: 0 }

        const isWali = await db.query.kelas.findMany({
          where: eq(kelas.waliKelasId, teacher.id),
        })
        const managedKelasIds = isWali.map((c) => c.id)

        const isKepsekOrWaka =
          teacher.tugasUtama?.toLowerCase().includes("kepala") ||
          teacher.tugasUtama?.toLowerCase().includes("waka") ||
          teacher.tugasUtama?.toLowerCase().includes("kurikulum") ||
          teacher.tugasTambahan?.toLowerCase().includes("kepala") ||
          teacher.tugasTambahan?.toLowerCase().includes("waka") ||
          teacher.tugasTambahan?.toLowerCase().includes("kurikulum")

        const conditions: any[] = [eq(pengajuanIzin.sekolahId, sekolahId)]
        if (input.status) conditions.push(eq(pengajuanIzin.status, input.status))

        // If Kepsek/Waka, they see all Guru submissions + they can see all
        // If Wali Kelas (but not Kepsek/Waka), they see their own submissions AND student submissions in their classes
        // If regular Guru, they see only their own submissions
        let filterOrClause: any

        if (isKepsekOrWaka) {
          // Waka/Kepsek sees all Guru submissions + Wali Kelas student submissions
          filterOrClause = or(
            eq(pengajuanIzin.tipePengaju, "guru"),
            eq(pengajuanIzin.guruId, teacher.id),
            managedKelasIds.length > 0
              ? and(eq(pengajuanIzin.tipePengaju, "siswa"), inArray(pengajuanIzin.siswaId, db.select({ id: siswa.id }).from(siswa).where(inArray(siswa.kelasId, managedKelasIds))))
              : undefined,
          )
        } else if (managedKelasIds.length > 0) {
          // Wali kelas sees their own + student submissions in their class
          filterOrClause = or(
            eq(pengajuanIzin.guruId, teacher.id),
            and(eq(pengajuanIzin.tipePengaju, "siswa"), inArray(pengajuanIzin.siswaId, db.select({ id: siswa.id }).from(siswa).where(inArray(siswa.kelasId, managedKelasIds)))),
          )
        } else {
          // Regular teacher sees only their own
          filterOrClause = eq(pengajuanIzin.guruId, teacher.id)
        }

        if (filterOrClause) {
          conditions.push(filterOrClause)
        }

        const rows = await db
          .select()
          .from(pengajuanIzin)
          .where(and(...conditions))
          .orderBy(desc(pengajuanIzin.createdAt))
          .limit(input.limit)
          .offset(input.offset)

        // Hydrate rows with student or teacher info
        const populated = await Promise.all(
          rows.map(async (row) => {
            let name = "Unknown"
            let detail = ""
            if (row.tipePengaju === "siswa" && row.siswaId) {
              const std = await db.query.siswa.findFirst({
                where: eq(siswa.id, row.siswaId),
                with: { kelas: true },
              })
              name = std?.namaLengkap ?? "Siswa"
              detail = std?.kelas?.namaKelas ?? ""
            } else if (row.tipePengaju === "guru" && row.guruId) {
              const t = await db.query.guru.findFirst({
                where: eq(guru.id, row.guruId),
              })
              name = t?.namaLengkap ?? "Guru"
              detail = t?.nipnuptk ?? ""
            }
            return { ...row, name, detail }
          }),
        )

        return { data: populated, total: populated.length }
      }

      // 3. Admin sees all
      if (role === "admin_sekolah" || role === "super_admin" || role === "tu") {
        const conditions = [eq(pengajuanIzin.sekolahId, sekolahId)]
        if (input.status) conditions.push(eq(pengajuanIzin.status, input.status))

        const rows = await db
          .select()
          .from(pengajuanIzin)
          .where(and(...conditions))
          .orderBy(desc(pengajuanIzin.createdAt))
          .limit(input.limit)
          .offset(input.offset)

        const populated = await Promise.all(
          rows.map(async (row) => {
            let name = "Unknown"
            let detail = ""
            if (row.tipePengaju === "siswa" && row.siswaId) {
              const std = await db.query.siswa.findFirst({
                where: eq(siswa.id, row.siswaId),
                with: { kelas: true },
              })
              name = std?.namaLengkap ?? "Siswa"
              detail = std?.kelas?.namaKelas ?? ""
            } else if (row.tipePengaju === "guru" && row.guruId) {
              const t = await db.query.guru.findFirst({
                where: eq(guru.id, row.guruId),
              })
              name = t?.namaLengkap ?? "Guru"
              detail = t?.nipnuptk ?? ""
            }
            return { ...row, name, detail }
          }),
        )

        return { data: populated, total: populated.length }
      }

      return { data: [], total: 0 }
    }),

  approveIzin: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru", "tu"])
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["disetujui", "ditolak"]),
        catatanApproval: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const row = await db.query.pengajuanIzin.findFirst({
        where: and(eq(pengajuanIzin.id, input.id), eq(pengajuanIzin.sekolahId, sekolahId)),
      })

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Pengajuan izin tidak ditemukan" })

      // Verify approval permission
      const role = ctx.session.user.role
      const email = ctx.session.user.email ?? ""

      if (role === "guru") {
        const teacher = await db.query.guru.findFirst({
          where: and(eq(guru.sekolahId, sekolahId), or(eq(guru.usernameGuru, email), eq(guru.email, email), eq(guru.nipnuptk, email))),
        })
        if (!teacher) throw new TRPCError({ code: "FORBIDDEN", message: "Tidak memiliki hak akses persetujuan" })

        if (row.tipePengaju === "siswa") {
          // Must be Wali Kelas of this student's class
          const std = await db.query.siswa.findFirst({
            where: eq(siswa.id, row.siswaId!),
          })
          if (!std || !std.kelasId) throw new TRPCError({ code: "BAD_REQUEST", message: "Siswa tidak berada di kelas mana pun" })

          const isWali = await db.query.kelas.findFirst({
            where: and(eq(kelas.id, std.kelasId), eq(kelas.waliKelasId, teacher.id)),
          })
          if (!isWali) throw new TRPCError({ code: "FORBIDDEN", message: "Anda bukan Wali Kelas dari siswa ini" })
        } else {
          // Teacher submission: Must be Waka/Kepsek
          const isKepsekOrWaka =
            teacher.tugasUtama?.toLowerCase().includes("kepala") ||
            teacher.tugasUtama?.toLowerCase().includes("waka") ||
            teacher.tugasUtama?.toLowerCase().includes("kurikulum") ||
            teacher.tugasTambahan?.toLowerCase().includes("kepala") ||
            teacher.tugasTambahan?.toLowerCase().includes("waka") ||
            teacher.tugasTambahan?.toLowerCase().includes("kurikulum")

          if (!isKepsekOrWaka) throw new TRPCError({ code: "FORBIDDEN", message: "Anda bukan Kepala Sekolah atau Waka Kurikulum" })
        }
      }

      // Perform update
      const [updated] = await db
        .update(pengajuanIzin)
        .set({
          status: input.status,
          catatanApproval: input.catatanApproval || null,
          disetujuiOleh: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(pengajuanIzin.id, input.id))
        .returning()

      await logAudit(ctx, { action: "approve_izin", entity: "pengajuan_izin", entityId: input.id, metadata: { status: input.status } })

      // Auto-update attendance if approved
      if (input.status === "disetujui" && row.jenisIzin === "tidak_masuk") {
        const start = new Date(row.tanggalMulai)
        const end = new Date(row.tanggalSelesai)

        // Loop dates
        const current = new Date(start)
        while (current <= end) {
          const dateToSet = new Date(current)
          const startOfDay = new Date(dateToSet)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(dateToSet)
          endOfDay.setHours(23, 59, 59, 999)

          const statusToSet = row.alasan.toLowerCase().includes("sakit") ? "sakit" : "izin"

          if (row.tipePengaju === "siswa" && row.siswaId) {
            const std = await db.query.siswa.findFirst({ where: eq(siswa.id, row.siswaId) })
            if (std?.kelasId) {
              const existing = await db.query.absensiSiswa.findFirst({
                where: and(eq(absensiSiswa.siswaId, row.siswaId), between(absensiSiswa.tanggal, startOfDay, endOfDay)),
              })

              if (existing) {
                await db
                  .update(absensiSiswa)
                  .set({ status: statusToSet })
                  .where(eq(absensiSiswa.id, existing.id))
              } else {
                await db.insert(absensiSiswa).values({
                  id: crypto.randomUUID(),
                  sekolahId,
                  siswaId: row.siswaId,
                  kelasId: std.kelasId,
                  tanggal: dateToSet,
                  status: statusToSet,
                })
              }
            }
          } else if (row.tipePengaju === "guru" && row.guruId) {
            const existing = await db.query.absensiGuru.findFirst({
              where: and(eq(absensiGuru.guruId, row.guruId), between(absensiGuru.tanggal, startOfDay, endOfDay)),
            })

            if (existing) {
              await db
                .update(absensiGuru)
                .set({ status: statusToSet })
                .where(eq(absensiGuru.id, existing.id))
            } else {
              await db.insert(absensiGuru).values({
                id: crypto.randomUUID(),
                sekolahId,
                guruId: row.guruId,
                tanggal: dateToSet,
                status: statusToSet,
              })
            }
          }

          current.setDate(current.getDate() + 1)
        }
      }

      return updated
    }),
})
