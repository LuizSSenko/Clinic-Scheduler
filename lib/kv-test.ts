// Test function to verify KV connection with new credentials
export async function testKVConnection() {
  try {
    console.log("Testing KV connection...")
    console.log("KV_REST_API_URL:", process.env.KV_REST_API_URL)
    console.log("KV_REST_API_TOKEN exists:", !!process.env.KV_REST_API_TOKEN)

    // Test with a simple SET/GET operation
    const testKey = `test:connection:${Date.now()}`
    const testValue = "connection-test"

    // SET operation
    const setResponse = await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(testKey)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testValue),
    })

    console.log("SET response status:", setResponse.status)

    if (!setResponse.ok) {
      const errorText = await setResponse.text()
      console.error("SET failed:", errorText)
      return { success: false, message: `SET operation failed: ${errorText}` }
    }

    // GET operation
    const getResponse = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(testKey)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    console.log("GET response status:", getResponse.status)

    if (!getResponse.ok) {
      const errorText = await getResponse.text()
      console.error("GET failed:", errorText)
      return { success: false, message: `GET operation failed: ${errorText}` }
    }

    const getData = await getResponse.json()
    console.log("GET response data:", getData)

    if (getData.result === testValue) {
      // Clean up test key
      await fetch(`${process.env.KV_REST_API_URL}/del/${encodeURIComponent(testKey)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        },
      })

      console.log("✅ KV connection successful!")
      return { success: true, message: "KV database connected successfully" }
    } else {
      console.log("❌ KV connection failed - unexpected result:", getData.result)
      return { success: false, message: "KV connection test failed - data mismatch" }
    }
  } catch (error) {
    console.error("❌ KV connection error:", error)
    return { success: false, message: `KV connection error: ${error.message}` }
  }
}

// Initialize database with default data
export async function initializeDatabase() {
  try {
    console.log("Initializing database...")

    // Check if clinic settings exist
    const settingsResponse = await fetch(`${process.env.KV_REST_API_URL}/get/clinic%3Asettings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    let settingsExist = false
    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json()
      settingsExist = settingsData.result !== null
    }

    if (!settingsExist) {
      const defaultSettings = {
        workHours: {
          start: "09:00",
          end: "17:00",
        },
        lunchTime: {
          enabled: true,
          start: "12:00",
          end: "13:00",
        },
        maxConcurrentAppointments: 1,
      }

      const setSettingsResponse = await fetch(`${process.env.KV_REST_API_URL}/set/clinic%3Asettings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(defaultSettings),
      })

      if (setSettingsResponse.ok) {
        console.log("✅ Default clinic settings initialized")
      } else {
        const errorText = await setSettingsResponse.text()
        console.error("❌ Failed to initialize settings:", errorText)
      }
    } else {
      console.log("✅ Clinic settings already exist")
    }

    // Check appointments list
    const appointmentsResponse = await fetch(`${process.env.KV_REST_API_URL}/lrange/clinic%3Aappointments/0/-1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    let appointmentsCount = 0
    if (appointmentsResponse.ok) {
      const appointmentsData = await appointmentsResponse.json()
      appointmentsCount = appointmentsData.result ? appointmentsData.result.length : 0
    }

    // Check blocked times list
    const blockedTimesResponse = await fetch(`${process.env.KV_REST_API_URL}/lrange/clinic%3AblockedTimes/0/-1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    let blockedTimesCount = 0
    if (blockedTimesResponse.ok) {
      const blockedTimesData = await blockedTimesResponse.json()
      blockedTimesCount = blockedTimesData.result ? blockedTimesData.result.length : 0
    }

    console.log(`📅 Found ${appointmentsCount} existing appointments`)
    console.log(`🚫 Found ${blockedTimesCount} blocked time periods`)

    return { success: true, message: "Database initialized successfully" }
  } catch (error) {
    console.error("❌ Database initialization error:", error)
    return { success: false, message: `Database initialization error: ${error.message}` }
  }
}
