import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/kv-test"

export async function POST() {
  try {
    const result = await initializeDatabase()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `API error: ${error.message}`,
    })
  }
}
