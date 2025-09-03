import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("Clearing all appointments...")

    // Delete the appointments list
    const url = `${process.env.KV_REST_API_URL}/del/${encodeURIComponent("clinic:appointments")}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        message: `Failed to clear appointments: ${errorText}`,
      })
    }

    return NextResponse.json({
      success: true,
      message: "All appointments cleared successfully",
    })
  } catch (error) {
    console.error("Clear appointments error:", error)
    return NextResponse.json({
      success: false,
      message: `Clear error: ${error.message}`,
    })
  }
}
