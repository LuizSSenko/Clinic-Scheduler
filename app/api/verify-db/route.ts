import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"

export async function GET() {
  try {
    console.log("Verifying database connection...")

    // Test basic connectivity
    const testKey = `test:${Date.now()}`
    await kv.set(testKey, "connection-test")
    const result = await kv.get(testKey)
    await kv.del(testKey)

    if (result === "connection-test") {
      // Check existing data
      const appointments = await kv.lrange("clinic:appointments", 0, -1)
      const blockedTimes = await kv.lrange("clinic:blockedTimes", 0, -1)
      const settings = await kv.get("clinic:settings")

      return NextResponse.json({
        success: true,
        message: "Database connected successfully",
        data: {
          appointments: appointments?.length || 0,
          blockedTimes: blockedTimes?.length || 0,
          settingsExist: !!settings,
          settings: settings,
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "Database test failed",
      })
    }
  } catch (error) {
    console.error("Database verification error:", error)
    return NextResponse.json({
      success: false,
      message: `Database error: ${error.message}`,
    })
  }
}
