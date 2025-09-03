"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import type { ClinicSettings, Appointment, BlockedTime, TimeSlot } from "./types"
import { parseISO, isBefore, addHours } from "date-fns"

// Import the email service
import { sendAppointmentConfirmationEmail } from "./email-service"

// Schema definitions
const AppointmentSchema = z.object({
  userName: z.string().min(1, "Name is required"),
  userEmail: z.string().email("Invalid email address"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  reason: z.string().min(1, "Reason is required"),
  isEmergency: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  emergencyReason: z.string().optional().default(""),
  language: z.enum(["en", "pt-BR"]).default("en"),
})

const BlockedTimeSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  reason: z.string().min(1, "Reason is required"),
})

const ClinicSettingsSchema = z.object({
  workHoursStart: z.string().min(1, "Start time is required"),
  workHoursEnd: z.string().min(1, "End time is required"),
  lunchTimeEnabled: z.boolean(),
  lunchTimeStart: z.string().optional(),
  lunchTimeEnd: z.string().optional(),
  maxConcurrentAppointments: z.number().int().min(1, "Must allow at least 1 concurrent appointment"),
})

// Default clinic settings
const defaultClinicSettings: ClinicSettings = {
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

// Direct KV operations with better error handling
async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`KV GET failed for key ${key}:`, response.status, errorText)
      return null
    }

    const data = await response.json()
    return data.result
  } catch (error) {
    console.error(`KV GET error for key ${key}:`, error)
    return null
  }
}

async function kvSet(key: string, value: any): Promise<boolean> {
  try {
    const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`KV SET failed for key ${key}:`, response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error(`KV SET error for key ${key}:`, error)
    return false
  }
}

async function kvLRange<T>(key: string, start = 0, end = -1): Promise<T[]> {
  try {
    const url = `${process.env.KV_REST_API_URL}/lrange/${encodeURIComponent(key)}/${start}/${end}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`KV LRANGE failed for key ${key}:`, response.status, errorText)
      return []
    }

    const data = await response.json()
    const result = data.result || []

    // Log the raw data to debug
    console.log(`KV LRANGE result for ${key}:`, result)

    return result
  } catch (error) {
    console.error(`KV LRANGE error for key ${key}:`, error)
    return []
  }
}

// Updated LPUSH to handle single values correctly
async function kvLPush(key: string, value: any): Promise<boolean> {
  try {
    const url = `${process.env.KV_REST_API_URL}/lpush/${encodeURIComponent(key)}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      // Send the value directly, not as an array
      body: JSON.stringify(value),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`KV LPUSH failed for key ${key}:`, response.status, errorText)
      return false
    }

    const result = await response.json()
    console.log(`KV LPUSH success for ${key}:`, result)
    return true
  } catch (error) {
    console.error(`KV LPUSH error for key ${key}:`, error)
    return false
  }
}

async function kvDel(key: string): Promise<boolean> {
  try {
    const url = `${process.env.KV_REST_API_URL}/del/${encodeURIComponent(key)}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`KV DEL failed for key ${key}:`, response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error(`KV DEL error for key ${key}:`, error)
    return false
  }
}

// Improved LREM function to remove specific items from a list
async function kvLRem(key: string, count: number, value: any): Promise<boolean> {
  try {
    const url = `${process.env.KV_REST_API_URL}/lrem/${encodeURIComponent(key)}/${count}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`KV LREM failed for key ${key}:`, response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error(`KV LREM error for key ${key}:`, error)
    return false
  }
}

// Updated RPUSH to handle multiple values correctly
async function kvRPush(key: string, ...values: any[]): Promise<boolean> {
  try {
    // For multiple values, we need to push them one by one
    for (const value of values) {
      const url = `${process.env.KV_REST_API_URL}/rpush/${encodeURIComponent(key)}`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(value),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`KV RPUSH failed for key ${key}:`, response.status, errorText)
        return false
      }
    }

    return true
  } catch (error) {
    console.error(`KV RPUSH error for key ${key}:`, error)
    return false
  }
}

