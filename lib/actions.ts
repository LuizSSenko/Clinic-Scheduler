"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import type { ClinicSettings, Appointment, BlockedTime, TimeSlot } from "./types"
import { kv } from "./kv"
import { parseISO, isBefore, addHours } from "date-fns"

// Import the email service at the top of the file
import { sendAppointmentConfirmationEmail } from "./email-service"

// Schema for appointment creation with updated validation
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

// Schema for blocked time creation
const BlockedTimeSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  reason: z.string().min(1, "Reason is required"),
})

// Schema for clinic settings
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

// Helper function to initialize clinic settings if they don't exist
async function initializeClinicSettings() {
  const settings = await kv.get<ClinicSettings>("clinic:settings")
  if (!settings) {
    await kv.set("clinic:settings", defaultClinicSettings)
    return defaultClinicSettings
  }
  return settings
}

/**
 * Get available time slots for a specific date
 * This function checks:
 * 1. Clinic working hours
 * 2. Lunch break
 * 3. Blocked time periods
 * 4. Maximum concurrent appointments
 * 5. Past times (using GMT-3)
 */
export async function getAvailableTimeSlots(date: string): Promise<TimeSlot[]> {
  try {
    // Get clinic settings
    const clinicSettings = await getClinicSettings()

    // Get all appointments for the date
    const appointments = await getAppointments()
    const appointmentsForDate = appointments.filter((appointment) => appointment.date === date)

    // Get all blocked times for the date
    const blockedTimes = await getBlockedTimes()
    const blockedTimesForDate = blockedTimes.filter((blockedTime) => blockedTime.date === date)

    // Generate time slots based on clinic hours (30-minute intervals)
    const { start, end } = clinicSettings.workHours

    // Convert time strings to minutes for easier calculation
    const startMinutes = Number.parseInt(start.split(":")[0]) * 60 + Number.parseInt(start.split(":")[1])
    const endMinutes = Number.parseInt(end.split(":")[0]) * 60 + Number.parseInt(end.split(":")[1])

    // Get current time in GMT-3
    const now = new Date()
    const gmt3Now = addHours(now, -3) // GMT-3 adjustment

    // Check if the date is today
    const isToday = parseISO(date).toDateString() === now.toDateString()

    // Generate all possible time slots
    const timeSlots: TimeSlot[] = []

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`

      // Create a date object for this time slot to compare with current time
      const timeSlotDate = parseISO(date)
      timeSlotDate.setHours(hour, minute, 0, 0)

      // Skip if time is in the past (for today only)
      if (isToday && isBefore(timeSlotDate, gmt3Now)) {
        continue
      }

      // Check if time is during lunch break
      let isLunchTime = false
      if (clinicSettings.lunchTime.enabled) {
        const lunchStartMinutes =
          Number.parseInt(clinicSettings.lunchTime.start.split(":")[0]) * 60 +
          Number.parseInt(clinicSettings.lunchTime.start.split(":")[1])
        const lunchEndMinutes =
          Number.parseInt(clinicSettings.lunchTime.end.split(":")[0]) * 60 +
          Number.parseInt(clinicSettings.lunchTime.end.split(":")[1])

        if (minutes >= lunchStartMinutes && minutes < lunchEndMinutes) {
          isLunchTime = true
        }
      }

      // Check if time is in a blocked period
      let isBlocked = false
      let blockReason = ""

      for (const blockedTime of blockedTimesForDate) {
        if (timeString >= blockedTime.startTime && timeString < blockedTime.endTime) {
          isBlocked = true
          blockReason = blockedTime.reason
          break
        }
      }

      // Count existing appointments at this time
      const appointmentsAtTime = appointmentsForDate.filter((appointment) => appointment.time === timeString).length

      // Calculate remaining slots
      const remainingSlots = clinicSettings.maxConcurrentAppointments - appointmentsAtTime

      // Determine if the slot is available
      const isAvailable = !isLunchTime && !isBlocked && remainingSlots > 0

      // Only add available slots or slots that are unavailable due to being fully booked
      // (don't add lunch time or blocked slots)
      if (isAvailable || (!isLunchTime && !isBlocked && remainingSlots <= 0)) {
        timeSlots.push({
          time: timeString,
          available: isAvailable,
          remainingSlots: isAvailable ? remainingSlots : 0,
          reason: isBlocked ? blockReason : undefined,
        })
      }
    }

    return timeSlots
  } catch (error) {
    console.error("Error getting available time slots:", error)
    return []
  }
}

// Update the createAppointment function to check if the appointment time is in the past
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
    console.log("Validated fields:", {
      userName,
      userEmail,
      date,
      time,
      reason,
      isEmergency,
      emergencyReason,
      language,
    })

    // Check if the appointment date is in the past
    const appointmentDate = parseISO(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isBefore(appointmentDate, today)) {
      return {
        success: false,
        message: "Cannot schedule appointments in the past. Please select a future date.",
      }
    }

    // Check if the appointment time is in the past for today's date (using GMT-3)
    if (appointmentDate.toDateString() === today.toDateString()) {
      const now = new Date()
      const gmt3Now = addHours(now, -3) // GMT-3 adjustment

      const [hours, minutes] = time.split(":").map(Number)
      const appointmentDateTime = new Date(appointmentDate)
      appointmentDateTime.setHours(hours, minutes, 0, 0)

      if (isBefore(appointmentDateTime, gmt3Now)) {
        return {
          success: false,
          message: "Cannot schedule appointments in the past. Please select a future time.",
        }
      }
    }

    // Get available time slots to verify if the selected time is still available
    const availableTimeSlots = await getAvailableTimeSlots(date)
    const selectedTimeSlot = availableTimeSlots.find((slot) => slot.time === time)

    if (!selectedTimeSlot) {
      return {
        success: false,
        message: "The selected time slot is not available. Please select another time.",
      }
    }

    if (!selectedTimeSlot.available) {
      return {
        success: false,
        message: "This time slot is no longer available. Please select another time.",
      }
    }

    const newAppointment: Appointment = {
      id: uuidv4(),
      userId: uuidv4(), // In a real app, this would be the authenticated user's ID
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

    // Add the new appointment to KV
    await kv.lpush("clinic:appointments", newAppointment)
    console.log("Appointment added to KV")

    // Send confirmation email to the user using the UI language preference
    try {
      await sendAppointmentConfirmationEmail(newAppointment, language)
      console.log(`Confirmation email sent to ${userEmail} in ${language}`)
    } catch (emailError) {
      // Don't fail the appointment creation if email sending fails
      console.error("Failed to send confirmation email:", emailError)
    }

    revalidatePath("/")
    revalidatePath("/admin") // Also revalidate the admin path

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

  // Add the new blocked time to KV
  await kv.lpush("clinic:blockedTimes", newBlockedTime)

  revalidatePath("/admin")
  revalidatePath("/") // Also revalidate the home page to update available time slots
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

  // Validate that work hours end time is after start time
  if (workHoursStart >= workHoursEnd) {
    return {
      errors: {
        workHoursEnd: ["End time must be after start time"],
      },
      message: "Invalid work hours. End time must be after start time.",
    }
  }

  // Validate lunch time if enabled
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
        errors: {
          lunchTimeEnd: ["Lunch end time must be after start time"],
        },
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

  // Update clinic settings in KV
  await kv.set("clinic:settings", clinicSettings)

  revalidatePath("/admin")
  revalidatePath("/") // Also revalidate the home page to update available time slots
  return { message: "Clinic settings updated successfully!" }
}

export async function getAppointments(): Promise<Appointment[]> {
  try {
    // Get appointments from KV
    const appointments = (await kv.lrange<Appointment>("clinic:appointments", 0, -1)) || []
    console.log("Retrieved appointments from KV:", appointments)
    return appointments
  } catch (error) {
    console.error("Error getting appointments:", error)
    return []
  }
}

export async function getBlockedTimes(): Promise<BlockedTime[]> {
  try {
    // Get blocked times from KV
    const blockedTimes = (await kv.lrange<BlockedTime>("clinic:blockedTimes", 0, -1)) || []
    return blockedTimes
  } catch (error) {
    console.error("Error getting blocked times:", error)
    return []
  }
}

export async function getClinicSettings(): Promise<ClinicSettings> {
  try {
    // Get clinic settings from KV or initialize with defaults
    return await initializeClinicSettings()
  } catch (error) {
    console.error("Error getting clinic settings:", error)
    return defaultClinicSettings
  }
}

export async function deleteAppointment(id: string) {
  try {
    console.log(`Attempting to delete appointment with ID: ${id}`)

    // Get all appointments
    const appointments = await getAppointments()
    console.log(`Retrieved ${appointments.length} appointments`)

    // Find the appointment to delete
    const appointmentToDelete = appointments.find((appointment) => appointment.id === id)
    if (!appointmentToDelete) {
      console.error(`Appointment with ID ${id} not found`)
      return { success: false, message: "Appointment not found." }
    }

    console.log(`Found appointment to delete:`, appointmentToDelete)

    // Filter out the appointment to delete
    const updatedAppointments = appointments.filter((appointment) => appointment.id !== id)
    console.log(`Filtered appointments: ${updatedAppointments.length} remaining`)

    // Clear the appointments list
    await kv.del("clinic:appointments")
    console.log(`Deleted appointments list from KV`)

    // Add the updated appointments back if there are any
    if (updatedAppointments.length > 0) {
      await kv.rpush("clinic:appointments", ...updatedAppointments)
      console.log(`Added ${updatedAppointments.length} appointments back to KV`)
    } else {
      console.log(`No appointments to add back to KV`)
    }

    // Revalidate paths to update UI
    revalidatePath("/")
    revalidatePath("/admin")

    console.log(`Successfully deleted appointment with ID: ${id}`)
    return { success: true, message: "Appointment deleted successfully!" }
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return { success: false, message: "Failed to delete appointment. Please try again." }
  }
}

export async function deleteBlockedTime(id: string) {
  try {
    console.log(`Attempting to delete blocked time with ID: ${id}`)

    // Get all blocked times
    const blockedTimes = await getBlockedTimes()
    console.log(`Retrieved ${blockedTimes.length} blocked times`)

    // Find the blocked time to delete
    const blockedTimeToDelete = blockedTimes.find((blockedTime) => blockedTime.id === id)
    if (!blockedTimeToDelete) {
      console.error(`Blocked time with ID ${id} not found`)
      return { success: false, message: "Blocked time not found." }
    }

    console.log(`Found blocked time to delete:`, blockedTimeToDelete)

    // Filter out the blocked time to delete
    const updatedBlockedTimes = blockedTimes.filter((blockedTime) => blockedTime.id !== id)
    console.log(`Filtered blocked times: ${updatedBlockedTimes.length} remaining`)

    // Clear the blocked times list
    await kv.del("clinic:blockedTimes")
    console.log(`Deleted blocked times list from KV`)

    // Add the updated blocked times back if there are any
    if (updatedBlockedTimes.length > 0) {
      await kv.rpush("clinic:blockedTimes", ...updatedBlockedTimes)
      console.log(`Added ${updatedBlockedTimes.length} blocked times back to KV`)
    } else {
      console.log(`No blocked times to add back to KV`)
    }

    // Revalidate paths to update UI
    revalidatePath("/admin")
    revalidatePath("/") // Also revalidate the home page to update available time slots

    console.log(`Successfully deleted blocked time with ID: ${id}`)
    return { success: true, message: "Blocked time deleted successfully!" }
  } catch (error) {
    console.error("Error deleting blocked time:", error)
    return { success: false, message: "Failed to delete blocked time. Please try again." }
  }
}
