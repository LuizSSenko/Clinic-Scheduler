"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import type { ClinicSettings, Appointment, BlockedTime } from "./types"
import { kv } from "./kv"
import { parseISO, isBefore } from "date-fns"

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

// Update the createAppointment function to check if the appointment time is in the past
export async function createAppointment(formData: FormData) {
  console.log("Creating appointment with form data:", Object.fromEntries(formData.entries()))

  const validatedFields = AppointmentSchema.safeParse({
    userName: formData.get("userName"),
    userEmail: formData.get("userEmail"),
    date: formData.get("date"),
    time: formData.get("time"),
    reason: formData.get("reason"),
    isEmergency: formData.get("isEmergency"),
    emergencyReason: formData.get("emergencyReason"),
  })

  if (!validatedFields.success) {
    console.error("Validation failed:", validatedFields.error.flatten())
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Appointment.",
    }
  }

  const { userName, userEmail, date, time, reason, isEmergency, emergencyReason } = validatedFields.data
  console.log("Validated fields:", { userName, userEmail, date, time, reason, isEmergency, emergencyReason })

  // Check if the appointment date is in the past
  const appointmentDate = parseISO(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isBefore(appointmentDate, today)) {
    return {
      message: "Cannot schedule appointments in the past. Please select a future date.",
    }
  }

  // Check if the appointment time is in the past for today's date
  if (appointmentDate.toDateString() === today.toDateString()) {
    const now = new Date()
    const [hours, minutes] = time.split(":").map(Number)
    const appointmentDateTime = new Date(appointmentDate)
    appointmentDateTime.setHours(hours, minutes, 0, 0)

    if (isBefore(appointmentDateTime, now)) {
      return {
        message: "Cannot schedule appointments in the past. Please select a future time.",
      }
    }
  }

  // Get clinic settings
  const clinicSettings = await getClinicSettings()

  // Check if the time is outside clinic hours
  if (time < clinicSettings.workHours.start || time >= clinicSettings.workHours.end) {
    console.log("Time outside clinic hours:", time)
    return {
      message: "This time is outside clinic hours. Please select a time during clinic hours.",
    }
  }

  // Check if the time is during lunch time
  if (
    clinicSettings.lunchTime.enabled &&
    time >= clinicSettings.lunchTime.start &&
    time < clinicSettings.lunchTime.end
  ) {
    console.log("Time during lunch break:", time)
    return {
      message: "This time is during the clinic's lunch break. Please select another time.",
    }
  }

  // Get blocked times
  const blockedTimes = await getBlockedTimes()

  // Check if the time is blocked
  const isTimeBlocked = blockedTimes.some((blockedTime) => {
    return blockedTime.date === date && blockedTime.startTime <= time && blockedTime.endTime > time
  })

  if (isTimeBlocked) {
    console.log("Time is blocked:", time)
    return {
      message: "This time slot is not available. Please select another time.",
    }
  }

  // Get appointments
  const appointments = await getAppointments()

  // Check if there are too many appointments at this time
  const appointmentsAtTime = appointments.filter(
    (appointment) => appointment.date === date && appointment.time === time,
  ).length

  if (appointmentsAtTime >= clinicSettings.maxConcurrentAppointments) {
    console.log("Time slot fully booked:", time)
    return {
      message: "This time slot is fully booked. Please select another time.",
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

  revalidatePath("/")
  revalidatePath("/admin") // Also revalidate the admin path

  return { message: "Appointment created successfully!" }
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
    // Get all appointments
    const appointments = await getAppointments()

    // Filter out the appointment to delete
    const updatedAppointments = appointments.filter((appointment) => appointment.id !== id)

    // Clear the appointments list
    await kv.del("clinic:appointments")

    // Add the updated appointments back
    if (updatedAppointments.length > 0) {
      await kv.rpush("clinic:appointments", ...updatedAppointments)
    }

    revalidatePath("/admin")
    return { message: "Appointment deleted successfully!" }
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return { message: "Failed to delete appointment." }
  }
}

export async function deleteBlockedTime(id: string) {
  try {
    // Get all blocked times
    const blockedTimes = await getBlockedTimes()

    // Filter out the blocked time to delete
    const updatedBlockedTimes = blockedTimes.filter((blockedTime) => blockedTime.id !== id)

    // Clear the blocked times list
    await kv.del("clinic:blockedTimes")

    // Add the updated blocked times back
    if (updatedBlockedTimes.length > 0) {
      await kv.rpush("clinic:blockedTimes", ...updatedBlockedTimes)
    }

    revalidatePath("/admin")
    return { message: "Blocked time deleted successfully!" }
  } catch (error) {
    console.error("Error deleting blocked time:", error)
    return { message: "Failed to delete blocked time." }
  }
}