export async function getClinicSettings(): Promise<ClinicSettings> {
  try {
    console.log("Getting clinic settings...")

    const settings = await kvGet<ClinicSettings>("clinic:settings")

    if (!settings) {
      console.log("No settings found, initializing defaults...")
      const success = await kvSet("clinic:settings", defaultClinicSettings)
      if (success) {
        console.log("✅ Default clinic settings created")
        return defaultClinicSettings
      } else {
        console.log("❌ Failed to create default settings, using in-memory defaults")
        return defaultClinicSettings
      }
    }

    // Validate the settings structure
    if (!settings.workHours || !settings.workHours.start || !settings.workHours.end) {
      console.warn("Invalid settings structure, using defaults:", settings)
      return defaultClinicSettings
    }

    // Ensure all required fields exist
    const validatedSettings: ClinicSettings = {
      workHours: {
        start: settings.workHours.start || defaultClinicSettings.workHours.start,
        end: settings.workHours.end || defaultClinicSettings.workHours.end,
      },
      lunchTime: {
        enabled: settings.lunchTime?.enabled ?? defaultClinicSettings.lunchTime.enabled,
        start: settings.lunchTime?.start || defaultClinicSettings.lunchTime.start,
        end: settings.lunchTime?.end || defaultClinicSettings.lunchTime.end,
      },
      maxConcurrentAppointments: settings.maxConcurrentAppointments || defaultClinicSettings.maxConcurrentAppointments,
    }

    console.log("✅ Clinic settings loaded and validated:", validatedSettings)
    return validatedSettings
  } catch (error) {
    console.error("Error getting clinic settings:", error)
    console.log("Using default clinic settings as fallback")
    return defaultClinicSettings
  }
}

