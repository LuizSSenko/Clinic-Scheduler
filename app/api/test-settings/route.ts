import { NextResponse } from "next/server"
import { getClinicSettings } from "@/lib/actions"

export async function GET() {
  try {
    const settings = await getClinicSettings()
    return NextResponse.json({
      success: true,
      message: "Clinic settings loaded successfully",
      data: settings,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Settings error: ${error.message}`,
    })
  }
}
