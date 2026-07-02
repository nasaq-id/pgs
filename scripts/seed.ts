import { db } from "../src/server/db"
import { users, sekolah } from "../src/server/db/schema"
import bcrypt from "bcryptjs"

async function seed() {
  const password = await bcrypt.hash("admin123", 10)

  const [sekolahBaru] = await db.insert(sekolah).values({
    id: "sekolah-1",
    namaSekolah: "Sekolah Demo",
    npsn: "12345678",
    jenjang: "sma",
    active: true,
  }).onConflictDoNothing().returning()

  const [user] = await db.insert(users).values({
    id: "user-1",
    email: "admin@demo.com",
    firstName: "Super",
    lastName: "Admin",
    password,
    role: "super_admin",
    sekolahId: sekolahBaru?.id || "sekolah-1",
    active: true,
  }).onConflictDoNothing().returning()

  if (user) {
    console.log("✅ Super admin created:")
    console.log("   Email:    admin@demo.com")
    console.log("   Password: admin123")
  } else {
    console.log("ℹ️  User already exists")
  }

  process.exit(0)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
