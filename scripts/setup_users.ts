import { db } from "../src/server/db"
import { users, sekolah } from "../src/server/db/schema"
import { eq, ilike } from "drizzle-orm"
import bcrypt from "bcryptjs"

async function run() {
  console.log("Starting DB User configuration script...")

  // 1. Find or create SMPN 2 Cikalongwetan
  let targetSekolah = await db.query.sekolah.findFirst({
    where: ilike(sekolah.namaSekolah, "%Cikalongwetan%")
  })

  if (!targetSekolah) {
    console.log("School SMPN 2 Cikalongwetan not found. Creating it...")
    const [newSekolah] = await db.insert(sekolah).values({
      id: "sekolah-smpn2cikalongwetan",
      namaSekolah: "SMPN 2 Cikalongwetan",
      namaSingkat: "SMPN 2 Cikalongwetan",
      npsn: "12345679",
      jenjang: "smp",
      active: true,
    }).returning()
    targetSekolah = newSekolah
  }

  const sekolahId = targetSekolah.id
  console.log(`Using School: ${targetSekolah.namaSekolah} (ID: ${sekolahId})`)

  // 2. Create or update admin_sekolah user
  const adminEmail = "admin.smpn2cikalongwetan@demo.com"
  const adminPasswordPlain = "cikalongwetan123"
  const hashedAdminPassword = await bcrypt.hash(adminPasswordPlain, 10)

  // Clean up any existing admin user with this email to avoid unique constraint violations
  await db.delete(users).where(eq(users.email, adminEmail))

  await db.insert(users).values({
    id: "user-admin-smpn2cikalongwetan",
    email: adminEmail,
    firstName: "Admin",
    lastName: "SMPN 2 Cikalongwetan",
    password: hashedAdminPassword,
    role: "admin_sekolah",
    sekolahId: sekolahId,
    active: true,
  }).returning()

  console.log(`✅ Admin sekolah created/updated successfully:`)
  console.log(`   Email:    ${adminEmail}`)
  console.log(`   Password: ${adminPasswordPlain}`)

  // 3. Update or create super_admin user with email agdscid@gmail.com and password 11223344
  const superEmail = "agdscid@gmail.com"
  const superPasswordPlain = "11223344"
  const hashedSuperPassword = await bcrypt.hash(superPasswordPlain, 10)

  // Delete existing user if any to avoid constraint conflicts, or check by id
  await db.delete(users).where(eq(users.email, superEmail))

  await db.insert(users).values({
    id: "user-super-admin-real",
    email: superEmail,
    firstName: "Super",
    lastName: "Admin",
    password: hashedSuperPassword,
    role: "super_admin",
    sekolahId: sekolahId, // associate with this school
    active: true,
  }).returning()

  console.log(`✅ Super Admin created/updated successfully:`)
  console.log(`   Email:    ${superEmail}`)
  console.log(`   Password: ${superPasswordPlain}`)

  process.exit(0)
}

run().catch(err => {
  console.error("❌ Error setting up users:", err)
  process.exit(1)
})
