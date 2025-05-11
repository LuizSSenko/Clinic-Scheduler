"use client"

import { useState, useEffect } from "react"
import { CustomGridCalendar } from "./custom-grid-calendar"
import type { Appointment } from "@/lib/types"

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onDateSelect: (date: Date | undefined) => void
  selectedDate: Date | undefined
}

export function AppointmentCalendar({ appointments, onDateSelect, selectedDate }: AppointmentCalendarProps) {
  // Create a map of dates with appointments
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const dateMap: Record<string, number> = {}

    appointments.forEach((appointment) => {
      try {
        // Ensure we have a valid date string
        if (!appointment.date) return

        // Format the date to YYYY-MM-DD for consistent mapping
        const dateStr = appointment.date
        if (dateMap[dateStr]) {
          dateMap[dateStr]++
        } else {
          dateMap[dateStr] = 1
        }
      } catch (error) {
        console.error("Error processing appointment date:", error)
      }
    })

    setAppointmentCounts(dateMap)
  }, [appointments])

  return (
    <CustomGridCalendar appointmentCounts={appointmentCounts} onDateSelect={onDateSelect} selectedDate={selectedDate} />
  )
}
