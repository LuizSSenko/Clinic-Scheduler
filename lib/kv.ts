// Use the default Vercel KV import which handles configuration automatically
export { kv } from "@vercel/kv"

// Simple test function that doesn't rely on complex operations
export async function testKVConnection() {
  try {
    console.log("Testing KV connection...")
    console.log("KV_REST_API_URL:", process.env.KV_REST_API_URL)
    console.log("KV_REST_API_TOKEN exists:", !!process.env.KV_REST_API_TOKEN)

    // Use a simple ping operation
    const testResult = await fetch(`${process.env.KV_REST_API_URL}/ping`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    console.log("Ping response status:", testResult.status)
    console.log("Ping response headers:", Object.fromEntries(testResult.headers.entries()))

    if (testResult.ok) {
      const responseText = await testResult.text()
      console.log("Ping response body:", responseText)
      return true
    } else {
      const errorText = await testResult.text()
      console.error("Ping failed with status:", testResult.status)
      console.error("Error response:", errorText)
      return false
    }
  } catch (error) {
    console.error("❌ KV connection test failed:", error)
    return false
  }
}
