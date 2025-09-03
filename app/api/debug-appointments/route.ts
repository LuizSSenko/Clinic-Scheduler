import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Debug: Checking appointments in database...")

    // Get raw data from KV
    const url = `${process.env.KV_REST_API_URL}/lrange/${encodeURIComponent("clinic:appointments")}/0/-1`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        message: `Failed to fetch appointments: ${errorText}`,
      })
    }

    const data = await response.json()
    console.log("Raw appointments data:", data)

    return NextResponse.json({
      success: true,
      message: "Debug data retrieved",
      rawData: data,
      appointments: data.result || [],
      count: data.result ? data.result.length : 0,
    })
  } catch (error) {
    console.error("Debug appointments error:", error)
    return NextResponse.json({
      success: false,
      message: `Debug error: ${error.message}`,
    })
  }
}
