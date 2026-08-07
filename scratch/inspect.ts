import * as schema from "../src/server/db/schema"
import { getTableColumns } from "drizzle-orm"

function inspectColumns() {
  const usersTable = schema.users
  const columns = getTableColumns(usersTable)
  
  console.log("=== INSPECTING COLUMNS DETAILS ===")
  for (const [key, col] of Object.entries(columns)) {
    const c = col as any
    console.log(`\nField: ${key}`)
    console.log(` - name: ${c.name}`)
    console.log(` - dataType: ${c.dataType}`)
    console.log(` - columnType: ${c.columnType}`)
    console.log(` - notNull: ${c.notNull}`)
    console.log(` - primaryKey: ${c.primary}`)
    console.log(` - hasDefault: ${c.hasDefault}`)
    if (c.enumValues) {
      console.log(` - enumValues: [${c.enumValues.join(", ")}]`)
    }
  }
}

inspectColumns()
