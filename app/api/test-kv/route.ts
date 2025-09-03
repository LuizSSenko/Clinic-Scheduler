import { NextResponse } from "next/server"
import { testKVConnection } from "@/lib/kv-test"

export async function POST() {
  try {
    const result = await testKVConnection()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `API error: ${error.message}`,
    })
  }
}
