import { Client } from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function checkDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log("Connected to Supabase database successfully.")

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nilai' AND column_name = 'created_at';
    `)

    if (res.rows.length > 0) {
      console.log("SUCCESS: 'created_at' column already exists in 'nilai' table in Supabase!")
    } else {
      console.log("WARNING: 'created_at' column does NOT exist in 'nilai' table in Supabase.")
    }

    // List all columns in nilai
    const allCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nilai';
    `)
    console.log("\nAll columns in 'nilai' table:")
    allCols.rows.forEach(row => {
      console.log(` - ${row.column_name}: ${row.data_type}`)
    })

  } catch (error) {
    console.error("Error connecting or querying database:", error)
  } finally {
    await client.end()
  }
}

checkDatabase()