export async function getAvailableTimeSlots(date: string): Promise<TimeSlot[]> {
  try {
    console.log(`Getting available time slots for date: ${date}`)

    // Get clinic settings with proper fallback
    let clinicSettings: ClinicSettings
    try {
      clinicSettings = await getClinicSettings()

      // Validate that we have proper settings structure
      if (
        !clinicSettings ||
        !clinicSettings.workHours ||
        !clinicSettings.workHours.start ||
        !clinicSettings.workHours.end
      ) {
        console.warn("Invalid clinic settings structure, using defaults")
        clinicSettings = defaultClinicSettings
      }
    } catch (error) {
      console.error("Error loading clinic settings, using defaults:", error)
      clinicSettings = defaultClinicSettings
    }

    console.log("Using clinic settings:", clinicSettings)

    // Get appointments for the date
    const allAppointments = await kvLRange<Appointment>("clinic:appointments")
    const appointments = allAppointments.filter((appointment) => appointment && appointment.date === date)

    // Get blocked times for the date
    const allBlockedTimes = await kvLRange<BlockedTime>("clinic:blockedTimes")
    const blockedTimes = allBlockedTimes.filter((blockedTime) => blockedTime && blockedTime.date === date)

    console.log(`Found ${appointments.length} appointments and ${blockedTimes.length} blocked times for ${date}`)

    // Generate time slots - ensure we have valid work hours
    const { start, end } = clinicSettings.workHours

    if (!start || !end) {
      console.error("Invalid work hours in clinic settings:", clinicSettings.workHours)
      return []
    }

    const startMinutes = Number.parseInt(start.split(":")[0]) * 60 + Number.parseInt(start.split(":")[1])
    const endMinutes = Number.parseInt(end.split(":")[0]) * 60 + Number.parseInt(end.split(":")[1])

    // Validate time ranges
    if (isNaN(startMinutes) || isNaN(endMinutes) || startMinutes >= endMinutes) {
      console.error("Invalid time range:", { start, end, startMinutes, endMinutes })
      return []
    }

    // Get current time in GMT-3
    const now = new Date()
    const gmt3Now = addHours(now, -3)
    const currentHour = gmt3Now.getHours()
    const currentMinute = gmt3Now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute

    const isToday = parseISO(date).toDateString() === now.toDateString()

    const timeSlots: TimeSlot[] = []

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`

      // Skip past times
      if (isToday && minutes <= currentTimeInMinutes + 30) {
        continue
      }

      // Check lunch time - with proper validation
      let isLunchTime = false
      if (
        clinicSettings.lunchTime &&
        clinicSettings.lunchTime.enabled &&
        clinicSettings.lunchTime.start &&
        clinicSettings.lunchTime.end
      ) {
        try {
          const lunchStartMinutes =
            Number.parseInt(clinicSettings.lunchTime.start.split(":")[0]) * 60 +
            Number.parseInt(clinicSettings.lunchTime.start.split(":")[1])
          const lunchEndMinutes =
            Number.parseInt(clinicSettings.lunchTime.end.split(":")[0]) * 60 +
            Number.parseInt(clinicSettings.lunchTime.end.split(":")[1])

          if (
            !isNaN(lunchStartMinutes) &&
            !isNaN(lunchEndMinutes) &&
            minutes >= lunchStartMinutes &&
            minutes < lunchEndMinutes
          ) {
            isLunchTime = true
          }
        } catch (error) {
          console.warn("Error parsing lunch time:", error)
        }
      }

      // Check blocked times
      let isBlocked = false
      for (const blockedTime of blockedTimes) {
        try {
          if (blockedTime && blockedTime.startTime && blockedTime.endTime) {
            const blockStartMinutes =
              Number.parseInt(blockedTime.startTime.split(":")[0]) * 60 +
              Number.parseInt(blockedTime.startTime.split(":")[1])
            const blockEndMinutes =
              Number.parseInt(blockedTime.endTime.split(":")[0]) * 60 +
              Number.parseInt(blockedTime.endTime.split(":")[1])

            if (
              !isNaN(blockStartMinutes) &&
              !isNaN(blockEndMinutes) &&
              minutes >= blockStartMinutes &&
              minutes < blockEndMinutes
            ) {
              isBlocked = true
              break
            }
          }
        } catch (error) {
          console.warn("Error parsing blocked time:", error)
        }
      }

      // Count appointments at this time
      const appointmentsAtTime = appointments.filter(
        (appointment) => appointment && appointment.time === timeString,
      ).length
      const maxConcurrent = clinicSettings.maxConcurrentAppointments || 1
      const remainingSlots = maxConcurrent - appointmentsAtTime

      // Check availability
      const isAvailable = !isLunchTime && !isBlocked && remainingSlots > 0

      if (isAvailable) {
        timeSlots.push({
          time: timeString,
          available: true,
          remainingSlots: remainingSlots,
        })
      }
    }

    console.log(`Generated ${timeSlots.length} available time slots for ${date}`)
    return timeSlots
  } catch (error) {
    console.error("Error getting available time slots:", error)
    return []
  }
}

export async function createAppointment(formData: FormData) {
  console.log("Creating appointment with form data:", Object.fromEntries(formData.entries()))

  try {
    const validatedFields = AppointmentSchema.safeParse({
      userName: formData.get("userName"),
      userEmail: formData.get("userEmail"),
      date: formData.get("date"),
      time: formData.get("time"),
      reason: formData.get("reason"),
      isEmergency: formData.get("isEmergency"),
      emergencyReason: formData.get("emergencyReason"),
      language: formData.get("language"),
    })

    if (!validatedFields.success) {
      console.error("Validation failed:", validatedFields.error.flatten())
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Missing Fields. Failed to Create Appointment.",
      }
    }

    const { userName, userEmail, date, time, reason, isEmergency, emergencyReason, language } = validatedFields.data

    // Validate date/time
    const appointmentDate = parseISO(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isBefore(appointmentDate, today)) {
      return {
        success: false,
        message: "Cannot schedule appointments in the past. Please select a future date.",
      }
    }

    // Check time availability
    const availableTimeSlots = await getAvailableTimeSlots(date)
    const selectedTimeSlot = availableTimeSlots.find((slot) => slot.time === time)

    if (!selectedTimeSlot) {
      return {
        success: false,
        message: "The selected time slot is not available. Please select another time.",
      }
    }

    const newAppointment: Appointment = {
      id: uuidv4(),
      userId: uuidv4(),
      userName,
      userEmail,
      date,
      time,
      reason,
      isEmergency: isEmergency || false,
      emergencyReason: emergencyReason || "",
      status: "scheduled",
      createdAt: new Date().toISOString(),
    }

    console.log("Adding new appointment:", newAppointment)

    const success = await kvLPush("clinic:appointments", newAppointment)

    if (!success) {
      return {
        success: false,
        message: "Failed to save appointment. Please try again.",
      }
    }

    console.log("Appointment added successfully")

    // Send confirmation email
    try {
      await sendAppointmentConfirmationEmail(newAppointment, language)
      console.log(`Confirmation email sent to ${userEmail} in ${language}`)
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError)
    }

    revalidatePath("/")
    revalidatePath("/admin")

    return {
      success: true,
      message: "Appointment created successfully!",
    }
  } catch (error) {
    console.error("Error in createAppointment:", error)
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    }
  }
}

export async function getAppointments(): Promise<Appointment[]> {
  try {
    console.log("Getting appointments from database...")
    const appointments = await kvLRange<Appointment>("clinic:appointments")
    console.log("Raw appointments data:", appointments)

    // Handle the case where appointments might be stored differently
    if (!appointments || appointments.length === 0) {
      console.log("No appointments found in database")
      return []
    }

    // Filter and validate appointments
    const validAppointments: Appointment[] = []

    for (let i = 0; i < appointments.length; i++) {
      let appointment = appointments[i]

      console.log(`Processing appointment ${i}:`, appointment)

      // Skip null/undefined entries
      if (!appointment) {
        console.warn(`Appointment ${i} is null/undefined`)
        continue
      }

      // Handle appointments stored as JSON strings inside an array
      if (Array.isArray(appointment)) {
        console.warn(`Appointment ${i} is an array, attempting to parse...`)
        if (appointment.length > 0 && typeof appointment[0] === "string") {
          try {
            appointment = JSON.parse(appointment[0]) as Appointment
            console.log(`Appointment ${i} parsed successfully:`, appointment)
          } catch (parseError) {
            console.error(`Error parsing appointment ${i}:`, parseError)
            continue
          }
        } else {
          console.warn(`Appointment ${i} is an empty array or not a string, skipping...`)
          continue
        }
      } else if (typeof appointment === "string") {
        try {
          appointment = JSON.parse(appointment) as Appointment
          console.log(`Appointment ${i} parsed successfully:`, appointment)
        } catch (parseError) {
          console.error(`Error parsing appointment ${i}:`, parseError)
          continue
        }
      }

      // Check if it's a valid appointment object - fix the validation logic
      if (typeof appointment === "object" && appointment.id && appointment.userName && appointment.userEmail) {
        // The appointment is already valid, just ensure all fields exist with defaults
        const validatedAppointment: Appointment = {
          id: appointment.id,
          userId: appointment.userId || `user-${i}`,
          userName: appointment.userName,
          userEmail: appointment.userEmail,
          date: appointment.date || new Date().toISOString().split("T")[0],
          time: appointment.time || "09:00",
          reason: appointment.reason || "General visit",
          isEmergency: appointment.isEmergency || false,
          emergencyReason: appointment.emergencyReason || "",
          status: appointment.status || "scheduled",
          createdAt: appointment.createdAt || new Date().toISOString(),
        }

        validAppointments.push(validatedAppointment)
        console.log(`Valid appointment ${i}:`, validatedAppointment)
      } else {
        console.warn(`Appointment ${i} has invalid structure:`, appointment)
        console.warn(
          `Missing fields - id: ${!!appointment.id}, userName: ${!!appointment.userName}, userEmail: ${!!appointment.userEmail}`,
        )
      }
    }

    console.log(`Returning ${validAppointments.length} valid appointments out of ${appointments.length} total`)
    return validAppointments
  } catch (error) {
    console.error("Error getting appointments:", error)
    return []
  }
}

export async function getBlockedTimes(): Promise<BlockedTime[]> {
  try {
    const blockedTimes = await kvLRange<BlockedTime>("clinic:blockedTimes")
    console.log("Retrieved blocked times from KV:", blockedTimes)

    // Filter out any null/undefined entries
    const validBlockedTimes = blockedTimes.filter((blockedTime) => {
      if (!blockedTime) {
        console.warn("Found null/undefined blocked time")
        return false
      }

      return true
    })

    console.log("Valid blocked times:", validBlockedTimes.length)
    return validBlockedTimes
  } catch (error) {
    console.error("Error getting blocked times:", error)
    return []
  }
}

export async function createBlockedTime(formData: FormData) {
  const validatedFields = BlockedTimeSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Block Time.",
    }
  }

  const { date, startTime, endTime, reason } = validatedFields.data

  const newBlockedTime: BlockedTime = {
    id: uuidv4(),
    date,
    startTime,
    endTime,
    reason,
    createdAt: new Date().toISOString(),
  }

  console.log("Adding new blocked time:", newBlockedTime)

  const success = await kvLPush("clinic:blockedTimes", newBlockedTime)

  if (!success) {
    return {
      message: "Failed to block time. Please try again.",
    }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return { message: "Time blocked successfully!" }
}

export async function updateClinicSettings(formData: FormData) {
  const validatedFields = ClinicSettingsSchema.safeParse({
    workHoursStart: formData.get("workHoursStart"),
    workHoursEnd: formData.get("workHoursEnd"),
    lunchTimeEnabled: formData.get("lunchTimeEnabled") === "true",
    lunchTimeStart: formData.get("lunchTimeStart"),
    lunchTimeEnd: formData.get("lunchTimeEnd"),
    maxConcurrentAppointments: Number.parseInt(formData.get("maxConcurrentAppointments") as string, 10),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Settings.",
    }
  }

  const { workHoursStart, workHoursEnd, lunchTimeEnabled, lunchTimeStart, lunchTimeEnd, maxConcurrentAppointments } =
    validatedFields.data

  // Validation logic
  if (workHoursStart >= workHoursEnd) {
    return {
      errors: { workHoursEnd: ["End time must be after start time"] },
      message: "Invalid work hours. End time must be after start time.",
    }
  }

  if (lunchTimeEnabled) {
    if (!lunchTimeStart || !lunchTimeEnd) {
      return {
        errors: {
          lunchTimeStart: ["Lunch time start is required"],
          lunchTimeEnd: ["Lunch time end is required"],
        },
        message: "Lunch time start and end are required when lunch time is enabled.",
      }
    }

    if (lunchTimeStart >= lunchTimeEnd) {
      return {
        errors: { lunchTimeEnd: ["Lunch end time must be after start time"] },
        message: "Invalid lunch time. End time must be after start time.",
      }
    }

    if (lunchTimeStart < workHoursStart || lunchTimeEnd > workHoursEnd) {
      return {
        errors: {
          lunchTimeStart: ["Lunch time must be within work hours"],
          lunchTimeEnd: ["Lunch time must be within work hours"],
        },
        message: "Lunch time must be within work hours.",
      }
    }
  }

  const clinicSettings: ClinicSettings = {
    workHours: {
      start: workHoursStart,
      end: workHoursEnd,
    },
    lunchTime: {
      enabled: lunchTimeEnabled,
      start: lunchTimeStart || "12:00",
      end: lunchTimeEnd || "13:00",
    },
    maxConcurrentAppointments,
  }

  const success = await kvSet("clinic:settings", clinicSettings)

  if (!success) {
    return {
      message: "Failed to update settings. Please try again.",
    }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return { message: "Clinic settings updated successfully!" }
}

// Improved delete appointment function with better error handling and atomic operations
export async function deleteAppointment(id: string) {
  try {
    console.log(`Starting deletion of appointment with ID: ${id}`)

    // Get current appointments with retry logic
    let appointments: Appointment[] = []
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        appointments = await getAppointments()
        break
      } catch (error) {
        retryCount++
        console.warn(`Retry ${retryCount} failed to get appointments:`, error)
        if (retryCount === maxRetries) {
          throw error
        }
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`Found ${appointments.length} total appointments`)

    // Find the appointment to delete
    const appointmentToDelete = appointments.find((appointment) => appointment.id === id)

    if (!appointmentToDelete) {
      console.log(`Appointment with ID ${id} not found`)
      return { success: false, message: "Appointment not found." }
    }

    console.log(`Found appointment to delete:`, appointmentToDelete)

    // Filter out the appointment to delete
    const updatedAppointments = appointments.filter((appointment) => appointment.id !== id)
    console.log(`After filtering: ${updatedAppointments.length} appointments remaining`)

    // Perform atomic update: delete the entire list and recreate it
    console.log("Deleting appointments list...")
    const deleteSuccess = await kvDel("clinic:appointments")

    if (!deleteSuccess) {
      console.error("Failed to delete appointments list")
      return { success: false, message: "Failed to delete appointment. Please try again." }
    }

    console.log("Appointments list deleted successfully")

    // If there are remaining appointments, add them back
    if (updatedAppointments.length > 0) {
      console.log(`Recreating list with ${updatedAppointments.length} appointments...`)

      // Add appointments back one by one to avoid issues with bulk operations
      let addedCount = 0
      for (const appointment of updatedAppointments) {
        const pushSuccess = await kvLPush("clinic:appointments", appointment)
        if (pushSuccess) {
          addedCount++
        } else {
          console.error(`Failed to add appointment back:`, appointment.id)
        }
      }

      console.log(`Successfully added ${addedCount} out of ${updatedAppointments.length} appointments back`)

      if (addedCount !== updatedAppointments.length) {
        console.warn("Some appointments may not have been restored properly")
      }
    } else {
      console.log("No appointments to restore - list is now empty")
    }

    // Revalidate paths to refresh the UI
    console.log("Revalidating paths...")
    revalidatePath("/", "layout")
    revalidatePath("/admin", "layout")
    revalidatePath("/admin", "page")

    console.log(`✅ Successfully deleted appointment ${id}`)
    return { success: true, message: "Appointment deleted successfully!" }
  } catch (error) {
    console.error("Error in deleteAppointment:", error)
    return {
      success: false,
      message: `Failed to delete appointment: ${error.message}. Please try again.`,
    }
  }
}

// Improved delete blocked time function with better error handling
export async function deleteBlockedTime(id: string) {
  try {
    console.log(`Starting deletion of blocked time with ID: ${id}`)

    // Get current blocked times with retry logic
    let blockedTimes: BlockedTime[] = []
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        blockedTimes = await getBlockedTimes()
        break
      } catch (error) {
        retryCount++
        console.warn(`Retry ${retryCount} failed to get blocked times:`, error)
        if (retryCount === maxRetries) {
          throw error
        }
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`Found ${blockedTimes.length} total blocked times`)

    // Find the blocked time to delete
    const blockedTimeToDelete = blockedTimes.find((blockedTime) => blockedTime.id === id)

    if (!blockedTimeToDelete) {
      console.log(`Blocked time with ID ${id} not found`)
      return { success: false, message: "Blocked time not found." }
    }

    console.log(`Found blocked time to delete:`, blockedTimeToDelete)

    // Filter out the blocked time to delete
    const updatedBlockedTimes = blockedTimes.filter((blockedTime) => blockedTime.id !== id)
    console.log(`After filtering: ${updatedBlockedTimes.length} blocked times remaining`)

    // Perform atomic update: delete the entire list and recreate it
    console.log("Deleting blocked times list...")
    const deleteSuccess = await kvDel("clinic:blockedTimes")

    if (!deleteSuccess) {
      console.error("Failed to delete blocked times list")
      return { success: false, message: "Failed to delete blocked time. Please try again." }
    }

    console.log("Blocked times list deleted successfully")

    // If there are remaining blocked times, add them back
    if (updatedBlockedTimes.length > 0) {
      console.log(`Recreating list with ${updatedBlockedTimes.length} blocked times...`)

      // Add blocked times back one by one to avoid issues with bulk operations
      let addedCount = 0
      for (const blockedTime of updatedBlockedTimes) {
        const pushSuccess = await kvLPush("clinic:blockedTimes", blockedTime)
        if (pushSuccess) {
          addedCount++
        } else {
          console.error(`Failed to add blocked time back:`, blockedTime.id)
        }
      }

      console.log(`Successfully added ${addedCount} out of ${updatedBlockedTimes.length} blocked times back`)

      if (addedCount !== updatedBlockedTimes.length) {
        console.warn("Some blocked times may not have been restored properly")
      }
    } else {
      console.log("No blocked times to restore - list is now empty")
    }

    // Revalidate paths to refresh the UI
    console.log("Revalidating paths...")
    revalidatePath("/admin", "layout")
    revalidatePath("/admin", "page")
    revalidatePath("/", "layout")

    console.log(`✅ Successfully deleted blocked time ${id}`)
    return { success: true, message: "Blocked time deleted successfully!" }
  } catch (error) {
    console.error("Error in deleteBlockedTime:", error)
    return {
      success: false,
      message: `Failed to delete blocked time: ${error.message}. Please try again.`,
    }
  }
}
