export type Appointment = {
  id: string
  userId: string
  userName: string
  userEmail: string
  date: string
  time: string
  reason: string
  isEmergency?: boolean
  emergencyReason?: string
  status: "scheduled" | "cancelled" | "completed"
  createdAt: string
}

export type BlockedTime = {
  id: string
  date: string
  startTime: string
  endTime: string
  reason: string
  createdAt: string
}

export type ClinicSettings = {
  workHours: {
    start: string
    end: string
  }
  lunchTime: {
    enabled: boolean
    start: string
    end: string
  }
  maxConcurrentAppointments: number
}
